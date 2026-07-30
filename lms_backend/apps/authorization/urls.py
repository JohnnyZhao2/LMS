from django.urls import path

from .views import PermissionCatalogView, UserPermissionDetailView, UserPermissionsView


urlpatterns = [
    path('permissions/', PermissionCatalogView.as_view(), name='authorization-permissions'),
    path(
        'users/<int:user_id>/permissions/',
        UserPermissionsView.as_view(),
        name='authorization-user-permissions',
    ),
    path(
        'users/<int:user_id>/permissions/<str:permission_code>/',
        UserPermissionDetailView.as_view(),
        name='authorization-user-permission-detail',
    ),
]
