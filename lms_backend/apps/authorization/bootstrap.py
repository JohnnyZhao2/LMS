from apps.authorization.services import AuthorizationService


def sync_authorization_defaults(**kwargs) -> None:
    AuthorizationService.ensure_defaults()
