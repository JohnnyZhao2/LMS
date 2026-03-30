"""Spot check owned permission specs."""

from apps.authorization.registry import AuthorizationSpec, PermissionDefinition


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='spot_checks.permissions',
        module='spot_check',
        permissions=(
            PermissionDefinition(
                code='spot_check.view',
                name='查看抽查',
                description='查看抽查记录列表和详情',
            ),
            PermissionDefinition(
                code='spot_check.create',
                name='创建抽查',
                description='创建抽查记录',
            ),
            PermissionDefinition(
                code='spot_check.update',
                name='更新抽查',
                description='编辑抽查记录',
            ),
            PermissionDefinition(
                code='spot_check.delete',
                name='删除抽查',
                description='删除抽查记录',
            ),
        ),
        role_defaults={
            'MENTOR': ('spot_check.view', 'spot_check.create', 'spot_check.update', 'spot_check.delete'),
            'DEPT_MANAGER': ('spot_check.view', 'spot_check.create', 'spot_check.update', 'spot_check.delete'),
        },
        scope_aware_permissions=('spot_check.view', 'spot_check.create'),
    ),
)
