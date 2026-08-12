"""
User views module.
Split into:
- management.py: User management views (CRUD, roles, mentors, departments)
"""
from .management import (
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

__all__ = [
    'UserListCreateView',
    'UserDetailView',
    'UserAvatarUpdateView',
    'UserAssignRolesView',
    'UserAssignMentorView',
    'MentorsListView',
    'DepartmentsListView',
    'RolesListView',
    'UserSelfAvatarView',
]
