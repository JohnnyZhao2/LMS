from apps.authorization.engine import authorize


DEFAULT_SPOT_CHECK_ACTIONS = {
    'update': False,
    'delete': False,
}


def get_spot_check_actions_payload(request, spot_check) -> dict[str, bool]:
    if request is None:
        return dict(DEFAULT_SPOT_CHECK_ACTIONS)
    return {
        'update': authorize('spot_check.update', request, resource=spot_check).allowed,
        'delete': authorize('spot_check.delete', request, resource=spot_check).allowed,
    }
