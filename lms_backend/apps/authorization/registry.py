"""权限依赖与资源策略的显式注册（无插件扫描、无自建 catalog）。"""

from __future__ import annotations

from functools import lru_cache
from typing import Iterable, Optional

# 自定义依赖；写权限 → view 在 expand 时自动补齐
PERMISSION_IMPLIES: dict[str, tuple[str, ...]] = {
    'tasks.assign_task': ('tasks.view_task',),
    'tasks.view_task_analytics': ('tasks.view_task',),
    'tasks.view_grading': ('tasks.view_task',),
    'tasks.score_grading': ('tasks.view_grading',),
    'users.assign_user_role': ('users.view_user',),
    'users.change_user_avatar': ('users.view_user',),
}

# 主业务模型：权限目录可配置 + 写权限自动推 view 共用这一份
ASSIGNABLE_MODEL_BY_APP: dict[str, str] = {
    'tasks': 'task',
    'knowledge': 'knowledge',
    'tags': 'tag',
    'quizzes': 'quiz',
    'questions': 'question',
    'spot_checks': 'spotcheck',
    'users': 'user',
}

# 主模型默认 CRUD 之外、业务真正消费的自定义权限
ASSIGNABLE_CUSTOM_CODES = frozenset({
    'tasks.assign_task',
    'tasks.view_task_analytics',
    'tasks.view_grading',
    'tasks.score_grading',
    'users.assign_user_role',
    'users.change_user_avatar',
    'users.view_user_permission',
    'users.change_user_permission',
    'activity_logs.view_activitylog',
    'activity_logs.change_activitylogpolicy',
})


ASSIGNABLE_PERMISSION_CODES = frozenset(
    {
        *ASSIGNABLE_CUSTOM_CODES,
        *(
            f'{app_label}.{action}_{model}'
            for app_label, model in ASSIGNABLE_MODEL_BY_APP.items()
            for action in ('view', 'add', 'change', 'delete')
        ),
    }
)


def _write_to_view(code: str) -> Optional[str]:
    app, _, codename = code.partition('.')
    if not app or not codename:
        return None
    model = ASSIGNABLE_MODEL_BY_APP.get(app)
    if not model:
        return None
    for prefix in ('add_', 'change_', 'delete_'):
        if codename == f'{prefix}{model}':
            return f'{app}.view_{model}'
    return None


def permission_implies(code: str) -> list[str]:
    """单码直接依赖（含写→view），供 catalog API / 前端联动。"""
    result: list[str] = list(PERMISSION_IMPLIES.get(code, ()))
    view_code = _write_to_view(code)
    if view_code and view_code not in result:
        result.append(view_code)
    return result


def expand_permission_codes(permission_codes: Iterable[str]) -> list[str]:
    """保存时补齐依赖权限。"""
    expanded: list[str] = []
    seen: set[str] = set()
    pending = [code for code in permission_codes if code]
    while pending:
        code = pending.pop()
        if code in seen:
            continue
        seen.add(code)
        expanded.append(code)
        pending.extend(permission_implies(code))
    return expanded


# ---------------------------------------------------------------------------
# 资源 / 范围策略：permission_code（+ model）→ 函数
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _resource_authorizers() -> dict:
    from functools import partial

    from apps.authorization.owner_scope import authorize_owned_resource
    from apps.questions.models import Question
    from apps.quizzes.models import Quiz
    from apps.spot_checks.authorization import authorize_spot_check
    from apps.tasks.authorization import authorize_task_resource
    from apps.users.authorization import authorize_user_resource

    mapping = {}
    for code in (
        'tasks.view_task',
        'tasks.change_task',
        'tasks.delete_task',
        'tasks.view_task_analytics',
        'tasks.view_grading',
        'tasks.score_grading',
    ):
        mapping[code] = authorize_task_resource
    for code in (
        'users.view_user',
        'users.change_user',
        'users.delete_user',
        'users.assign_user_role',
        'users.change_user_avatar',
        'users.view_user_permission',
        'users.change_user_permission',
    ):
        mapping[code] = authorize_user_resource
    authorize_question = partial(
        authorize_owned_resource,
        resource_model=Question,
        write_codes=frozenset({'questions.change_question', 'questions.delete_question'}),
        write_message='无权操作此题目',
        read_message='无权访问此题目',
    )
    for code in (
        'questions.view_question',
        'questions.change_question',
        'questions.delete_question',
    ):
        mapping[code] = authorize_question
    authorize_quiz = partial(
        authorize_owned_resource,
        resource_model=Quiz,
        write_codes=frozenset({'quizzes.change_quiz', 'quizzes.delete_quiz'}),
        write_message='无权操作此试卷',
        read_message='无权访问此试卷',
    )
    for code in (
        'quizzes.view_quiz',
        'quizzes.change_quiz',
        'quizzes.delete_quiz',
    ):
        mapping[code] = authorize_quiz
    for code in (
        'spot_checks.view_spotcheck',
        'spot_checks.add_spotcheck',
        'spot_checks.change_spotcheck',
        'spot_checks.delete_spotcheck',
    ):
        mapping[code] = authorize_spot_check
    return mapping


@lru_cache(maxsize=1)
def _scope_filters() -> dict:
    from apps.authorization.owner_scope import filter_queryset_by_owner_scope
    from apps.questions.models import Question
    from apps.quizzes.models import Quiz
    from apps.spot_checks.authorization import (
        filter_spot_check_queryset,
        filter_writable_spot_check_queryset,
    )
    from apps.spot_checks.models import SpotCheck
    from apps.tasks.authorization import filter_scoped_learning_members
    from apps.tasks.models import Task
    from apps.users.authorization import filter_viewable_users
    from apps.users.models import User

    mapping = {
        ('tasks.assign_task', User): filter_scoped_learning_members,
        ('tasks.view_task_analytics', User): filter_scoped_learning_members,
        ('spot_checks.view_spotcheck', User): filter_scoped_learning_members,
        ('spot_checks.add_spotcheck', User): filter_scoped_learning_members,
        ('spot_checks.view_spotcheck', SpotCheck): filter_spot_check_queryset,
    }
    for code in (
        'tasks.view_task',
        'tasks.view_task_analytics',
        'tasks.view_grading',
        'tasks.score_grading',
        'tasks.change_task',
        'tasks.delete_task',
    ):
        mapping[(code, Task)] = filter_queryset_by_owner_scope
    for code in (
        'users.view_user',
        'users.change_user',
        'users.delete_user',
        'users.assign_user_role',
        'users.change_user_avatar',
        'users.view_user_permission',
        'users.change_user_permission',
    ):
        mapping[(code, User)] = filter_viewable_users
    for code in (
        'questions.view_question',
        'questions.change_question',
        'questions.delete_question',
    ):
        mapping[(code, Question)] = filter_queryset_by_owner_scope
    for code in (
        'quizzes.view_quiz',
        'quizzes.change_quiz',
        'quizzes.delete_quiz',
    ):
        mapping[(code, Quiz)] = filter_queryset_by_owner_scope
    for code in ('spot_checks.change_spotcheck', 'spot_checks.delete_spotcheck'):
        mapping[(code, SpotCheck)] = filter_writable_spot_check_queryset
    return mapping


def get_resource_authorizer(permission_code: str):
    return _resource_authorizers().get(permission_code)


def get_scope_filter(permission_code: str, model):
    return _scope_filters().get((permission_code, model))
