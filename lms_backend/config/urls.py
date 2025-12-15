"""
URL configuration for LMS project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    # API endpoints
    path('api/auth/', include('apps.users.urls.auth')),
    path('api/users/', include('apps.users.urls.users')),
    path('api/knowledge/', include('apps.knowledge.urls')),
    path('api/questions/', include('apps.questions.urls')),
    path('api/quizzes/', include('apps.quizzes.urls')),
    path('api/tasks/', include('apps.tasks.urls')),
    path('api/submissions/', include('apps.submissions.urls')),
    path('api/grading/', include('apps.submissions.urls_grading')),
    path('api/spot-checks/', include('apps.spot_checks.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    # API documentation - OpenAPI 3.0
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema.yaml', SpectacularAPIView.as_view(renderer_classes=[]), name='schema-yaml'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
