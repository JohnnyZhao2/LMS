"""Activity log decorators."""

import inspect
import time
from copy import deepcopy
from functools import wraps
from typing import Any, Callable, Optional

from core.audit import audit_content_action, audit_operation, audit_user_action

from .registry import (
    register_content_log_action,
    register_operation_log_action,
    register_user_log_action,
)


ROLE_LABELS = {
    'ADMIN': '管理员',
    'MENTOR': '导师',
    'DEPT_MANAGER': '室经理',
    'TEAM_MANAGER': '团队经理',
    'STUDENT': '学员',
    'SUPER_ADMIN': '超管',
}

EFFECT_LABELS = {
    'ALLOW': '允许',
    'DENY': '拒绝',
}

SCOPE_TYPE_LABELS = {
    'ALL': '全部对象',
    'SELF': '本人',
    'MENTEES': '我的学员',
    'DEPARTMENT': '本部门',
    'EXPLICIT_USERS': '指定用户',
}

SUBMISSION_STATUS_DETAILS = {
    'IN_PROGRESS': '仍在作答中',
    'SUBMITTED': '已提交',
    'GRADING': '已提交，待人工评分',
    'GRADED': '已提交，已完成评分',
}


def _format_datetime(value: Any) -> str:
    if value is None or not hasattr(value, 'strftime'):
        return ''
    return value.strftime('%Y-%m-%d %H:%M')


def _format_number(value: Any) -> str:
    if value is None:
        return '0'
    text = str(value)
    if '.' in text:
        text = text.rstrip('0').rstrip('.')
    return text


def _build_user_label(user: Any) -> str:
    if user is None:
        return '未知用户'

    username = getattr(user, 'username', None)
    employee_id = getattr(user, 'employee_id', None)

    if username and employee_id:
        return f'{username}（{employee_id}）'
    return username or employee_id or '未知用户'


def _build_task_update_summary(template_vars: dict[str, Any]) -> str:
    parts = []

    if 'title' in template_vars:
        parts.append('任务标题')
    if 'description' in template_vars:
        parts.append('任务说明')
    if 'deadline' in template_vars:
        parts.append(f'截止时间调整为 {template_vars.get("deadline_text")}')
    if template_vars.get('knowledge_ids') is not None:
        parts.append(f'关联知识调整为 {template_vars.get("knowledge_count", 0)} 篇')
    if template_vars.get('quiz_ids') is not None:
        parts.append(f'关联试卷调整为 {template_vars.get("quiz_count", 0)} 份')
    if template_vars.get('assignee_ids') is not None:
        parts.append(f'分配学员调整为 {template_vars.get("assignee_count", 0)} 名')

    return '；'.join(parts) if parts else '任务配置已调整'


def _resolve_operator(self: Any, kwargs: dict[str, Any]) -> Any:
    explicit_operator = kwargs.get('operator') or kwargs.get('assigned_by')
    if explicit_operator is not None:
        return explicit_operator

    request = getattr(self, 'request', None)
    request_user = getattr(request, 'user', None)
    if request_user is not None and getattr(request_user, 'is_authenticated', False):
        return request_user
    return getattr(self, 'user', None)


def _snapshot_for_logging(value: Any) -> Any:
    try:
        return deepcopy(value)
    except Exception:
        return value


def _build_question_update_summary(template_vars: dict[str, Any]) -> str:
    payload = template_vars.get('data')
    if not isinstance(payload, dict):
        return '更新了题目信息'

    field_labels = {
        'content': '题干',
        'question_type': '题型',
        'options': '选项',
        'answer': '答案',
        'explanation': '解析',
        'score': '分值',
        'space_tag_id': '所属空间',
    }

    changed_fields = [field_labels[key] for key in field_labels if key in payload]

    if 'tag_ids' in payload:
        tag_count = len(payload.get('tag_ids') or [])
        changed_fields.append(f'标签（{tag_count} 个）')

    if not changed_fields:
        return '更新了题目信息'

    return f'更新了{"、".join(changed_fields)}'


