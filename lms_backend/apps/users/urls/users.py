"""
User management URLs.

Endpoints:
- GET /api/users/ - List all users (admin only)
- POST /api/users/ - Create new user (admin only)
- GET /api/users/{id}/ - Get user details (admin only)
- PATCH /api/users/{id}/ - Update user info (admin only)
- POST /api/users/{id}/deactivate/ - Deactivate user (admin only)
- POST /api/users/{id}/activate/ - Activate user (admin only)
- POST /api/users/{id}/assign-roles/ - Assign roles to user (admin only)
- POST /api/users/{id}/assign-mentor/ - Assign mentor to user (admin only)
- GET /api/users/mentees/ - Get mentees for current mentor
- GET /api/users/department-members/ - Get department members for current dept manager
- GET /api/users/mentors/ - Get all mentors list (admin only)
- GET /api/users/roles/ - Get all roles list (admin only)
- GET /api/users/departments/ - Get all departments list (admin only)

Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.4, 3.5, 3.6
"""
from django.urls import path

from apps.users.views import (
    UserListCreateView,
    UserDetailView,
    UserDeactivateView,
    UserActivateView,
    UserAssignRolesView,
    UserAssignMentorView,
    MenteesListView,
    DepartmentMembersListView,
    MentorsListView,
    RolesListView,
    DepartmentsListView,
)

urlpatterns = [
    path('', UserListCreateView.as_view(), name='user-list-create'),
    path('<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('<int:pk>/deactivate/', UserDeactivateView.as_view(), name='user-deactivate'),
    path('<int:pk>/activate/', UserActivateView.as_view(), name='user-activate'),
    path('<int:pk>/assign-roles/', UserAssignRolesView.as_view(), name='user-assign-roles'),
    path('<int:pk>/assign-mentor/', UserAssignMentorView.as_view(), name='user-assign-mentor'),
    path('mentees/', MenteesListView.as_view(), name='user-mentees'),
    path('department-members/', DepartmentMembersListView.as_view(), name='user-department-members'),
    path('mentors/', MentorsListView.as_view(), name='user-mentors'),
    path('roles/', RolesListView.as_view(), name='user-roles'),
    path('departments/', DepartmentsListView.as_view(), name='user-departments'),
]
