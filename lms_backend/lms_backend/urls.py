"""
URL configuration for LMS Backend project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # API endpoints
    path('api/', include('apps.users.urls')),
    path('api/knowledge/', include('apps.knowledge.urls')),
    path('api/', include('apps.questions.urls')),
    # path('api/', include('apps.tasks.urls')),
    # path('api/', include('apps.submissions.urls')),
    # path('api/', include('apps.grading.urls')),
    # path('api/', include('apps.statistics.urls')),
    # path('api/', include('apps.notifications.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
