from apps.authorization.registry import crud_authorization_spec


AUTHORIZATION_SPECS = (
    crud_authorization_spec(
        'tag',
        'tag',
        '标签',
    ),
)
