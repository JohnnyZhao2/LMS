from django.urls import path

from .views import PermissionCatalogView, UserPermissionsView


urlpatterns = [
    path('permissions/', PermissionCatalogView.as_view(), name='authorization-permissions'),
    path(
        'users/<int:user_id>/permissions/',
        UserPermissionsView.as_view(),
        name='authorization-user-permissions',
    ),
]
