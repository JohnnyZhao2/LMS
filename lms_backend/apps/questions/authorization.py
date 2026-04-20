from apps.authorization.registry import crud_authorization_spec


AUTHORIZATION_SPECS = (
    crud_authorization_spec(
        'questions.permissions',
        'question',
        'question',
        '题目',
        full_roles=('MENTOR', 'DEPT_MANAGER', 'ADMIN'),
    ),
)
