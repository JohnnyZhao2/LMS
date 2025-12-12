"""
URL configuration for questions app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QuestionViewSet, QuizViewSet

router = DefaultRouter()
router.register(r'questions', QuestionViewSet, basename='question')
router.register(r'quizzes', QuizViewSet, basename='quiz')

urlpatterns = [
    path('', include(router.urls)),
]
