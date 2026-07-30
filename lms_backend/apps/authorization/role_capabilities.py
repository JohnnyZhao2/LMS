"""授权角色固定能力集。

三角色权限在代码中声明，不可通过管理界面配置。
主要差异由 scope_rules 的作用范围体现。
"""

from apps.authorization.registry import crud_codes
from apps.authorization.roles import DEPT_ROLE, GLOBAL_ROLE, MENTOR_ROLE


MENTOR_PERMISSIONS = (
    'grading.view',
    'grading.score',
    *crud_codes('question'),
    *crud_codes('quiz'),
    *crud_codes('spot_check'),
    'tag.view',
    'tag.create',
    *crud_codes('task'),
    'task.assign',
    'task.analytics.view',
)

DEPT_PERMISSIONS = (
    *MENTOR_PERMISSIONS,
    *crud_codes('knowledge'),
    'tag.update',
    'tag.delete',
)

GLOBAL_PERMISSIONS = (
    *crud_codes('knowledge'),
    *crud_codes('question'),
    *crud_codes('quiz'),
    *crud_codes('tag'),
    *crud_codes('task'),
    'task.assign',
    'user.avatar.update',
    'user.view',
    'user.create',
    'user.update',
    'user.delete',
    'user.activate',
    'user.role.assign',
    'user.permission.view',
    'user.permission.update',
)

ROLE_PERMISSIONS: dict[str, tuple[str, ...]] = {
    MENTOR_ROLE: MENTOR_PERMISSIONS,
    DEPT_ROLE: DEPT_PERMISSIONS,
    GLOBAL_ROLE: GLOBAL_PERMISSIONS,
}
