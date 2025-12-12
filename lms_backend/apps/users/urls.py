"""
URL configuration for users app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import AuthViewSet, UserViewSet, RoleViewSet, DepartmentViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'roles', RoleViewSet, basename='role')
router.register(r'departments', DepartmentViewSet, basename='department')

urlpatterns = [
    # 认证相关
    path('auth/login/', AuthViewSet.as_view({'post': 'login'}), name='auth-login'),
    path('auth/logout/', AuthViewSet.as_view({'post': 'logout'}), name='auth-logout'),
    path('auth/me/', AuthViewSet.as_view({'get': 'me'}), name='auth-me'),
    path('auth/switch-role/', AuthViewSet.as_view({'post': 'switch_role'}), name='auth-switch-role'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    
    # 其他路由
    path('', include(router.urls)),
]
