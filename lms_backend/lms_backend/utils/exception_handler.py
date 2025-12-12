"""
Custom exception handler for standardized API responses.
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404


def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns standardized error responses.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)

    if response is not None:
        # Standardize the error response format
        custom_response_data = {
            'success': False,
            'message': 'Request failed',
            'data': None,
            'errors': response.data
        }
        response.data = custom_response_data
        return response

    # Handle Django validation errors
    if isinstance(exc, DjangoValidationError):
        return Response({
            'success': False,
            'message': 'Validation error',
            'data': None,
            'errors': exc.message_dict if hasattr(exc, 'message_dict') else {'detail': exc.messages}
        }, status=status.HTTP_400_BAD_REQUEST)

    # Handle 404 errors
    if isinstance(exc, Http404):
        return Response({
            'success': False,
            'message': 'Resource not found',
            'data': None,
            'errors': {'detail': str(exc)}
        }, status=status.HTTP_404_NOT_FOUND)

    # Handle unexpected errors
    return Response({
        'success': False,
        'message': 'Internal server error',
        'data': None,
        'errors': {'detail': str(exc)}
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
