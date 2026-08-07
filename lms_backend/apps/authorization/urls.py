"""Authorization URLs."""

from django.urls import path

from .views import GroupPermissionView, PermissionCatalogView, UserPermissionView

urlpatterns = [
    path('permissions/', PermissionCatalogView.as_view(), name='authorization-permissions'),
    path('groups/<str:role_code>/permissions/', GroupPermissionView.as_view(), name='authorization-group-permissions'),
    path('users/<int:user_id>/permissions/', UserPermissionView.as_view(), name='authorization-user-permissions'),
]
