from apps.authorization.registry import crud_authorization_spec


AUTHORIZATION_SPECS = (
    crud_authorization_spec(
        'knowledge.permissions',
        'knowledge',
        'knowledge',
        '知识',
        view_roles=('STUDENT', 'TEAM_MANAGER'),
        full_roles=('DEPT_MANAGER', 'ADMIN'),
    ),
)
