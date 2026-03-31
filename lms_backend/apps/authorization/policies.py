"""Centralized runtime permission constraints."""

from typing import Optional

from apps.users.permissions import is_admin_like_role


PERMISSION_CONSTRAINT_SUMMARIES = {
    'question.update': '具备题目编辑权限即可编辑题目。',
    'question.delete': '具备题目删除权限即可删除题目。',
    'task.view': '非管理员仅可查看自己创建或已分配给自己的任务。',
    'task.update': '非管理员仅可编辑自己创建的任务。',
    'task.delete': '非管理员仅可删除自己创建的任务。',
    'task.analytics.view': '默认按名下或本部门学员范围生效，可通过用户授权按学员范围增删。',
    'analytics.view': '团队经理看板按学员范围生效，可通过用户授权按学员范围增删。',
}


def get_permission_constraint_summary(permission_code: str) -> str:
    return PERMISSION_CONSTRAINT_SUMMARIES.get(permission_code, '')


def can_manage_owned_resource(
    *,
    current_role: Optional[str],
    actor_user_id: Optional[int],
    owner_user_id: Optional[int],
    has_allow_override: bool = False,
) -> bool:
    if is_admin_like_role(current_role):
        return True
    if actor_user_id and owner_user_id and actor_user_id == owner_user_id:
        return True
    return has_allow_override


def can_view_task_resource(
    *,
    current_role: Optional[str],
    actor_user_id: Optional[int],
    task_owner_user_id: Optional[int],
    task_created_role: Optional[str],
    is_assignee: bool,
    has_allow_override: bool = False,
) -> bool:
    if is_admin_like_role(current_role):
        return True
    if current_role in {'MENTOR', 'DEPT_MANAGER'}:
        if actor_user_id and task_owner_user_id and actor_user_id == task_owner_user_id:
            return task_created_role == current_role
    if is_assignee:
        return True
    return has_allow_override


def can_manage_task_resource(
    *,
    current_role: Optional[str],
    actor_user_id: Optional[int],
    task_owner_user_id: Optional[int],
    task_created_role: Optional[str],
    has_allow_override: bool = False,
) -> bool:
    if is_admin_like_role(current_role):
        return True
    if current_role in {'MENTOR', 'DEPT_MANAGER'}:
        if actor_user_id and task_owner_user_id and actor_user_id == task_owner_user_id:
            return task_created_role == current_role
    return has_allow_override
