from apps.authorization.engine import AuthorizationDecision
from apps.authorization.owner_scope import is_owner_in_scope
from apps.authorization.roles import is_user_in_scope
from apps.spot_checks.models import SpotCheck
from apps.users.models import User

_SPOT_CHECK_WRITE_CODES = frozenset({'spot_checks.change_spotcheck', 'spot_checks.delete_spotcheck'})


def _is_student_in_scope(engine, permission_code: str, *, student=None, student_id=None) -> bool:
    if not engine.has_permission(permission_code):
        return False
    if student is not None:
        if not student.is_active or student.is_superuser:
            return False
        scope, dept_ids = engine.get_permission_scope(permission_code)
        return is_user_in_scope(
            engine.user,
            student,
            data_scope=scope,
            department_ids=dept_ids,
        )
    if not student_id:
        return False
    return engine.scope_filter(permission_code, resource_model=User).filter(pk=student_id).exists()


def authorize_spot_check(engine, permission_code, *, resource=None, context=None, error_message=None):
    if permission_code == 'spot_checks.add_spotcheck':
        base_decision = engine.base_permission_decision(
            'spot_checks.add_spotcheck',
            error_message=error_message,
        )
        if not base_decision.allowed:
            return base_decision

        context = context or {}
        student = context.get('student')
        student_id = student.id if student is not None else context.get('student_id')
        if student is None and not student_id:
            return AuthorizationDecision(True)
        if _is_student_in_scope(
            engine,
            'spot_checks.add_spotcheck',
            student=student,
            student_id=student_id,
        ):
            return AuthorizationDecision(True)
        return AuthorizationDecision(
            False,
            message=error_message or '只能为自己负责的人员创建抽查记录',
        )

    if not isinstance(resource, SpotCheck):
        return None

    base_decision = engine.base_permission_decision(permission_code, error_message=error_message)
    if not base_decision.allowed:
        return base_decision

    cached_student = resource._state.fields_cache.get('student')

    if permission_code == 'spot_checks.view_spotcheck':
        if _is_student_in_scope(
            engine,
            'spot_checks.view_spotcheck',
            student=cached_student,
            student_id=resource.student_id,
        ):
            return AuthorizationDecision(True)
        return AuthorizationDecision(False, message=error_message or '无权访问该抽查记录')

    if permission_code in _SPOT_CHECK_WRITE_CODES:
        if not _is_student_in_scope(
            engine,
            'spot_checks.view_spotcheck',
            student=cached_student,
            student_id=resource.student_id,
        ) or not _is_student_in_scope(
            engine,
            permission_code,
            student=cached_student,
            student_id=resource.student_id,
        ):
            return AuthorizationDecision(False, message=error_message or '无权操作此抽查记录')
        if is_owner_in_scope(
            engine,
            resource.checker_id,
            permission_code=permission_code,
            owner=resource._state.fields_cache.get('checker'),
        ):
            return AuthorizationDecision(True)
        return AuthorizationDecision(False, message=error_message or '只能操作自己创建的抽查记录')

    return base_decision


def filter_spot_check_queryset(engine, *, queryset, context=None):
    accessible_students = engine.scope_filter('spot_checks.view_spotcheck', resource_model=User)
    return queryset.filter(student_id__in=accessible_students.values('id'))
