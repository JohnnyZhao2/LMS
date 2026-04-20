from apps.authorization.registry import AuthorizationSpec, perm


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='submissions.system_permissions',
        module='submission',
        permissions=(
            perm(
                code='submission.answer',
                name='答题提交',
                description='参与测验或考试并提交答案',
            ),
            perm(
                code='submission.review',
                name='查看答题结果',
                description='查看作答结果和详情',
            ),
        ),
        system_managed_codes=('submission.answer', 'submission.review'),
        role_system_defaults={
            'STUDENT': ('submission.answer', 'submission.review'),
        },
    ),
)
