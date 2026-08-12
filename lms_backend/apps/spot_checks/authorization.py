from apps.authorization.engine import AuthorizationDecision
from apps.spot_checks.models import SpotCheck
from apps.users.models import User


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
        if student is None and context.get('student_id'):
            student = User.objects.filter(pk=context['student_id']).first()

        if student is None:
            return AuthorizationDecision(True)
        if engine.scope_filter('spot_checks.add_spotcheck', resource_model=User).filter(pk=student.id).exists():
            return AuthorizationDecision(True)
        return AuthorizationDecision(
            False,
            message=error_message or '只能为自己负责的人员创建抽查记录',
        )

    if not isinstance(resource, SpotCheck):
        return None

    if permission_code in {'spot_checks.change_spotcheck', 'spot_checks.delete_spotcheck'}:
        view_decision = authorize_spot_check(
            engine,
            'spot_checks.view_spotcheck',
            resource=resource,
            context=context,
            error_message='无权访问该抽查记录',
        )
        if not view_decision.allowed:
            return AuthorizationDecision(False, message=error_message or '无权操作此抽查记录')

    base_decision = engine.base_permission_decision(permission_code, error_message=error_message)
    if not base_decision.allowed:
        return base_decision

    if permission_code == 'spot_checks.view_spotcheck':
        if engine.scope_filter('spot_checks.view_spotcheck', resource_model=User).filter(pk=resource.student_id).exists():
            return AuthorizationDecision(True)
        return AuthorizationDecision(False, message=error_message or '无权访问该抽查记录')

    if permission_code in {'spot_checks.change_spotcheck', 'spot_checks.delete_spotcheck'}:
        if engine.user.is_admin or resource.checker_id == getattr(engine.user, 'id', None):
            return AuthorizationDecision(True)
        return AuthorizationDecision(False, message=error_message or '只能操作自己创建的抽查记录')

    return base_decision


def filter_spot_check_queryset(engine, *, queryset, context=None):
    accessible_students = engine.scope_filter('spot_checks.view_spotcheck', resource_model=User)
    return queryset.filter(student_id__in=accessible_students.values('id'))


def filter_writable_spot_check_queryset(engine, *, queryset, context=None):
    qs = filter_spot_check_queryset(engine, queryset=queryset, context=context)
    if engine.user.is_admin:
        return qs
    user_id = getattr(engine.user, 'id', None)
    if not user_id:
        return qs.none()
    return qs.filter(checker_id=user_id)
