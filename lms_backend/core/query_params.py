"""
Query parameter parsing helpers.
"""
from typing import Optional

from core.exceptions import BusinessError, ErrorCodes


def parse_int_query_param(
    request,
    name: str,
    default: Optional[int] = None,
    required: bool = False,
    minimum: Optional[int] = None,
    maximum: Optional[int] = None,
) -> Optional[int]:
    """
    Parse integer query parameter with unified validation errors.
    - required=True 时，参数缺失会返回 VALIDATION_ERROR
    """
    raw_value = request.query_params.get(name)

    if raw_value is None or raw_value == '':
        if required:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'缺少参数 {name}',
            )
        return default

    try:
        value = int(raw_value)
    except (TypeError, ValueError):
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message=f'参数 {name} 必须是整数',
        )

    if minimum is not None and value < minimum:
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message=f'参数 {name} 必须大于等于 {minimum}',
        )

    if maximum is not None and value > maximum:
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message=f'参数 {name} 必须小于等于 {maximum}',
        )

    return value


def parse_bool_query_param(
    request,
    name: str,
    default: Optional[bool] = None,
) -> Optional[bool]:
    """
    Parse boolean query parameter with unified validation errors.
    """
    raw_value = request.query_params.get(name)
    if raw_value is None or raw_value == '':
        return default

    normalized = str(raw_value).strip().lower()
    if normalized in {'true', '1', 'yes', 'on'}:
        return True
    if normalized in {'false', '0', 'no', 'off'}:
        return False

    raise BusinessError(
        code=ErrorCodes.VALIDATION_ERROR,
        message=f'参数 {name} 必须是布尔值',
    )
