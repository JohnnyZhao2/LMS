"""
User management URLs.
"""
from django.urls import path

from apps.users.views import (
    DepartmentsListView,
    MentorsListView,
    RolesListView,
    UserActivateView,
    UserAssignMentorView,
    UserAssignRolesView,
    UserAvatarUpdateView,
    UserDeactivateView,
    UserDetailView,
    UserListCreateView,
    UserSelfAvatarView,
)

urlpatterns = [
    path('', UserListCreateView.as_view(), name='user-list-create'),
    path('me/avatar/', UserSelfAvatarView.as_view(), name='user-self-avatar'),
    path('<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('<int:pk>/avatar/', UserAvatarUpdateView.as_view(), name='user-avatar'),
    path('<int:pk>/deactivate/', UserDeactivateView.as_view(), name='user-deactivate'),
    path('<int:pk>/activate/', UserActivateView.as_view(), name='user-activate'),
    path('<int:pk>/assign-roles/', UserAssignRolesView.as_view(), name='user-assign-roles'),
    path('<int:pk>/assign-mentor/', UserAssignMentorView.as_view(), name='user-assign-mentor'),
    path('mentors/', MentorsListView.as_view(), name='user-mentors'),
    path('roles/', RolesListView.as_view(), name='user-roles'),
    path('departments/', DepartmentsListView.as_view(), name='user-departments'),
]
