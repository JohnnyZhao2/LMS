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
                is_configurable=False,
                required_role_codes=('STUDENT',),
            ),
            perm(
                code='submission.review',
                name='查看答题结果',
                description='查看作答结果和详情',
                is_configurable=False,
                required_role_codes=('STUDENT',),
            ),
        ),
    ),
)
