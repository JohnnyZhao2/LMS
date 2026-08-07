from apps.authorization.registry import AuthorizationSpec, perm


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='grading.permissions',
        module='grading',
        permissions=(
            perm(
                code='tasks.view_grading',
                implies=('tasks.view_task',),
            ),
            perm(
                code='tasks.score_grading',
                implies=('tasks.view_grading',),
            ),
        ),
    ),
)
