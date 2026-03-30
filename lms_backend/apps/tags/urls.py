from django.urls import path

from .views import TagDetailView, TagListCreateView, TagMergeView


urlpatterns = [
    path('', TagListCreateView.as_view(), name='tag-list-create'),
    path('merge/', TagMergeView.as_view(), name='tag-merge'),
    path('<int:pk>/', TagDetailView.as_view(), name='tag-detail'),
]
