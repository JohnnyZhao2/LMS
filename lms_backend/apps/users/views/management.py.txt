"""User management view facade."""

from .assignment import UserAssignMentorView, UserAssignRolesView
from .avatar import UserAvatarUpdateView, UserSelfAvatarView
from .crud import UserDetailView, UserListCreateView
from .reference import DepartmentsListView, MentorsListView, RolesListView
from .status import UserActivateView, UserDeactivateView

__all__ = [
    'DepartmentsListView',
    'MentorsListView',
    'RolesListView',
    'UserActivateView',
    'UserAvatarUpdateView',
    'UserAssignMentorView',
    'UserAssignRolesView',
    'UserDeactivateView',
    'UserDetailView',
    'UserListCreateView',
    'UserSelfAvatarView',
]
