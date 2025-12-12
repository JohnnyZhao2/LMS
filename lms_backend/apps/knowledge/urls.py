"""
URL configuration for knowledge app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import KnowledgeCategoryViewSet, KnowledgeViewSet, OperationTypeViewSet

router = DefaultRouter()
router.register(r'categories', KnowledgeCategoryViewSet, basename='knowledge-category')
router.register(r'operation-types', OperationTypeViewSet, basename='operation-type')
router.register(r'', KnowledgeViewSet, basename='knowledge')

urlpatterns = [
    path('', include(router.urls)),
]
