"""
Pagination configuration for LMS API.
统一分页响应格式：{code, message, data}
"""
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination class for LMS API.
    默认每页 20 条，最大 100 条
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        """
        返回统一的分页响应格式：{code, message, data}
        data 包含：count, total_pages, current_page, page_size, next, previous, results
        """
        return Response({
            'code': 'SUCCESS',
            'message': 'success',
            'data': {
                'count': self.page.paginator.count,
                'total_pages': self.page.paginator.num_pages,
                'current_page': self.page.number,
                'page_size': self.get_page_size(self.request),
                'next': self.get_next_link(),
                'previous': self.get_previous_link(),
                'results': data,
            }
        })


class SmallResultsSetPagination(PageNumberPagination):
    """
    Small pagination for dashboard widgets.
    默认每页 10 条，最大 50 条
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50

    def get_paginated_response(self, data):
        """
        返回统一的分页响应格式：{code, message, data}
        data 包含：count, total_pages, current_page, page_size, next, previous, results
        """
        return Response({
            'code': 'SUCCESS',
            'message': 'success',
            'data': {
                'count': self.page.paginator.count,
                'total_pages': self.page.paginator.num_pages,
                'current_page': self.page.number,
                'page_size': self.get_page_size(self.request),
                'next': self.get_next_link(),
                'previous': self.get_previous_link(),
                'results': data,
            }
        })
