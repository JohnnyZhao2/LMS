from core.exceptions import BusinessError, ErrorCodes


DEFAULT_AVATAR_KEY = 'avatar-01'
AVAILABLE_AVATAR_KEYS = tuple(f'avatar-{index:02d}' for index in range(1, 9))


def validate_avatar_key(avatar_key: str) -> str:
    if avatar_key not in AVAILABLE_AVATAR_KEYS:
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message='头像标识无效',
        )
    return avatar_key
