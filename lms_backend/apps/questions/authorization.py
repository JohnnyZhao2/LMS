from apps.authorization.decisions import conditional_allow, conditional_deny
from apps.authorization.owner_scope import filter_queryset_by_owner_scope, is_owner_in_scope
from apps.authorization.registry import (
    ResourceAuthorizationHandler,
    ScopeFilterHandler,
    crud_authorization_spec,
    scope_rules,
)

from .models import Question


QUESTION_OWNER_CONSTRAINT = 'question_owner'
QUESTION_OWNER_SUMMARY = '仅自己创建，管理员全局'
QUESTION_RESOURCE_SCOPE_GROUP = 'question_resource_scope'
QUESTION_SCOPED_ACTIONS = ('view', 'update', 'delete')
QUESTION_SCOPED_PERMISSION_CODES = tuple(f'question.{action}' for action in QUESTION_SCOPED_ACTIONS)


def _authorize_question_resource(engine, permission_code, *, resource=None, context=None, error_message=None):
    if not isinstance(resource, Question):
        return None

    base_decision = engine.base_permission_decision(permission_code, error_message=error_message)
    if not base_decision.allowed:
        return base_decision

    if is_owner_in_scope(engine, permission_code, resource.created_by_id):
        return conditional_allow(permission_code, constraint=QUESTION_OWNER_CONSTRAINT)

    message = error_message or '无权访问此题目'
    if permission_code in {'question.update', 'question.delete'}:
        message = error_message or '无权操作此题目'
    return conditional_deny(
        permission_code,
        message=message,
        reason='resource_constraint',
        constraint=QUESTION_OWNER_CONSTRAINT,
    )


def _filter_question_queryset(engine, *, queryset, context=None):
    return filter_queryset_by_owner_scope(engine, 'question.view', queryset)


AUTHORIZATION_SPECS = (
    crud_authorization_spec(
        'questions.permissions',
        'question',
        'question',
        '题目',
        full_roles=('MENTOR', 'DEPT_MANAGER', 'ADMIN'),
        kwargs_by_action={
            action: {
                'scope_group_key': QUESTION_RESOURCE_SCOPE_GROUP,
                'allowed_scope_types': ('SELF', 'ALL'),
            }
            for action in QUESTION_SCOPED_ACTIONS
        },
        scope_rules=tuple(
            rule
            for permission_code in QUESTION_SCOPED_PERMISSION_CODES
            for rule in scope_rules(
                permission_code,
                MENTOR='SELF',
                DEPT_MANAGER='SELF',
                ADMIN='ALL',
            )
        ),
        resource_authorization_handlers=(
            ResourceAuthorizationHandler(
                key='questions.resource_decisions',
                permission_codes=QUESTION_SCOPED_PERMISSION_CODES,
                authorize=_authorize_question_resource,
                constraint_summaries={
                    'question.view': QUESTION_OWNER_SUMMARY,
                    'question.update': QUESTION_OWNER_SUMMARY,
                    'question.delete': QUESTION_OWNER_SUMMARY,
                },
            ),
        ),
        scope_filter_handlers=(
            ScopeFilterHandler(
                key='questions.scope_filter.question_view',
                permission_code='question.view',
                resource_model=Question,
                filter_queryset=_filter_question_queryset,
                constraint_summary=QUESTION_OWNER_SUMMARY,
            ),
        ),
    ),
)
