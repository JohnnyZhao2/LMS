from apps.authorization.engine import authorize
from apps.authorization.roles import resolve_current_role
from apps.spot_checks.models import SpotCheck


DEFAULT_SPOT_CHECK_ACTIONS = {
    'delete': False,
    'submit': False,
    'score': False,
}


def get_spot_check_actions_payload(request, spot_check) -> dict[str, bool]:
    if request is None or spot_check is None:
        return dict(DEFAULT_SPOT_CHECK_ACTIONS)

    can_update = authorize('spot_checks.change_spotcheck', request, resource=spot_check).allowed
    can_delete = authorize('spot_checks.delete_spotcheck', request, resource=spot_check).allowed
    can_submit = (
        resolve_current_role(request.user) == 'STUDENT'
        and spot_check.student_id == getattr(request.user, 'id', None)
        and spot_check.status == SpotCheck.STATUS_PENDING
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
