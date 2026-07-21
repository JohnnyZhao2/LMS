from apps.authorization.engine import authorize
from apps.spot_checks.models import SpotCheck


DEFAULT_SPOT_CHECK_ACTIONS = {
    'delete': False,
    'submit': False,
    'score': False,
}


def get_spot_check_actions_payload(request, spot_check) -> dict[str, bool]:
    if request is None or spot_check is None:
        return dict(DEFAULT_SPOT_CHECK_ACTIONS)

    can_update = authorize('spot_check.update', request, resource=spot_check).allowed
    can_delete = authorize('spot_check.delete', request, resource=spot_check).allowed
    can_submit = (
        spot_check.status == SpotCheck.STATUS_PENDING
        and authorize('spot_check.submit', request, resource=spot_check).allowed
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
