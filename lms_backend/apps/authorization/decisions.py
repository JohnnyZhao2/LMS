"""Authorization decision primitives."""

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class AuthorizationDecision:
    """Normalized authorization result returned by the engine."""

    allowed: bool
    permission_code: str
    message: str = ''
    reason: str = ''
    constraint: str = ''
    scope_type: Optional[str] = None
    conditional: bool = False

    @classmethod
    def allow(
        cls,
        permission_code: str,
        *,
        message: str = '',
        reason: str = '',
        constraint: str = '',
        scope_type: Optional[str] = None,
        conditional: bool = False,
    ) -> 'AuthorizationDecision':
        return cls(
            allowed=True,
            permission_code=permission_code,
            message=message,
            reason=reason,
            constraint=constraint,
            scope_type=scope_type,
            conditional=conditional,
        )

    @classmethod
    def deny(
        cls,
        permission_code: str,
        *,
        message: str = '',
        reason: str = '',
        constraint: str = '',
        scope_type: Optional[str] = None,
        conditional: bool = False,
    ) -> 'AuthorizationDecision':
        return cls(
            allowed=False,
            permission_code=permission_code,
            message=message,
            reason=reason,
            constraint=constraint,
            scope_type=scope_type,
            conditional=conditional,
        )


def conditional_allow(permission_code: str, *, constraint: str = '') -> AuthorizationDecision:
    return AuthorizationDecision.allow(permission_code, constraint=constraint, conditional=True)


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
        conditional=True,
    )
