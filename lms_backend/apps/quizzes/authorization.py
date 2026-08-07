from apps.authorization.decisions import conditional_allow, conditional_deny
from apps.authorization.owner_scope import filter_queryset_by_owner_scope, is_owner_in_scope
from apps.authorization.registry import (
    ResourceAuthorizationHandler,
    ScopeFilterHandler,
    crud_authorization_spec,
)

from .models import Quiz


QUIZ_OWNER_CONSTRAINT = 'quiz_owner'
QUIZ_SCOPED_PERMISSION_CODES = (
    'quizzes.view_quiz',
    'quizzes.change_quiz',
    'quizzes.delete_quiz',
)


def _authorize_quiz_resource(engine, permission_code, *, resource=None, context=None, error_message=None):
    if not isinstance(resource, Quiz):
        return None

    base_decision = engine.base_permission_decision(permission_code, error_message=error_message)
    if not base_decision.allowed:
        return base_decision

    if is_owner_in_scope(engine, resource.created_by_id):
        return conditional_allow(permission_code, constraint=QUIZ_OWNER_CONSTRAINT)

    message = error_message or '无权访问此试卷'
    if permission_code in {'quizzes.change_quiz', 'quizzes.delete_quiz'}:
        message = error_message or '无权操作此试卷'
    return conditional_deny(
        permission_code,
        message=message,
        reason='resource_constraint',
        constraint=QUIZ_OWNER_CONSTRAINT,
    )


def _filter_quiz_queryset(engine, *, queryset, context=None):
    return filter_queryset_by_owner_scope(engine, queryset)


AUTHORIZATION_SPECS = (
    crud_authorization_spec(
        'quizzes.permissions',
        'quiz',
        'quizzes',
        'quiz',
        resource_authorization_handlers=(
            ResourceAuthorizationHandler(
                key='quizzes.resource_decisions',
                permission_codes=QUIZ_SCOPED_PERMISSION_CODES,
                authorize=_authorize_quiz_resource,
            ),
        ),
        scope_filter_handlers=(
            ScopeFilterHandler(
                key='quizzes.scope_filter.quiz_view',
                permission_code='quizzes.view_quiz',
                resource_model=Quiz,
                filter_queryset=_filter_quiz_queryset,
            ),
        ),
    ),
)
