"""
统一 API 响应包装器

提供一致的响应格式：
- 成功响应: {code: 'SUCCESS', message: '...', data: {...}}
- 错误响应: {code: 'ERROR_CODE', message: '...', details: {...}}

使用方式:
    from core.responses import success_response, error_response, paginated_response
    
    # 成功响应
    return success_response(data=serializer.data)
    return success_response(data=serializer.data, message='创建成功', status_code=201)
    
    # 分页响应
    return paginated_response(page, serializer.data, paginator)
    
    # 错误响应（通常通过 BusinessError 自动处理）
    return error_response(code='VALIDATION_ERROR', message='参数错误')
"""
from typing import Any, Optional, List
from rest_framework.response import Response
from rest_framework import status


def success_response(
    data: Any = None,
    message: str = 'success',
    status_code: int = status.HTTP_200_OK
) -> Response:
    """
    统一成功响应格式
    
    Args:
        data: 响应数据
        message: 响应消息
        status_code: HTTP 状态码
        
    Returns:
        Response 对象
        
    Example:
        return success_response(data={'id': 1, 'name': 'test'})
        # => {"code": "SUCCESS", "message": "success", "data": {"id": 1, "name": "test"}}
    """
    return Response(
        {
            'code': 'SUCCESS',
            'message': message,
            'data': data,
        },
        status=status_code
    )


def created_response(data: Any = None, message: str = '创建成功') -> Response:
    """创建成功响应（201）"""
    return success_response(data=data, message=message, status_code=status.HTTP_201_CREATED)


def no_content_response() -> Response:
    """无内容响应（204）- 用于删除操作"""
    return Response(status=status.HTTP_204_NO_CONTENT)


def error_response(
    code: str,
    message: str,
    details: dict = None,
    status_code: int = status.HTTP_400_BAD_REQUEST
) -> Response:
    """
    统一错误响应格式
    
    Args:
        code: 错误码
        message: 错误消息
        details: 错误详情
        status_code: HTTP 状态码
        
    Returns:
        Response 对象
        
    Note:
        通常不需要直接调用此方法，BusinessError 会通过 custom_exception_handler 自动处理
    """
    return Response(
        {
            'code': code,
            'message': message,
            'details': details or {},
        },
        status=status_code
    )


def paginated_response(
    page: List[Any],
    serialized_data: List[dict],
    paginator: Any
) -> Response:
    """
    统一分页响应格式
    
    Args:
        page: 分页后的数据列表
        serialized_data: 序列化后的数据
        paginator: 分页器实例
        
    Returns:
        Response 对象
        
    Example:
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = MySerializer(page, many=True)
        return paginated_response(page, serializer.data, paginator)
        # => {"code": "SUCCESS", "message": "success", "data": {..., "results": [...]}}
    """
    # 获取分页器的响应数据
    paginated_data = {
        'count': paginator.page.paginator.count,
        'next': paginator.get_next_link(),
        'previous': paginator.get_previous_link(),
        'results': serialized_data,
    }
    
    return success_response(data=paginated_data)


def list_response(data: List[Any], message: str = 'success') -> Response:
    """
    列表响应（非分页）
    
    Args:
        data: 列表数据
        message: 响应消息
        
    Returns:
        Response 对象
    """
    return success_response(data=data, message=message)
