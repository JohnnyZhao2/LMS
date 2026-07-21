from typing import Iterable

from .constants import PERMISSION_IMPLIES_MAP, REGISTERED_PERMISSION_CODES


def expand_permission_codes(permission_codes: Iterable[str]) -> list[str]:
    expanded_codes: list[str] = []
    pending_codes = [code for code in permission_codes if code]
    while pending_codes:
        permission_code = pending_codes.pop(0)
        if permission_code in expanded_codes:
            continue
        expanded_codes.append(permission_code)
        pending_codes.extend(PERMISSION_IMPLIES_MAP.get(permission_code, []))
    return expanded_codes


def permission_grant_covers(granted_code: str, permission_code: str) -> bool:
    if granted_code == permission_code:
        return True
    return permission_code in expand_permission_codes(PERMISSION_IMPLIES_MAP.get(granted_code, []))


def permission_code_set_covers(granted_codes: Iterable[str], permission_code: str) -> bool:
    return any(permission_grant_covers(granted_code, permission_code) for granted_code in granted_codes)


def get_permission_covering_codes(permission_code: str) -> list[str]:
    return [
        code
        for code in sorted(REGISTERED_PERMISSION_CODES)
        if code != permission_code and permission_grant_covers(code, permission_code)
    ]
