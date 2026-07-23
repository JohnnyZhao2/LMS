"""按角色模板迁移最终授权，并应用现有用户差异。"""

from collections import defaultdict

from django.db import migrations, transaction


LEGACY_ROLE_PERMISSIONS = {
    'ADMIN': {
        'user.avatar.update', 'tag.view', 'tag.create', 'tag.update', 'tag.delete',
        'knowledge.view', 'knowledge.create', 'knowledge.update', 'knowledge.delete',
        'question.view', 'question.create', 'question.update', 'question.delete',
        'quiz.view', 'quiz.create', 'quiz.update', 'quiz.delete',
        'task.view', 'task.create', 'task.update', 'task.delete', 'task.assign',
    },
    'DEPT_MANAGER': {
        'tag.view', 'tag.create', 'tag.update', 'tag.delete',
        'knowledge.view', 'knowledge.create', 'knowledge.update', 'knowledge.delete',
        'question.view', 'question.create', 'question.update', 'question.delete',
        'quiz.view', 'quiz.create', 'quiz.update', 'quiz.delete',
        'task.view', 'task.create', 'task.update', 'task.delete', 'task.assign',
        'task.analytics.view', 'grading.view', 'grading.score',
        'spot_check.view', 'spot_check.create', 'spot_check.update', 'spot_check.delete',
    },
    'MENTOR': {
        'tag.view', 'tag.create',
        'question.view', 'question.create', 'question.update', 'question.delete',
        'quiz.view', 'quiz.create', 'quiz.update', 'quiz.delete',
        'task.view', 'task.create', 'task.update', 'task.delete', 'task.assign',
        'task.analytics.view', 'grading.view', 'grading.score',
        'spot_check.view', 'spot_check.create', 'spot_check.update', 'spot_check.delete',
    },
    'STUDENT': {'knowledge.view', 'task.view', 'spot_check.view', 'spot_check.submit'},
    'TEAM_MANAGER': {'knowledge.view'},
}

LEGACY_ROLE_SCOPES = {
    'ADMIN': {
        'user_scope': 'ALL',
        'question_resource_scope': 'ALL',
        'quiz_resource_scope': 'ALL',
        'task_resource_scope': 'ALL',
        'task_assignment_scope': 'ALL',
    },
    'DEPT_MANAGER': {
        'user_scope': 'DEPARTMENT',
        'question_resource_scope': 'OWN',
        'quiz_resource_scope': 'OWN',
        'task_resource_scope': 'OWN',
        'task_assignment_scope': 'DEPARTMENT',
        'spot_check_student_scope': 'DEPARTMENT',
    },
    'MENTOR': {
        'user_scope': 'MENTEES',
        'question_resource_scope': 'OWN',
        'quiz_resource_scope': 'OWN',
        'task_resource_scope': 'OWN',
        'task_assignment_scope': 'MENTEES',
        'spot_check_student_scope': 'MENTEES',
    },
    'STUDENT': {
        'task_resource_scope': 'OWN',
        'spot_check_student_scope': 'SELF',
    },
    'TEAM_MANAGER': {},
}

MANAGED_ROLE_CODES = {'ADMIN', 'DEPT_MANAGER', 'MENTOR', 'TEAM_MANAGER'}


def _expand_permissions(codes, implication_map):
    result = set(codes)
    pending = list(result)
    while pending:
        for dependency in implication_map.get(pending.pop(), ()):
            if dependency not in result:
                result.add(dependency)
                pending.append(dependency)
    return result


def _prune_permissions(codes, implication_map):
    result = set(codes)
    while True:
        invalid = {
            code for code in result
            if set(implication_map.get(code, ())) - result
        }
        if not invalid:
            return result
        result -= invalid


def _apply_fixed_permissions(codes, role_code, catalog_by_code):
    result = set(codes)
    for code, item in catalog_by_code.items():
        if item.get('is_configurable', True):
            continue
        if role_code in set(item.get('required_role_codes') or ()):
            result.add(code)
        else:
            result.discard(code)
    return result


def _apply_permission_overrides(base_codes, rows, implication_map):
    effects = defaultdict(set)
    for row in rows:
        effects[row['permission__code']].add(row['effect'])

    result = set(base_codes)
    denied = {code for code, values in effects.items() if 'DENY' in values}
    allowed = {
        code for code, values in effects.items()
        if 'ALLOW' in values and code not in denied
    }
    result = _expand_permissions((result - denied) | allowed, implication_map)
    return _prune_permissions(result - denied, implication_map)


