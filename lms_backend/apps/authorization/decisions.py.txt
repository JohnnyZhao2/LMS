"""Authorization decision primitives."""

from dataclasses import dataclass


@dataclass(frozen=True)
class AuthorizationDecision:
    """Normalized authorization result returned by the engine."""

    allowed: bool
    permission_code: str
    message: str = ''
    reason: str = ''
    constraint: str = ''

    @classmethod
    def allow(
        cls,
        permission_code: str,
        *,
        message: str = '',
        reason: str = '',
        constraint: str = '',
    ) -> 'AuthorizationDecision':
        return cls(
            allowed=True,
            permission_code=permission_code,
            message=message,
            reason=reason,
            constraint=constraint,
        )

    @classmethod
    def deny(
        cls,
        permission_code: str,
        *,
        message: str = '',
        reason: str = '',
        constraint: str = '',
    ) -> 'AuthorizationDecision':
        return cls(
            allowed=False,
            permission_code=permission_code,
            message=message,
            reason=reason,
            constraint=constraint,
        )


def conditional_allow(permission_code: str, *, constraint: str = '') -> AuthorizationDecision:
    return AuthorizationDecision.allow(permission_code, constraint=constraint)


def conditional_deny(
    permission_code: str,
    *,
    message: str = '',
    reason: str = '',
    constraint: str = '',
) -> AuthorizationDecision:
    return AuthorizationDecision.deny(
        permission_code,
        message=message,
        reason=reason,
        constraint=constraint,
    )
