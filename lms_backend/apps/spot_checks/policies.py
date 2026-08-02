from apps.authorization.engine import authorize
from apps.authorization.roles import is_student_workspace
from apps.spot_checks.models import SpotCheck


DEFAULT_SPOT_CHECK_ACTIONS = {
    'delete': False,
    'submit': False,
    'score': False,
}


def build_spot_check_actions(
    request,
    spot_check,
    *,
    can_update: bool,
    can_delete: bool,
) -> dict[str, bool]:
    """基于已解析能力与状态拼装 actions，避免列表逐条重复范围查询。"""
    can_submit = (
        spot_check.status == SpotCheck.STATUS_PENDING
        and is_student_workspace(request)
        and spot_check.student_id == getattr(request.user, 'id', None)
    )
    can_score = (
        spot_check.status in {SpotCheck.STATUS_SUBMITTED, SpotCheck.STATUS_SCORED}
        and can_update
    )
    return {
        'delete': can_delete,
        'submit': can_submit,
        'score': can_score,
    }


def get_spot_check_list_capabilities(request) -> dict[str, bool]:
    """请求级基础能力（不含 per-resource 范围 exists）。"""
    if request is None:
        return {'can_update': False, 'can_delete': False}
    return {
        'can_update': authorize('spot_check.update', request).allowed,
        'can_delete': authorize('spot_check.delete', request).allowed,
    }


def get_spot_check_actions_payload(request, spot_check) -> dict[str, bool]:
    if request is None or spot_check is None:
        return dict(DEFAULT_SPOT_CHECK_ACTIONS)

    list_capabilities = getattr(request, '_spot_check_list_capabilities', None)
    if list_capabilities is not None:
        return build_spot_check_actions(
            request,
            spot_check,
            can_update=list_capabilities['can_update'],
            can_delete=list_capabilities['can_delete'],
        )

    can_update = authorize('spot_check.update', request, resource=spot_check).allowed
    can_delete = authorize('spot_check.delete', request, resource=spot_check).allowed
    return build_spot_check_actions(
        request,
        spot_check,
        can_update=can_update,
        can_delete=can_delete,
    )
