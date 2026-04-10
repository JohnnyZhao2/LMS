"""
日志记录装饰器
用于自动记录业务操作日志
"""
import inspect
import time
from copy import deepcopy
from functools import wraps
from typing import Any, Callable, Optional


ROLE_LABELS = {
    'ADMIN': '管理员',
    'MENTOR': '导师',
    'DEPT_MANAGER': '室经理',
    'TEAM_MANAGER': '团队经理',
    'STUDENT': '学员',
    'SUPER_ADMIN': '超管',
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


def _snapshot_for_logging(value: Any) -> Any:
    """尽量保留调用入参原貌，避免业务函数内部修改影响日志模板变量。"""
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

    for field_name, count_name in (
        ('knowledge_ids', 'knowledge_count'),
        ('quiz_ids', 'quiz_count'),
        ('assignee_ids', 'assignee_count'),
        ('question_ids', 'input_question_count'),
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
    if hasattr(result, 'version_number'):
        template_vars['version_number'] = result.version_number
    if hasattr(result, 'score'):
        template_vars['score_text'] = _format_number(result.score)
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
    if hasattr(result, 'checked_at'):
        template_vars['checked_at_text'] = _format_datetime(result.checked_at)
    if hasattr(result, 'content'):
        content_text = str(result.content or '').strip().replace('\n', ' ')
        template_vars['content_preview'] = content_text[:24] + ('...' if len(content_text) > 24 else '')
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
    if hasattr(result, 'quiz') and result.quiz is not None:
        template_vars['quiz_title'] = result.quiz.title
        if hasattr(result.quiz, 'get_quiz_type_display'):
            template_vars['quiz_type_label'] = result.quiz.get_quiz_type_display()
    if hasattr(result, 'task_assignment') and result.task_assignment is not None:
        task = getattr(result.task_assignment, 'task', None)
        if task is not None:
            template_vars['task_title'] = task.title
    if hasattr(result, 'assignment') and result.assignment is not None:
        task = getattr(result.assignment, 'task', None)
        if task is not None:
            template_vars['task_title'] = task.title
    if hasattr(result, 'status'):
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
    action_key: Optional[str] = None
):
    """
    记录用户日志的装饰器

    Args:
        action: 操作类型 (login, logout, password_change, role_assigned, etc.)
        description_template: 描述模板，可以使用 {变量名} 引用方法参数或返回值
                            例如: "管理员 {operator.employee_id} 为用户 {user.employee_id} 分配了角色"

    使用示例:
        @log_user_action('role_assigned', '管理员 {assigned_by.employee_id} 为用户 {result.employee_id} 分配了角色')
        def assign_roles(self, user_id, role_codes, assigned_by):
            ...
            return user
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            # 执行原方法
            result = func(self, *args, **kwargs)

            # 记录日志
            try:
                from apps.activity_logs.services import ActivityLogService

                # 构建描述
                if description_template:
                    template_vars = _build_template_vars(func, self, args, kwargs, result)
                    description = description_template.format(**template_vars)
                else:
                    description = f'{action} 操作'

                # 确定目标用户和操作者
                user = (
                    result
                    if hasattr(result, 'employee_id')
                    else (kwargs.get('user') or (args[0] if args else None))
                )
                operator = kwargs.get('operator') or kwargs.get('assigned_by') or getattr(self, 'user', None)

                ActivityLogService.log_user_action(
                    user=user,
                    operator=operator,
                    action=action,
                    description=description,
                    status='success',
                    action_key=action_key
                )
            except Exception:
                pass  # 日志记录失败不影响主流程

            return result
        return wrapper
    return decorator


def log_content_action(
    content_type: str,
    action: str,
    description_template: Optional[str] = None,
    action_key: Optional[str] = None
):
    """
    记录内容日志的装饰器

    Args:
        content_type: 内容类型 (knowledge, quiz, question, assignment)
        action: 操作类型 (create, update, delete, publish)
        description_template: 描述模板

    使用示例:
        @log_content_action('knowledge', 'create', '创建知识文档《{result.title}》')
        def create(self, data):
            ...
            return knowledge
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            template_args = _snapshot_for_logging(args)
            template_kwargs = _snapshot_for_logging(kwargs)

            # 执行原方法
            result = func(self, *args, **kwargs)

            # 记录日志
            try:
                from apps.activity_logs.services import ActivityLogService

                # 构建描述
                if description_template:
                    template_vars = _build_template_vars(func, self, template_args, template_kwargs, result)
                    description = description_template.format(**template_vars)
                else:
                    description = f'{action} {content_type}'

                # 获取内容信息
                content_id = str(result.id) if hasattr(result, 'id') else 'unknown'
                content_title = getattr(result, 'title', None) or getattr(result, 'content', '')[:50] or '内容'

                ActivityLogService.log_content_action(
                    content_type=content_type,
                    content_id=content_id,
                    content_title=content_title,
                    operator=getattr(self, 'user', None),
                    action=action,
                    description=description,
                    status='success',
                    action_key=action_key
                )
            except Exception:
                pass  # 日志记录失败不影响主流程

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
):
    """
    记录操作日志的装饰器

    Args:
        operation_type: 操作类型 (task_management, grading, spot_check, data_export)
        action: 操作
        description_template: 描述模板
        measure_duration: 是否测量耗时
        target_type: 目标类型 (task, quiz, knowledge, student)
        target_title_template: 目标标题模板，如 '{title}' 或 '{result.title}'

    使用示例:
        @log_operation('task_management', 'create_and_assign',
            '截止 {deadline_text}，{assignee_count} 名学员',
            target_type='task', target_title_template='{title}')
        def create_task(self, title, description, deadline, assignee_ids=None):
            ...
            return task
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            # 开始计时
            start_time = time.time() if measure_duration else None

            # 执行原方法
            result = func(self, *args, **kwargs)

            # 计算耗时
            duration = int((time.time() - start_time) * 1000) if measure_duration else 0

            # 记录日志
            try:
                from apps.activity_logs.services import ActivityLogService

                template_vars = _build_template_vars(func, self, args, kwargs, result)

                # 构建描述
                if description_template:
                    description = description_template.format(**template_vars)
                else:
                    description = f'{action} 操作'

                # 构建 target
                resolved_target_title = ''
                resolved_target_id = ''
                if target_title_template:
                    resolved_target_title = target_title_template.format(**template_vars)
                if result is not None and hasattr(result, 'id'):
                    resolved_target_id = str(result.id)

                ActivityLogService.log_operation(
                    operator=getattr(self, 'user', None),
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
            except Exception:
                pass  # 日志记录失败不影响主流程

            return result
        return wrapper
    return decorator
