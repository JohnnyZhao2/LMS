from apps.authorization.decisions import conditional_allow, conditional_deny
from apps.authorization.registry import (
    AuthorizationSpec,
    ResourceAuthorizationHandler,
    ScopeFilterHandler,
    crud_permissions,
)
from apps.spot_checks.models import SpotCheck
from apps.users.models import User


SPOT_CHECK_CODES = (
    'spot_check.view',
    'spot_check.create',
    'spot_check.update',
    'spot_check.delete',
)
MEMBER_SUMMARY = '按当前角色人员范围'


def _resolve_student(permission_code, resource):
    """创建权限识别 User，其他权限从 SpotCheck 取学员。"""
    if permission_code == 'spot_check.create':
        return resource if isinstance(resource, User) else None
    if isinstance(resource, SpotCheck):
        return resource.student
    return None


def _authorize(engine, permission_code, *, resource=None, error_message=None):
    if permission_code == 'spot_check.create':
        if not isinstance(resource, User):
            return None
    elif not isinstance(resource, SpotCheck):
        return None
    student = _resolve_student(permission_code, resource)
    if student is None:
        return conditional_allow(permission_code, constraint='member_scope')
    if engine.get_scoped_learning_members().filter(pk=student.pk).exists():
        return conditional_allow(permission_code, constraint='member_scope')
    return conditional_deny(
        permission_code,
        message=error_message or '该学员不在当前管理范围内',
        reason='scope_denied',
        constraint='member_scope',
    )


def _filter_records(engine, *, queryset):
    return queryset.filter(
        student_id__in=engine.get_scoped_learning_members().values('id')
    )


def _filter_students(engine, *, queryset):
    return engine.get_role_scoped_user_queryset(
        queryset.filter(
            is_active=True,
            roles__code='STUDENT',
            is_superuser=False,
        ).distinct(),
        cache_key='learning_members',
    )


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        module='spot_check',
        permissions=crud_permissions('spot_check', '抽查'),
        resource_authorization_handlers=(
            ResourceAuthorizationHandler(
                key='spot_checks.member_scope',
                permission_codes=SPOT_CHECK_CODES,
                authorize=_authorize,
                constraint_summaries={code: MEMBER_SUMMARY for code in SPOT_CHECK_CODES},
            ),
        ),
        scope_filter_handlers=(
            ScopeFilterHandler(
                key='spot_checks.records',
                permission_code='spot_check.view',
                resource_model=SpotCheck,
                filter_queryset=_filter_records,
                constraint_summary=MEMBER_SUMMARY,
            ),
            ScopeFilterHandler(
                key='spot_checks.students.view',
                permission_code='spot_check.view',
                resource_model=User,
                filter_queryset=_filter_students,
                constraint_summary=MEMBER_SUMMARY,
            ),
            ScopeFilterHandler(
                key='spot_checks.students.create',
                permission_code='spot_check.create',
                resource_model=User,
                filter_queryset=_filter_students,
                constraint_summary=MEMBER_SUMMARY,
            ),
        ),
    ),
)
