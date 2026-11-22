"""Authorization URLs."""

from django.urls import path

from .views import (
    PermissionCatalogView,
    RoleDetailView,
    RoleListCreateView,
)

urlpatterns = [
    path('permissions/', PermissionCatalogView.as_view(), name='authorization-permissions'),
    path('roles/', RoleListCreateView.as_view(), name='authorization-roles'),
    path('roles/<str:role_code>/', RoleDetailView.as_view(), name='authorization-role-detail'),
]