def _augment_template_vars(template_vars: dict[str, Any]) -> None:
    deadline = template_vars.get('deadline')
    if deadline is not None:
        template_vars['deadline_text'] = _format_datetime(deadline)

    role_code = template_vars.get('role_code')
    if role_code:
        template_vars['role_label'] = ROLE_LABELS.get(role_code, role_code)
    applies_to_role = template_vars.get('applies_to_role')
    if applies_to_role:
        template_vars['applies_to_role_label'] = ROLE_LABELS.get(applies_to_role, applies_to_role)
    effect = template_vars.get('effect')
    if effect:
        template_vars['effect_label'] = EFFECT_LABELS.get(effect, effect)
    scope_type = template_vars.get('scope_type')
    if scope_type:
        template_vars['scope_type_label'] = SCOPE_TYPE_LABELS.get(scope_type, scope_type)

    for field_name, count_name in (
        ('knowledge_ids', 'knowledge_count'),
        ('quiz_ids', 'quiz_count'),
        ('assignee_ids', 'assignee_count'),
        ('question_ids', 'input_question_count'),
        ('permission_codes', 'permission_count'),
        ('scope_user_ids', 'scope_user_count'),
        ('source_tag_ids', 'source_tag_count'),
        ('ordered_tag_ids', 'ordered_tag_count'),
    ):
        field_value = template_vars.get(field_name)
        if field_value is not None:
            template_vars[count_name] = len(field_value)

    template_vars['task_update_summary'] = _build_task_update_summary(template_vars)

    result = template_vars.get('result')
    if result is None:
        return

    if hasattr(result, 'title'):
        template_vars['resource_title'] = result.title
    if hasattr(result, 'name'):
        template_vars['resource_title'] = result.name
    if hasattr(result, 'revision_number'):
        template_vars['revision_number'] = result.revision_number
    if hasattr(result, 'score'):
        template_vars['score_text'] = _format_number(result.score)
    if hasattr(result, 'max_score'):
        template_vars['max_score_text'] = _format_number(result.max_score)
    if hasattr(result, 'average_score'):
        template_vars['average_score_text'] = _format_number(result.average_score)
    if hasattr(result, 'total_score'):
        template_vars['total_score_text'] = _format_number(result.total_score)
    if hasattr(result, 'obtained_score'):
        template_vars['obtained_score_text'] = _format_number(result.obtained_score)
    if hasattr(result, 'pass_score') and result.pass_score is not None:
        template_vars['pass_score_text'] = _format_number(result.pass_score)
    if hasattr(result, 'duration') and result.duration:
        template_vars['duration_text'] = f'{result.duration} 分钟'
    if hasattr(result, 'question_count'):
        template_vars['question_count'] = result.question_count
    if hasattr(result, 'objective_question_count'):
        template_vars['objective_question_count'] = result.objective_question_count
    if hasattr(result, 'subjective_question_count'):
        template_vars['subjective_question_count'] = result.subjective_question_count
    if hasattr(result, 'attempt_number'):
        template_vars['attempt_number'] = result.attempt_number
    if hasattr(result, 'content'):
        content_text = str(result.content or '').strip().replace('\n', ' ')
        template_vars['content_preview'] = content_text[:24] + ('...' if len(content_text) > 24 else '')
    if hasattr(result, 'topic_summary'):
        topic_summary = str(result.topic_summary or '').strip().replace('\n', ' ')
        template_vars['topic_summary_preview'] = (
            topic_summary[:24] + ('...' if len(topic_summary) > 24 else '')
        )
    if hasattr(result, 'student'):
        template_vars['student_label'] = _build_user_label(result.student)
    if hasattr(result, 'checker'):
        template_vars['checker_label'] = _build_user_label(result.checker)
    if hasattr(result, 'get_question_type_display'):
        template_vars['question_type_label'] = result.get_question_type_display()
        question_id = getattr(result, 'id', None)
        content_preview = template_vars.get('content_preview', '')
        if question_id:
            if content_preview:
                template_vars['question_identity'] = f'题目#{question_id}（{content_preview}）'
            else:
                template_vars['question_identity'] = f'题目#{question_id}'
        template_vars['question_update_summary'] = _build_question_update_summary(template_vars)
    if hasattr(result, 'get_quiz_type_display'):
        template_vars['quiz_type_label'] = result.get_quiz_type_display()
    if hasattr(result, 'get_tag_type_display'):
        template_vars['tag_type_label'] = result.get_tag_type_display()
    if hasattr(result, 'quiz') and result.quiz is not None:
        template_vars['quiz_title'] = result.quiz.title
        if hasattr(result.quiz, 'get_quiz_type_display'):
            template_vars['quiz_type_label'] = result.quiz.get_quiz_type_display()
    if hasattr(result, 'submission') and result.submission is not None:
        submission = result.submission
        if getattr(submission, 'quiz', None) is not None:
            template_vars['quiz_title'] = submission.quiz.title
            if hasattr(submission.quiz, 'get_quiz_type_display'):
                template_vars['quiz_type_label'] = submission.quiz.get_quiz_type_display()
        assignment = getattr(submission, 'task_assignment', None)
        if assignment is not None:
            task = getattr(assignment, 'task', None)
            if task is not None:
                template_vars['task_title'] = task.title
            student = getattr(assignment, 'assignee', None)
            if student is not None:
                template_vars['student_label'] = _build_user_label(student)
    if hasattr(result, 'task_assignment') and result.task_assignment is not None:
        task = getattr(result.task_assignment, 'task', None)
        if task is not None:
            template_vars['task_title'] = task.title
    if hasattr(result, 'assignment') and result.assignment is not None:
        task = getattr(result.assignment, 'task', None)
        if task is not None:
            template_vars['task_title'] = task.title
    if hasattr(result, 'status'):
        if hasattr(result, 'get_status_display'):
            template_vars['status_display'] = result.get_status_display()
        template_vars['submission_status_detail'] = SUBMISSION_STATUS_DETAILS.get(
            result.status,
            result.status,
        )


