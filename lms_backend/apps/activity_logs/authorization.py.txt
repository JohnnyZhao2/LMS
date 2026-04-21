from apps.authorization.registry import AuthorizationSpec, perm


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='activity_logs.log_management',
        module='log_management',
        permissions=(
            perm(
                code='activity_log.view',
                name='查看活动日志',
                description='查看用户日志、内容日志和操作日志',
            ),
            perm(
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
