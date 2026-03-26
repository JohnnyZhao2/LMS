"""
Custom exception handling for LMS API.
"""
from rest_framework import status


class BusinessError(Exception):
    """Base class for business logic errors."""
    def __init__(self, code: str, message: str, details: dict = None):
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(message)
# Error codes
class ErrorCodes:
    """错误码常量"""
    # 通用错误
    RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND'
    PERMISSION_DENIED = 'PERMISSION_DENIED'
    VALIDATION_ERROR = 'VALIDATION_ERROR'
    INVALID_OPERATION = 'INVALID_OPERATION'
    INVALID_INPUT = 'INVALID_INPUT'
    # 认证错误
    AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS'
    AUTH_USER_INACTIVE = 'AUTH_USER_INACTIVE'
    AUTH_INVALID_ROLE = 'AUTH_INVALID_ROLE'
    # 资源错误
    RESOURCE_REFERENCED = 'RESOURCE_REFERENCED'
    RESOURCE_VERSION_MISMATCH = 'RESOURCE_VERSION_MISMATCH'
    # 用户错误
    USER_HAS_DATA = 'USER_HAS_DATA'
    # 任务错误
    TASK_INVALID_ASSIGNEES = 'TASK_INVALID_ASSIGNEES'
    TASK_ALREADY_CLOSED = 'TASK_ALREADY_CLOSED'
    # 提交错误
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


def custom_exception_handler(exc, context):
    """
    Custom exception handler that formats errors consistently.
    """
    from rest_framework.response import Response
    from rest_framework.views import exception_handler

    # Handle BusinessError
    if isinstance(exc, BusinessError):
        return Response(
            {
                'code': exc.code,
                'message': exc.message,
                'details': exc.details,
            },
            status=get_status_code_for_error(exc.code),
        )
    # Call REST framework's default exception handler
    response = exception_handler(exc, context)
    if response is not None:
        # Format the response
        error_data = {
            'code': 'ERROR',
            'message': str(exc),
            'details': {},
        }
        # Handle validation errors
        if hasattr(response, 'data'):
            if isinstance(response.data, dict):
                if 'detail' in response.data:
                    error_data['message'] = str(response.data['detail'])
                else:
                    error_data['details'] = response.data
            elif isinstance(response.data, list):
                error_data['message'] = str(response.data[0]) if response.data else 'Error'
        # Set appropriate error code based on status
        if response.status_code == 401:
            error_data['code'] = ErrorCodes.AUTH_INVALID_CREDENTIALS
        elif response.status_code == 403:
            error_data['code'] = ErrorCodes.PERMISSION_DENIED
        elif response.status_code == 404:
            error_data['code'] = ErrorCodes.RESOURCE_NOT_FOUND
        response.data = error_data
    return response
