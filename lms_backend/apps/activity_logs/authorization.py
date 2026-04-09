"""Activity log owned permission specs."""

from apps.authorization.registry import AuthorizationSpec, PermissionDefinition


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='activity_logs.config',
        module='config',
        permissions=(
            PermissionDefinition(
                code='activity_log.view',
                name='查看活动日志',
                description='查看用户日志、内容日志和操作日志',
            ),
            PermissionDefinition(
                code='activity_log.policy.update',
                name='更新日志策略',
                description='更新活动日志记录策略',
            ),
        ),
        system_managed_codes=(
            'activity_log.policy.update',
        ),
    ),
)