def _resolve_target_ids(
    scope_type,
    explicit_ids,
    *,
    user_id,
    target_user_ids,
    active_users_by_id,
):
    if scope_type == 'ALL':
        return set(target_user_ids)
    if scope_type in {'OWN', 'SELF'}:
        return {user_id} & set(target_user_ids)
    if scope_type == 'MENTEES':
        return {
            target_id for target_id in target_user_ids
            if active_users_by_id[target_id]['mentor_id'] == user_id
        }
    if scope_type == 'DEPARTMENT':
        department_id = active_users_by_id.get(user_id, {}).get('department_id')
        if not department_id:
            return set()
        return {
            target_id for target_id in target_user_ids
            if target_id != user_id
            and active_users_by_id[target_id]['department_id'] == department_id
        }
    if scope_type == 'EXPLICIT_USERS':
        return {int(target_id) for target_id in explicit_ids} & set(target_user_ids)
    raise RuntimeError(f'旧范围类型非法: {scope_type}')


def _resolve_scope(
    base_type,
    rows,
    allowed_types,
    *,
    user_id,
    group_key,
    scope_kind,
    target_user_ids,
    active_users_by_id,
):
    broad_allow = {
        row['scope_type'] for row in rows
        if row['effect'] == 'ALLOW' and row['scope_type'] != 'EXPLICIT_USERS'
    }
    broad_deny = {
        row['scope_type'] for row in rows
        if row['effect'] == 'DENY' and row['scope_type'] != 'EXPLICIT_USERS'
    }
    explicit_allow = set().union(*(
        set(row['scope_user_ids'] or ())
        for row in rows
        if row['effect'] == 'ALLOW' and row['scope_type'] == 'EXPLICIT_USERS'
    ))
    explicit_deny = set().union(*(
        set(row['scope_user_ids'] or ())
        for row in rows
        if row['effect'] == 'DENY' and row['scope_type'] == 'EXPLICIT_USERS'
    ))

    if scope_kind == 'TARGET':
        def resolve(scope_type, explicit_ids=()):
            return _resolve_target_ids(
                scope_type,
                explicit_ids,
                user_id=user_id,
                target_user_ids=target_user_ids,
                active_users_by_id=active_users_by_id,
            )

        default_ids = resolve(base_type) if base_type else set()
        deny_ids = set().union(*(resolve(scope) for scope in broad_deny))
        deny_ids |= resolve('EXPLICIT_USERS', explicit_deny)
        allow_ids = set().union(*(resolve(scope) for scope in broad_allow))
        allow_ids |= resolve('EXPLICIT_USERS', explicit_allow)
        final_ids = (default_ids - deny_ids) | allow_ids
        if not final_ids:
            return None, set()

        preferred_types = ([base_type] if base_type else []) + list(allowed_types)
        for scope_type in dict.fromkeys(preferred_types):
            if scope_type != 'EXPLICIT_USERS' and resolve(scope_type) == final_ids:
                return scope_type, set()
        if 'EXPLICIT_USERS' in allowed_types:
            return 'EXPLICIT_USERS', final_ids
        raise RuntimeError(
            f'用户范围无法转换: user_id={user_id} '
            f'group={group_key} members={sorted(final_ids)}'
        )

    broad = (({base_type} if base_type else set()) - broad_deny) | broad_allow
    members = {int(user_id) for user_id in explicit_allow - explicit_deny}

    if 'ALL' in broad:
        broad = {'ALL'}
    if len(broad) > 1 or (broad and members) or (explicit_deny and broad):
        raise RuntimeError(
            f'用户范围不是单一最终状态: user_id={user_id} '
            f'group={group_key} scopes={sorted(broad)} members={sorted(members)}'
        )

    scope_type = next(iter(broad), 'EXPLICIT_USERS' if members else None)
    if scope_type and scope_type not in set(allowed_types):
        raise RuntimeError(
            f'用户范围类型非法: user_id={user_id} '
            f'group={group_key} scope_type={scope_type}'
        )
    return scope_type, members


def _drop_permissions_without_scope(codes, scopes, scope_catalog, implication_map):
    result = set(codes)
    for group_key, group in scope_catalog.items():
        if group_key not in scopes:
            result -= set(group['permission_codes'])
    return _prune_permissions(result, implication_map)


