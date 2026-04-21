"""
User views module.
Split into:
- management.py: User management views (CRUD, roles, mentors, departments)
"""
from .management import (
    DepartmentsListView,
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
    'MentorsListView',
    'DepartmentsListView',
    'RolesListView',
    'UserSelfAvatarView',
]
