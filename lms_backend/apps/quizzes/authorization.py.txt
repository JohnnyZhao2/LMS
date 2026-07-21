from apps.authorization.decisions import conditional_allow, conditional_deny
from apps.authorization.owner_scope import filter_queryset_by_owner_scope, is_owner_in_scope
from apps.authorization.registry import (
    ResourceAuthorizationHandler,
    ScopeFilterHandler,
    crud_authorization_spec,
    scope_rules,
)

from .models import Quiz


QUIZ_OWNER_CONSTRAINT = 'quiz_owner'
QUIZ_OWNER_SUMMARY = '仅自己创建，管理员全局'
QUIZ_RESOURCE_SCOPE_GROUP = 'quiz_resource_scope'
QUIZ_SCOPED_ACTIONS = ('view', 'update', 'delete')
QUIZ_SCOPED_PERMISSION_CODES = tuple(f'quiz.{action}' for action in QUIZ_SCOPED_ACTIONS)


def _authorize_quiz_resource(engine, permission_code, *, resource=None, context=None, error_message=None):
    if not isinstance(resource, Quiz):
        return None

    base_decision = engine.base_permission_decision(permission_code, error_message=error_message)
    if not base_decision.allowed:
        return base_decision

    if is_owner_in_scope(engine, permission_code, resource.created_by_id):
        return conditional_allow(permission_code, constraint=QUIZ_OWNER_CONSTRAINT)

    message = error_message or '无权访问此试卷'
    if permission_code in {'quiz.update', 'quiz.delete'}:
        message = error_message or '无权操作此试卷'
    return conditional_deny(
        permission_code,
        message=message,
        reason='resource_constraint',
        constraint=QUIZ_OWNER_CONSTRAINT,
    )


def _filter_quiz_queryset(engine, *, queryset, context=None):
    return filter_queryset_by_owner_scope(engine, 'quiz.view', queryset)


AUTHORIZATION_SPECS = (
    crud_authorization_spec(
        'quizzes.permissions',
        'quiz',
        'quiz',
        '试卷',
        full_roles=('MENTOR', 'DEPT_MANAGER', 'ADMIN'),
        kwargs_by_action={
            action: {
                'scope_group_key': QUIZ_RESOURCE_SCOPE_GROUP,
                'allowed_scope_types': ('SELF', 'ALL'),
            }
            for action in QUIZ_SCOPED_ACTIONS
        },
        scope_rules=tuple(
            rule
            for permission_code in QUIZ_SCOPED_PERMISSION_CODES
            for rule in scope_rules(
                permission_code,
                MENTOR='SELF',
                DEPT_MANAGER='SELF',
                ADMIN='ALL',
            )
        ),
        resource_authorization_handlers=(
            ResourceAuthorizationHandler(
                key='quizzes.resource_decisions',
                permission_codes=QUIZ_SCOPED_PERMISSION_CODES,
                authorize=_authorize_quiz_resource,
                constraint_summaries={
                    'quiz.view': QUIZ_OWNER_SUMMARY,
                    'quiz.update': QUIZ_OWNER_SUMMARY,
                    'quiz.delete': QUIZ_OWNER_SUMMARY,
                },
            ),
        ),
        scope_filter_handlers=(
            ScopeFilterHandler(
                key='quizzes.scope_filter.quiz_view',
                permission_code='quiz.view',
                resource_model=Quiz,
                filter_queryset=_filter_quiz_queryset,
                constraint_summary=QUIZ_OWNER_SUMMARY,
            ),
        ),
    ),
)
