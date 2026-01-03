"""
User views module.

Split into:
- auth.py: Authentication views (login, logout, token refresh, role switch, password)
- management.py: User management views (CRUD, roles, mentors, departments)
"""
from .auth import (
    LoginView,
    LogoutView,
    RefreshTokenView,
    SwitchRoleView,
    MeView,
    ResetPasswordView,
    ChangePasswordView,
)
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
    # Auth views
    'LoginView',
    'LogoutView',
    'RefreshTokenView',
    'SwitchRoleView',
    'MeView',
    'ResetPasswordView',
    'ChangePasswordView',
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
