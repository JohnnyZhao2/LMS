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
    'MentorsListView',
    'DepartmentsListView',
    'RolesListView',
    'UserSelfAvatarView',
]
