"""Authorization URLs."""

from django.urls import path

from .views import (
    PermissionCatalogView,
    RolePermissionView,
    UserPermissionOverrideListCreateView,
    UserPermissionOverrideRevokeView,
    UserScopeGroupOverrideListCreateView,
    UserScopeGroupOverrideRevokeView,
)

urlpatterns = [
    path('permissions/', PermissionCatalogView.as_view(), name='authorization-permissions'),
    path('roles/<str:role_code>/permissions/', RolePermissionView.as_view(), name='authorization-role-permissions'),
    path('users/<int:user_id>/overrides/', UserPermissionOverrideListCreateView.as_view(), name='authorization-user-overrides'),
    path(
        'users/<int:user_id>/scope-group-overrides/',
        UserScopeGroupOverrideListCreateView.as_view(),
        name='authorization-user-scope-group-overrides',
    ),
    path(
        'users/<int:user_id>/overrides/<int:override_id>/revoke/',
        UserPermissionOverrideRevokeView.as_view(),
        name='authorization-user-override-revoke',
    ),
    path(
        'users/<int:user_id>/scope-group-overrides/<int:override_id>/revoke/',
        UserScopeGroupOverrideRevokeView.as_view(),
        name='authorization-user-scope-group-override-revoke',
    ),
]
