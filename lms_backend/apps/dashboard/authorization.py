"""Dashboard owned permission specs."""

from apps.authorization.registry import (
    AuthorizationSpec,
    PermissionDefinition,
    PermissionScopeRuleDefinition,
    ScopeFilterHandler,
)
from apps.users.models import User


ANALYTICS_SCOPE_SUMMARY = '默认按学员范围生效，可通过用户授权按学员范围增删。'


def _filter_dashboard_students(engine, *, queryset, context=None):
    return engine.get_scoped_learning_members('analytics.view')


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
        scope_rules=(
            PermissionScopeRuleDefinition('analytics.view', 'MENTOR', 'MENTEES'),
            PermissionScopeRuleDefinition('analytics.view', 'DEPT_MANAGER', 'DEPARTMENT'),
            PermissionScopeRuleDefinition('analytics.view', 'TEAM_MANAGER', 'ALL'),
            PermissionScopeRuleDefinition('analytics.view', 'ADMIN', 'ALL'),
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
        scope_filter_handlers=(
            ScopeFilterHandler(
                key='dashboard.scope_filter.analytics_students',
                permission_code='analytics.view',
                resource_model=User,
                filter_queryset=_filter_dashboard_students,
                constraint_summary=ANALYTICS_SCOPE_SUMMARY,
            ),
        ),
    ),
)
