from apps.authorization.engine import get_engine
from apps.spot_checks.models import SpotCheck


DEFAULT_SPOT_CHECK_ACTIONS = {
    'delete': False,
    'submit': False,
    'score': False,
}


def get_spot_check_actions_payload(request, spot_check) -> dict[str, bool]:
    if request is None or spot_check is None:
        return dict(DEFAULT_SPOT_CHECK_ACTIONS)

    can_update = get_engine(request).authorize('spot_checks.change_spotcheck', resource=spot_check).allowed
    can_delete = get_engine(request).authorize('spot_checks.delete_spotcheck', resource=spot_check).allowed
    can_submit = (
        spot_check.student_id == getattr(request.user, 'id', None)
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
