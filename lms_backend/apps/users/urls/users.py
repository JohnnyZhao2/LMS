"""
User management URLs.
Endpoints:
- GET /api/users/ - List users in authorized scope
- POST /api/users/ - Create new user (admin only)
- GET /api/users/{id}/ - Get user details in authorized scope
- PATCH /api/users/{id}/ - Update user info (admin only)
- DELETE /api/users/{id}/ - Hard delete user and related data (admin only)
- POST /api/users/{id}/assign-roles/ - Assign roles to user (admin only)
- POST /api/users/{id}/assign-mentor/ - Assign mentor to user (admin only)
- GET /api/users/mentors/ - Get all mentors list (admin only)
- GET /api/users/roles/ - Get all roles list (admin only)
- GET /api/users/departments/ - Get all departments list (admin only)
"""
from django.urls import path

from apps.users.views import (
    DepartmentsListView,
    MentorsListView,
    RolesListView,
    UserAvatarUpdateView,
    UserAssignMentorView,
    UserAssignRolesView,
    UserDetailView,
    UserListCreateView,
    UserSelfAvatarView,
)

urlpatterns = [
    path('', UserListCreateView.as_view(), name='user-list-create'),
    path('me/avatar/', UserSelfAvatarView.as_view(), name='user-self-avatar'),
    path('<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('<int:pk>/avatar/', UserAvatarUpdateView.as_view(), name='user-avatar'),
    path('<int:pk>/assign-roles/', UserAssignRolesView.as_view(), name='user-assign-roles'),
    path('<int:pk>/assign-mentor/', UserAssignMentorView.as_view(), name='user-assign-mentor'),
    path('mentors/', MentorsListView.as_view(), name='user-mentors'),
    path('roles/', RolesListView.as_view(), name='user-roles'),
    path('departments/', DepartmentsListView.as_view(), name='user-departments'),
]
