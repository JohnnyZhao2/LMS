from apps.authorization.decisions import conditional_allow, conditional_deny
from apps.authorization.owner_scope import filter_queryset_by_owner_scope, is_owner_in_scope
from apps.authorization.registry import (
    ResourceAuthorizationHandler,
    ScopeFilterHandler,
    crud_authorization_spec,
)

from .models import Question


QUESTION_OWNER_CONSTRAINT = 'question_owner'
QUESTION_SCOPED_PERMISSION_CODES = (
    'questions.view_question',
    'questions.change_question',
    'questions.delete_question',
)


def _authorize_question_resource(engine, permission_code, *, resource=None, context=None, error_message=None):
    if not isinstance(resource, Question):
        return None

    base_decision = engine.base_permission_decision(permission_code, error_message=error_message)
    if not base_decision.allowed:
        return base_decision

    if is_owner_in_scope(engine, resource.created_by_id):
        return conditional_allow(permission_code, constraint=QUESTION_OWNER_CONSTRAINT)

    message = error_message or '无权访问此题目'
    if permission_code in {'questions.change_question', 'questions.delete_question'}:
        message = error_message or '无权操作此题目'
    return conditional_deny(
        permission_code,
        message=message,
        reason='resource_constraint',
        constraint=QUESTION_OWNER_CONSTRAINT,
    )


def _filter_question_queryset(engine, *, queryset, context=None):
    return filter_queryset_by_owner_scope(engine, queryset)


AUTHORIZATION_SPECS = (
    crud_authorization_spec(
        'questions.permissions',
        'question',
        'questions',
        'question',
        resource_authorization_handlers=(
            ResourceAuthorizationHandler(
                key='questions.resource_decisions',
                permission_codes=QUESTION_SCOPED_PERMISSION_CODES,
                authorize=_authorize_question_resource,
            ),
        ),
        scope_filter_handlers=(
            ScopeFilterHandler(
                key='questions.scope_filter.question_view',
                permission_code='questions.view_question',
                resource_model=Question,
                filter_queryset=_filter_question_queryset,
            ),
        ),
    ),
)