def _build_template_vars(
    func: Callable,
    self: Any,
    args: tuple[Any, ...],
    kwargs: dict[str, Any],
    result: Any,
) -> dict[str, Any]:
    template_vars = {
        'result': result,
        'self': self,
    }

    sig = inspect.signature(func)
    param_names = list(sig.parameters.keys())[1:]
    for index, param_name in enumerate(param_names):
        if index < len(args):
            template_vars[param_name] = args[index]

    template_vars.update(kwargs)
    _augment_template_vars(template_vars)
    return template_vars


def log_user_action(
    action: str,
    description_template: Optional[str] = None,
    action_key: Optional[str] = None,
    *,
    group: str,
    label: str,
    default_enabled: bool = True,
):
    register_user_log_action(
        action,
        group=group,
        label=label,
        action_key=action_key,
        default_enabled=default_enabled,
    )

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            result = func(self, *args, **kwargs)

            if description_template:
                template_vars = _build_template_vars(func, self, args, kwargs, result)
                description = description_template.format(**template_vars)
            else:
                description = f'{action} 操作'

            user = (
                result
                if hasattr(result, 'employee_id')
                else (kwargs.get('user') or (args[0] if args else None))
            )
            operator = _resolve_operator(self, kwargs)

            audit_user_action(
                user=user,
                operator=operator,
                action=action,
                description=description,
                status='success',
                action_key=action_key,
            )

            return result
        return wrapper
    return decorator


def log_content_action(
    content_type: str,
    action: str,
    description_template: Optional[str] = None,
    action_key: Optional[str] = None,
    *,
    group: str,
    label: str,
    default_enabled: bool = True,
):
    register_content_log_action(
        content_type,
        action,
        group=group,
        label=label,
        action_key=action_key,
        default_enabled=default_enabled,
    )

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            template_args = _snapshot_for_logging(args)
            template_kwargs = _snapshot_for_logging(kwargs)
            result = func(self, *args, **kwargs)

            if description_template:
                template_vars = _build_template_vars(func, self, template_args, template_kwargs, result)
                description = description_template.format(**template_vars)
            else:
                description = f'{action} {content_type}'

            content_id = str(result.id) if hasattr(result, 'id') else 'unknown'
            content_title = (
                getattr(result, 'title', None)
                or getattr(result, 'name', None)
                or getattr(result, 'content', '')[:50]
                or '内容'
            )

            audit_content_action(
                content_type=content_type,
                content_id=content_id,
                content_title=content_title,
                operator=_resolve_operator(self, kwargs),
                action=action,
                description=description,
                status='success',
                action_key=action_key,
            )

            return result
        return wrapper
    return decorator


def log_operation(
    operation_type: str,
    action: str,
    description_template: Optional[str] = None,
    measure_duration: bool = False,
    action_key: Optional[str] = None,
    target_type: str = '',
    target_title_template: str = '',
    *,
    group: str,
    label: str,
    default_enabled: bool = True,
):
    register_operation_log_action(
        operation_type,
        action,
        group=group,
        label=label,
        action_key=action_key,
        default_enabled=default_enabled,
    )

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            start_time = time.time() if measure_duration else None
            result = func(self, *args, **kwargs)
            duration = int((time.time() - start_time) * 1000) if measure_duration else 0

            template_vars = _build_template_vars(func, self, args, kwargs, result)
            if description_template:
                description = description_template.format(**template_vars)
            else:
                description = f'{action} 操作'

            resolved_target_title = ''
            resolved_target_id = ''
            if target_title_template:
                resolved_target_title = target_title_template.format(**template_vars)
            if result is not None and hasattr(result, 'id'):
                resolved_target_id = str(result.id)

            audit_operation(
                operator=_resolve_operator(self, kwargs),
                operation_type=operation_type,
                action=action,
                description=description,
                duration=duration,
                status='success',
                action_key=action_key,
                target_type=target_type,
                target_id=resolved_target_id,
                target_title=resolved_target_title,
            )

            return result
        return wrapper
    return decorator
