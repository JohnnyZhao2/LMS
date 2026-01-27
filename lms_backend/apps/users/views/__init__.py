"""
User views module.
Split into:
- management.py: User management views (CRUD, roles, mentors, departments)
"""
from .management import (
    DepartmentMembersListView,
    DepartmentsListView,
    MenteesListView,
    MentorsListView,
    RolesListView,
    UserActivateView,
    UserAssignMentorView,
    UserAssignRolesView,
    UserDeactivateView,
    UserDetailView,
    UserListCreateView,
)

__all__ = [
    # Management views
    'UserListCreateView',
    'UserDetailView',
    'UserDeactivateView',
    'UserActivateView',
    'UserAssignRolesView',
    'UserAssignMentorView',
    'MenteesListView',
    'DepartmentMembersListView',
    'MentorsListView',
    'DepartmentsListView',
    'RolesListView',
]
