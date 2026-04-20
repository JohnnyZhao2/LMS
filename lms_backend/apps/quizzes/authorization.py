from apps.authorization.registry import crud_authorization_spec


AUTHORIZATION_SPECS = (
    crud_authorization_spec(
        'quizzes.permissions',
        'quiz',
        'quiz',
        '试卷',
        full_roles=('MENTOR', 'DEPT_MANAGER', 'ADMIN'),
    ),
)
