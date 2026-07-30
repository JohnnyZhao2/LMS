from apps.authorization.decisions import conditional_allow, conditional_deny
from apps.authorization.owner_scope import filter_owned_queryset, is_owned_by_user
from apps.authorization.registry import (
    ResourceAuthorizationHandler,
    ScopeFilterHandler,
    crud_authorization_spec,
)

from .models import Question


QUESTION_CODES = ('question.view', 'question.update', 'question.delete')
OWNER_SUMMARY = '仅自己创建'


def _authorize(engine, permission_code, *, resource=None, error_message=None):
    if not isinstance(resource, Question):
        return None
    if is_owned_by_user(resource, engine.user):
        return conditional_allow(permission_code, constraint='resource_owner')
    return conditional_deny(
        permission_code,
        message=error_message or '无权操作此题目',
        reason='resource_constraint',
        constraint='resource_owner',
    )


AUTHORIZATION_SPECS = (
    crud_authorization_spec(
        'question',
        'question',
        '题目',
        resource_authorization_handlers=(
            ResourceAuthorizationHandler(
                key='questions.resource_owner',
                permission_codes=QUESTION_CODES,
                authorize=_authorize,
                constraint_summaries={code: OWNER_SUMMARY for code in QUESTION_CODES},
            ),
        ),
        scope_filter_handlers=(
            ScopeFilterHandler(
                key='questions.view.owner',
                permission_code='question.view',
                resource_model=Question,
                filter_queryset=lambda engine, *, queryset: filter_owned_queryset(
                    queryset, engine.user
                ),
                constraint_summary=OWNER_SUMMARY,
            ),
        ),
    ),
)
