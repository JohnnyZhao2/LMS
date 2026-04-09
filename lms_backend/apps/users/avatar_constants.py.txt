from core.exceptions import BusinessError, ErrorCodes


DEFAULT_AVATAR_KEY = 'avatar-01'

# 默认头像 (avatar-01, avatar-02)
ORIGINAL_AVATAR_KEYS = (
    'avatar-01',
    'avatar-02',
)

# 彩色表情头像 (coloremoji-1 到 coloremoji-15)
COLOREMOJI_AVATAR_KEYS = tuple(f'coloremoji-{index}' for index in range(1, 16))

# 萌宠头像 (coloranimals-1 到 coloranimals-9，加上迁移过来的 avatar-05 到 avatar-08)
COLORANIMALS_AVATAR_KEYS = tuple(f'coloranimals-{index}' for index in range(1, 10)) + (
    'avatar-05',
    'avatar-06',
    'avatar-07',
    'avatar-08',
)

# 表情头像 (emoji-1 到 emoji-10)
EMOJI_AVATAR_KEYS = tuple(f'emoji-{index}' for index in range(1, 11))

# 动物头像 (animals-1 到 animals-20)
ANIMALS_AVATAR_KEYS = tuple(f'animals-{index}' for index in range(1, 21))

# 所有可用的头像 key
AVAILABLE_AVATAR_KEYS = (
    ORIGINAL_AVATAR_KEYS
    + COLOREMOJI_AVATAR_KEYS
    + COLORANIMALS_AVATAR_KEYS
    + EMOJI_AVATAR_KEYS
    + ANIMALS_AVATAR_KEYS
)


def validate_avatar_key(avatar_key: str) -> str:
    if avatar_key not in AVAILABLE_AVATAR_KEYS:
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message='头像标识无效',
        )
    return avatar_key
