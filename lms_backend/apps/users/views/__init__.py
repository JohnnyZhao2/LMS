"""
User views module.
Split into:
- management.py: User management views (CRUD, roles, mentors, departments)
"""
from .management import (
    UserListCreateView,
    UserDetailView,
    UserDeactivateView,
    UserActivateView,
    UserAssignRolesView,
    UserAssignMentorView,
    MenteesListView,
    DepartmentMembersListView,
    MentorsListView,
    DepartmentsListView,
    RolesListView,
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
