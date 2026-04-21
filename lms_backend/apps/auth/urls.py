"""
Authentication URLs for LMS.
Endpoints:
- POST /api/auth/login/ - User login
- POST /api/auth/logout/ - User logout
- POST /api/auth/refresh/ - Refresh token
- POST /api/auth/switch-role/ - Switch user role
- POST /api/auth/change-password/ - Admin change user password
- GET /api/auth/me/ - Get current user info
"""
from django.urls import path

from apps.auth.views import (
    ChangePasswordView,
    LoginView,
    LogoutView,
    MeView,
    OneAccountAuthorizeUrlView,
    OneAccountCodeLoginView,
    RefreshTokenView,
    SwitchRoleView,
)

urlpatterns = [
    path('one-account/authorize-url/', OneAccountAuthorizeUrlView.as_view(), name='auth-one-account-authorize-url'),
    path('one-account/code-login/', OneAccountCodeLoginView.as_view(), name='auth-one-account-code-login'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('refresh/', RefreshTokenView.as_view(), name='auth-refresh'),
    path('switch-role/', SwitchRoleView.as_view(), name='auth-switch-role'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
]
