from apps.authorization.registry import crud_authorization_spec, permission_codes


TAG_MENTOR_CODES = permission_codes('tag', 'view', 'create')


AUTHORIZATION_SPECS = (
    crud_authorization_spec(
        'tags.permissions',
        'tag',
        'tag',
        '标签',
        full_roles=('DEPT_MANAGER', 'ADMIN'),
        extra_role_defaults={'MENTOR': TAG_MENTOR_CODES},
    ),
)
