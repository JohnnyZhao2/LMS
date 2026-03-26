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
    UserAvatarUpdateView,
    UserAssignMentorView,
    UserAssignRolesView,
    UserDeactivateView,
    UserDetailView,
    UserListCreateView,
    UserSelfAvatarView,
)

__all__ = [
    # Management views
    'UserListCreateView',
    'UserDetailView',
    'UserDeactivateView',
    'UserActivateView',
    'UserAvatarUpdateView',
    'UserAssignRolesView',
    'UserAssignMentorView',
    'MenteesListView',
    'DepartmentMembersListView',
    'MentorsListView',
    'DepartmentsListView',
    'RolesListView',
    'UserSelfAvatarView',
]
