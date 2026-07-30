"""Authorization URLs."""

from django.urls import path

from .views import (
    PermissionCatalogView,
    RolePermissionView,
    UserPermissionOverrideListCreateView,
    UserPermissionOverrideDeleteView,
)

urlpatterns = [
    path('permissions/', PermissionCatalogView.as_view(), name='authorization-permissions'),
    path('roles/<str:role_code>/permissions/', RolePermissionView.as_view(), name='authorization-role-permissions'),
    path('users/<int:user_id>/overrides/', UserPermissionOverrideListCreateView.as_view(), name='authorization-user-overrides'),
    path(
        'users/<int:user_id>/overrides/<int:override_id>/',
        UserPermissionOverrideDeleteView.as_view(),
        name='authorization-user-override-delete',
    ),
]
