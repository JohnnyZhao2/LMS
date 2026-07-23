"""业务异常与统一错误 envelope。"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


class BusinessError(Exception):
    def __init__(self, code: str, message: str, details: dict = None):
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(message)


class ErrorCodes:
    RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND'
    PERMISSION_DENIED = 'PERMISSION_DENIED'
    VALIDATION_ERROR = 'VALIDATION_ERROR'
    INVALID_OPERATION = 'INVALID_OPERATION'
    INVALID_INPUT = 'INVALID_INPUT'
    AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS'
    AUTH_USER_INACTIVE = 'AUTH_USER_INACTIVE'
    AUTH_INVALID_ROLE = 'AUTH_INVALID_ROLE'
    RESOURCE_REFERENCED = 'RESOURCE_REFERENCED'
    RESOURCE_VERSION_MISMATCH = 'RESOURCE_VERSION_MISMATCH'
    USER_HAS_DATA = 'USER_HAS_DATA'
    TASK_INVALID_ASSIGNEES = 'TASK_INVALID_ASSIGNEES'
    TASK_ALREADY_CLOSED = 'TASK_ALREADY_CLOSED'
    EXAM_NOT_IN_WINDOW = 'EXAM_NOT_IN_WINDOW'
    EXAM_ALREADY_SUBMITTED = 'EXAM_ALREADY_SUBMITTED'


ERROR_STATUS_CODE_MAP = {
    ErrorCodes.RESOURCE_NOT_FOUND: status.HTTP_404_NOT_FOUND,
    ErrorCodes.PERMISSION_DENIED: status.HTTP_403_FORBIDDEN,
    ErrorCodes.VALIDATION_ERROR: status.HTTP_400_BAD_REQUEST,
    ErrorCodes.INVALID_OPERATION: status.HTTP_400_BAD_REQUEST,
    ErrorCodes.INVALID_INPUT: status.HTTP_400_BAD_REQUEST,
    ErrorCodes.AUTH_INVALID_CREDENTIALS: status.HTTP_401_UNAUTHORIZED,
    ErrorCodes.AUTH_USER_INACTIVE: status.HTTP_403_FORBIDDEN,
    ErrorCodes.AUTH_INVALID_ROLE: status.HTTP_403_FORBIDDEN,
    ErrorCodes.RESOURCE_REFERENCED: status.HTTP_400_BAD_REQUEST,
    ErrorCodes.RESOURCE_VERSION_MISMATCH: status.HTTP_409_CONFLICT,
    ErrorCodes.USER_HAS_DATA: status.HTTP_400_BAD_REQUEST,
    ErrorCodes.TASK_INVALID_ASSIGNEES: status.HTTP_400_BAD_REQUEST,
    ErrorCodes.TASK_ALREADY_CLOSED: status.HTTP_400_BAD_REQUEST,
    ErrorCodes.EXAM_NOT_IN_WINDOW: status.HTTP_400_BAD_REQUEST,
    ErrorCodes.EXAM_ALREADY_SUBMITTED: status.HTTP_400_BAD_REQUEST,
}


def get_status_code_for_error(error_code: str) -> int:
    return ERROR_STATUS_CODE_MAP.get(error_code, status.HTTP_400_BAD_REQUEST)


STATUS_ERROR_CODE_MAP = {
    400: ErrorCodes.VALIDATION_ERROR,
    401: ErrorCodes.AUTH_INVALID_CREDENTIALS,
    403: ErrorCodes.PERMISSION_DENIED,
    404: ErrorCodes.RESOURCE_NOT_FOUND,
}


def custom_exception_handler(exc, context):
    if isinstance(exc, BusinessError):
        return Response(
            {'code': exc.code, 'message': exc.message, 'details': exc.details},
            status=get_status_code_for_error(exc.code),
        )

    response = exception_handler(exc, context)
    if response is None:
        return None

    error_data = {
        'code': STATUS_ERROR_CODE_MAP.get(response.status_code, 'ERROR'),
        'message': str(exc),
        'details': {},
    }
    data = getattr(response, 'data', None)
    if isinstance(data, dict):
        if 'detail' in data:
            error_data['message'] = str(data['detail'])
        else:
            error_data['details'] = data
    elif isinstance(data, list):
        error_data['message'] = str(data[0]) if data else 'Error'

    response.data = error_data
    return response
