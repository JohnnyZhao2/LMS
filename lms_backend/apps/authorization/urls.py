"""Authorization URLs."""

from django.urls import path

from .views import (
    PermissionCatalogView,
    RoleTemplateView,
    UserAuthorizationResetView,
    UserAuthorizationView,
)

urlpatterns = [
    path('permissions/', PermissionCatalogView.as_view(), name='authorization-permissions'),
    path('roles/<str:role_code>/', RoleTemplateView.as_view(), name='authorization-role-template'),
    path('users/<int:user_id>/', UserAuthorizationView.as_view(), name='authorization-user'),
    path(
        'users/<int:user_id>/reset-to-role/',
        UserAuthorizationResetView.as_view(),
        name='authorization-user-reset',
    ),
]
