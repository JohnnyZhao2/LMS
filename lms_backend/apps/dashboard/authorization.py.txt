"""Dashboard owned permission specs."""

from apps.authorization.registry import AuthorizationSpec, PermissionDefinition


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='dashboard.system_permissions',
        module='dashboard',
        permissions=(
            PermissionDefinition(
                code='dashboard.team_manager.view',
                name='查看团队经理仪表盘',
                description='访问团队经理看板',
            ),
        ),
        system_managed_codes=(
            'dashboard.student.view',
            'dashboard.mentor.view',
            'dashboard.team_manager.view',
            'dashboard.admin.view',
        ),
        role_system_defaults={
            'STUDENT': ('dashboard.student.view',),
            'MENTOR': ('dashboard.mentor.view',),
            'DEPT_MANAGER': ('dashboard.mentor.view',),
            'TEAM_MANAGER': ('dashboard.team_manager.view',),
            'ADMIN': ('dashboard.admin.view',),
        },
    ),
)
