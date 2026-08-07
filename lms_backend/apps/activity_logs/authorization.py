from apps.authorization.registry import AuthorizationSpec, perm


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='activity_logs.log_management',
        module='log_management',
        permissions=(
            perm(
                code='activity_logs.view_activitylog',
            ),
            perm(
                code='activity_logs.change_activitylogpolicy',
            ),
        ),
    ),
)
