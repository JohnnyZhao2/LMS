"""
日志记录装饰器
用于自动记录业务操作日志
"""
import time
from functools import wraps
from typing import Callable, Optional


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
                    # 准备模板变量
                    template_vars = {
                        'result': result,
                        'self': self,
                    }
                    # 添加位置参数
                    import inspect
                    sig = inspect.signature(func)
                    param_names = list(sig.parameters.keys())[1:]  # 跳过 self
                    for i, param_name in enumerate(param_names):
                        if i < len(args):
                            template_vars[param_name] = args[i]
                    # 添加关键字参数
                    template_vars.update(kwargs)

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
            # 执行原方法
            result = func(self, *args, **kwargs)

            # 记录日志
            try:
                from apps.activity_logs.services import ActivityLogService

                # 构建描述
                if description_template:
                    template_vars = {'result': result, 'self': self}
                    import inspect
                    sig = inspect.signature(func)
                    param_names = list(sig.parameters.keys())[1:]
                    for i, param_name in enumerate(param_names):
                        if i < len(args):
                            template_vars[param_name] = args[i]
                    template_vars.update(kwargs)
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
    action_key: Optional[str] = None
):
    """
    记录操作日志的装饰器

    Args:
        operation_type: 操作类型 (task_management, grading, spot_check, data_export)
        action: 操作
        description_template: 描述模板
        measure_duration: 是否测量耗时

    使用示例:
        @log_operation('task_management', 'create_and_assign', '创建任务《{title}》并分配给 {assignee_count} 名学员', measure_duration=True)
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

                # 构建描述
                if description_template:
                    template_vars = {'result': result, 'self': self}
                    import inspect
                    sig = inspect.signature(func)
                    param_names = list(sig.parameters.keys())[1:]
                    for i, param_name in enumerate(param_names):
                        if i < len(args):
                            template_vars[param_name] = args[i]
                    template_vars.update(kwargs)

                    # 添加一些便捷变量
                    if 'assignee_ids' in template_vars:
                        template_vars['assignee_count'] = len(template_vars['assignee_ids'] or [])

                    description = description_template.format(**template_vars)
                else:
                    description = f'{action} 操作'

                ActivityLogService.log_operation(
                    operator=getattr(self, 'user', None),
                    operation_type=operation_type,
                    action=action,
                    description=description,
                    duration=duration,
                    status='success',
                    action_key=action_key
                )
            except Exception:
                pass  # 日志记录失败不影响主流程

            return result
        return wrapper
    return decorator
