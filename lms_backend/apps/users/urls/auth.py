"""
Authentication URLs for LMS.

Endpoints:
- POST /api/auth/login/ - User login
- POST /api/auth/logout/ - User logout
- POST /api/auth/refresh/ - Refresh token
- POST /api/auth/switch-role/ - Switch user role
- POST /api/auth/reset-password/ - Admin reset user password
- GET /api/auth/me/ - Get current user info

Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
"""
from django.urls import path

from apps.users.views import (
    LoginView,
    LogoutView,
    RefreshTokenView,
    SwitchRoleView,
    MeView,
    ResetPasswordView,
)

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('refresh/', RefreshTokenView.as_view(), name='auth-refresh'),
    path('switch-role/', SwitchRoleView.as_view(), name='auth-switch-role'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('reset-password/', ResetPasswordView.as_view(), name='auth-reset-password'),
]
