from django.urls import path

from .views import TagDetailView, TagListCreateView, TagMergeView, TagReorderView


urlpatterns = [
    path('', TagListCreateView.as_view(), name='tag-list-create'),
    path('merge/', TagMergeView.as_view(), name='tag-merge'),
    path('reorder/', TagReorderView.as_view(), name='tag-reorder'),
    path('<int:pk>/', TagDetailView.as_view(), name='tag-detail'),
]