def materialize_final_authorization(apps, schema_editor):
    from apps.authorization.constants import (
        PERMISSION_CATALOG,
        PERMISSION_IMPLIES_MAP,
        SCOPE_GROUP_CATALOG,
    )

    Permission = apps.get_model('authorization', 'Permission')
    RolePermission = apps.get_model('authorization', 'RolePermission')
    RoleScope = apps.get_model('authorization', 'RoleScope')
    UserPermissionOverride = apps.get_model('authorization', 'UserPermissionOverride')
    UserRolePermission = apps.get_model('authorization', 'UserRolePermission')
    UserRoleScope = apps.get_model('authorization', 'UserRoleScope')
    UserRoleScopeMember = apps.get_model('authorization', 'UserRoleScopeMember')
    UserScopeGroupOverride = apps.get_model('authorization', 'UserScopeGroupOverride')
    Role = apps.get_model('users', 'Role')
    User = apps.get_model('users', 'User')
    UserRole = apps.get_model('users', 'UserRole')

    catalog_by_code = {item['code']: item for item in PERMISSION_CATALOG}
    registered_codes = set(catalog_by_code)
    roles_by_code = {role.code: role for role in Role.objects.all()}
    active_users_by_id = {
        row['id']: row
        for row in User.objects.filter(
            is_active=True,
            is_superuser=False,
        ).values('id', 'department_id', 'mentor_id')
    }
    student_user_ids = set(
        UserRole.objects.filter(
            user_id__in=active_users_by_id,
            role__code='STUDENT',
        ).values_list('user_id', flat=True)
    )
    target_user_ids_by_group = {
        'user_scope': student_user_ids,
        'task_assignment_scope': student_user_ids,
        'spot_check_student_scope': student_user_ids,
    }

    role_override_rows = list(
        RolePermission.objects.values('role__code', 'permission__code', 'effect')
    )
    user_permission_rows = list(
        UserPermissionOverride.objects.values(
            'user_id', 'permission__code', 'effect', 'applies_to_role',
        )
    )
    user_scope_rows = list(
        UserScopeGroupOverride.objects.values(
            'user_id', 'scope_group_key', 'effect', 'applies_to_role',
            'scope_type', 'scope_user_ids',
        )
    )

    role_permissions = {}
    role_scopes = {}
    for role_code in roles_by_code:
        codes = set(LEGACY_ROLE_PERMISSIONS.get(role_code, ()))
        codes = _apply_permission_overrides(
            codes,
            [row for row in role_override_rows if row['role__code'] == role_code],
            PERMISSION_IMPLIES_MAP,
        )
        codes &= registered_codes
        codes = _apply_fixed_permissions(codes, role_code, catalog_by_code)

        scopes = {
            group_key: scope_type
            for group_key, scope_type in LEGACY_ROLE_SCOPES.get(role_code, {}).items()
            if (
                group_key in SCOPE_GROUP_CATALOG
                and codes & set(SCOPE_GROUP_CATALOG[group_key]['permission_codes'])
            )
        }
        codes = _drop_permissions_without_scope(
            codes, scopes, SCOPE_GROUP_CATALOG, PERMISSION_IMPLIES_MAP,
        )
        required_groups = {
            group_key for group_key, group in SCOPE_GROUP_CATALOG.items()
            if codes & set(group['permission_codes'])
        }
        role_permissions[role_code] = codes
        role_scopes[role_code] = {
            group_key: scope_type
            for group_key, scope_type in scopes.items()
            if group_key in required_groups
        }

    user_permissions = {}
    user_scopes = {}
    user_scope_members = {}
    managed_user_roles = list(
        UserRole.objects.select_related('role').filter(
            role__code__in=MANAGED_ROLE_CODES,
        )
    )
    duplicate_roles = defaultdict(list)
    for user_role in managed_user_roles:
        duplicate_roles[user_role.user_id].append(user_role.role.code)
    duplicate_roles = {
        user_id: codes for user_id, codes in duplicate_roles.items()
        if len(codes) > 1
    }
    if duplicate_roles:
        raise RuntimeError(f'存在多个管理角色，无法迁移: {duplicate_roles}')

    for user_role in managed_user_roles:
        user_id = user_role.user_id
        role_code = user_role.role.code
        permission_rows = [
            row for row in user_permission_rows
            if row['user_id'] == user_id
            and (row['applies_to_role'] or '') in {'', role_code}
            and row['permission__code'] in registered_codes
        ]
        codes = _apply_permission_overrides(
            role_permissions[role_code],
            permission_rows,
            PERMISSION_IMPLIES_MAP,
        )
        codes = _apply_fixed_permissions(codes, role_code, catalog_by_code)

        scopes = {}
        members = {}
        for group_key, group in SCOPE_GROUP_CATALOG.items():
            if not (codes & set(group['permission_codes'])):
                continue
            matching_rows = [
                row for row in user_scope_rows
                if row['user_id'] == user_id
                and row['scope_group_key'] == group_key
                and (row['applies_to_role'] or '') in {'', role_code}
            ]
            scope_type, member_ids = _resolve_scope(
                role_scopes[role_code].get(group_key),
                matching_rows,
                group['allowed_scope_types'],
                user_id=user_id,
                group_key=group_key,
                scope_kind=group['scope_kind'],
                target_user_ids=target_user_ids_by_group.get(group_key, set()),
                active_users_by_id=active_users_by_id,
            )
            if scope_type:
                scopes[group_key] = scope_type
                members[group_key] = member_ids

        codes = _drop_permissions_without_scope(
            codes, scopes, SCOPE_GROUP_CATALOG, PERMISSION_IMPLIES_MAP,
        )
        required_groups = {
            group_key for group_key, group in SCOPE_GROUP_CATALOG.items()
            if codes & set(group['permission_codes'])
        }
        user_permissions[user_role.id] = codes
        user_scopes[user_role.id] = {
            group_key: scope_type for group_key, scope_type in scopes.items()
            if group_key in required_groups
        }
        user_scope_members[user_role.id] = members

    active_user_ids = set(active_users_by_id)
    referenced_member_ids = {
        member_id
        for groups in user_scope_members.values()
        for member_ids in groups.values()
        for member_id in member_ids
    }
    invalid_member_ids = referenced_member_ids - active_user_ids
    if invalid_member_ids:
        raise RuntimeError(f'指定人员不存在或已停用: {sorted(invalid_member_ids)}')

    with transaction.atomic():
        for item in PERMISSION_CATALOG:
            Permission.objects.update_or_create(
                code=item['code'],
                defaults={
                    'name': item['name'],
                    'module': item['module'],
                    'description': item['description'],
                    'is_active': True,
                    'is_configurable': bool(item.get('is_configurable', True)),
                },
            )
        Permission.objects.exclude(code__in=registered_codes).update(is_active=False)
        permission_by_code = {
            row.code: row
            for row in Permission.objects.filter(code__in=registered_codes)
        }

        RolePermission.objects.all().delete()
        RolePermission.objects.bulk_create([
            RolePermission(
                role=roles_by_code[role_code],
                permission=permission_by_code[code],
                effect='ALLOW',
            )
            for role_code, codes in role_permissions.items()
            for code in sorted(codes)
        ], batch_size=500)
        RoleScope.objects.bulk_create([
            RoleScope(
                role=roles_by_code[role_code],
                scope_group_key=group_key,
                scope_type=scope_type,
            )
            for role_code, scopes in role_scopes.items()
            for group_key, scope_type in scopes.items()
        ], batch_size=500)
        UserRolePermission.objects.bulk_create([
            UserRolePermission(
                user_role_id=user_role_id,
                permission=permission_by_code[code],
            )
            for user_role_id, codes in user_permissions.items()
            for code in sorted(codes)
        ], batch_size=500)
        for user_role_id, scopes in user_scopes.items():
            for group_key, scope_type in scopes.items():
                scope = UserRoleScope.objects.create(
                    user_role_id=user_role_id,
                    scope_group_key=group_key,
                    scope_type=scope_type,
                )
                UserRoleScopeMember.objects.bulk_create([
                    UserRoleScopeMember(
                        user_role_scope=scope,
                        target_user_id=target_user_id,
                    )
                    for target_user_id in sorted(
                        user_scope_members[user_role_id].get(group_key, ())
                    )
                ], batch_size=500)


class Migration(migrations.Migration):

    dependencies = [
        ('authorization', '0030_add_final_authorization_models'),
    ]

    operations = [
        migrations.RunPython(
            materialize_final_authorization,
            migrations.RunPython.noop,
        ),
        migrations.RemoveField(
            model_name='rolepermission',
            name='effect',
        ),
        migrations.DeleteModel(
            name='UserPermissionOverride',
        ),
        migrations.DeleteModel(
            name='UserScopeGroupOverride',
        ),
    ]
