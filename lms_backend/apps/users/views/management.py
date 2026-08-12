"""User management view facade."""

from .assignment import UserAssignMentorView, UserAssignRolesView
from .avatar import UserAvatarUpdateView, UserSelfAvatarView
from .crud import UserDetailView, UserListCreateView
from .reference import DepartmentsListView, MentorsListView, RolesListView

__all__ = [
    'DepartmentsListView',
    'MentorsListView',
    'RolesListView',
    'UserAvatarUpdateView',
    'UserAssignMentorView',
    'UserAssignRolesView',
    'UserDetailView',
    'UserListCreateView',
    'UserSelfAvatarView',
]
