from apps.authorization.decisions import AuthorizationDecision
from apps.authorization.registry import (
    AuthorizationSpec,
    ResourceAuthorizationHandler,
    crud_permissions,
)


def _authorize_knowledge(engine, permission_code, *, resource=None, context=None, error_message=None):
    del resource, context, error_message
    # 学员工作台：看知识是角色自带，不参与授权配置
    if permission_code == 'knowledge.view_knowledge' and engine.get_current_role() == 'STUDENT':
        return AuthorizationDecision.allow(permission_code, reason='student_builtin')
    return None


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='knowledge.permissions',
        module='knowledge',
        permissions=crud_permissions('knowledge', 'knowledge'),
        resource_authorization_handlers=(
            ResourceAuthorizationHandler(
                key='knowledge.resource_decisions',
                permission_codes=('knowledge.view_knowledge',),
                authorize=_authorize_knowledge,
            ),
        ),
    ),
)
