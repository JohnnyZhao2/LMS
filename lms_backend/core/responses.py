"""统一成功响应包装。业务错误应抛 BusinessError，由全局 handler 处理。"""
from typing import Any

from rest_framework import status
from rest_framework.response import Response


def success_response(
    data: Any = None,
    message: str = 'success',
    status_code: int = status.HTTP_200_OK,
) -> Response:
    """成功响应：{code, message, data}。"""
    return Response(
        {
            'code': 'SUCCESS',
            'message': message,
            'data': data,
        },
        status=status_code,
    )


def created_response(data: Any = None, message: str = '创建成功') -> Response:
    """创建成功响应（201）。"""
    return success_response(data=data, message=message, status_code=status.HTTP_201_CREATED)


def no_content_response() -> Response:
    """删除成功响应。"""
    return success_response(data=None, message='删除成功')


def list_response(data: list[Any], message: str = 'success') -> Response:
    """非分页列表响应。"""
    return success_response(data=data, message=message)
