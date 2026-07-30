from apps.authorization.decisions import conditional_allow, conditional_deny
from apps.authorization.owner_scope import filter_owned_queryset, is_owned_by_user
from apps.authorization.registry import (
    ResourceAuthorizationHandler,
    ScopeFilterHandler,
    crud_authorization_spec,
)

from .models import Quiz


QUIZ_CODES = ('quiz.view', 'quiz.update', 'quiz.delete')
OWNER_SUMMARY = '仅自己创建'


def _authorize(engine, permission_code, *, resource=None, error_message=None):
    if not isinstance(resource, Quiz):
        return None
    if is_owned_by_user(resource, engine.user):
        return conditional_allow(permission_code, constraint='resource_owner')
    return conditional_deny(
        permission_code,
        message=error_message or '无权操作此试卷',
        reason='resource_constraint',
        constraint='resource_owner',
    )


AUTHORIZATION_SPECS = (
    crud_authorization_spec(
        'quiz',
        'quiz',
        '试卷',
        resource_authorization_handlers=(
            ResourceAuthorizationHandler(
                key='quizzes.resource_owner',
                permission_codes=QUIZ_CODES,
                authorize=_authorize,
                constraint_summaries={code: OWNER_SUMMARY for code in QUIZ_CODES},
            ),
        ),
        scope_filter_handlers=(
            ScopeFilterHandler(
                key='quizzes.view.owner',
                permission_code='quiz.view',
                resource_model=Quiz,
                filter_queryset=lambda engine, *, queryset: filter_owned_queryset(
                    queryset, engine.user
                ),
                constraint_summary=OWNER_SUMMARY,
            ),
        ),
    ),
)
