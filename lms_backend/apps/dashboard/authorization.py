"""Dashboard owned permission specs."""

from apps.authorization.registry import AuthorizationSpec, PermissionDefinition


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='dashboard.analytics',
        module='analytics',
        permissions=(
            PermissionDefinition(
                code='analytics.view',
                name='查看数据看板',
                description='查看团队数据看板',
            ),
        ),
        role_defaults={
            'TEAM_MANAGER': ('analytics.view',),
        },
        role_default_scopes={
            'STUDENT': (),
            'MENTOR': ('MENTEES',),
            'DEPT_MANAGER': ('DEPARTMENT',),
            'TEAM_MANAGER': ('ALL',),
            'ADMIN': ('ALL',),
        },
        scope_aware_permissions=('analytics.view',),
        system_managed_codes=(
            'dashboard.student.view',
            'dashboard.mentor.view',
            'dashboard.team_manager.view',
            'dashboard.admin.view',
        ),
    ),
)
