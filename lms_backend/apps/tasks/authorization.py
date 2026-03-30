"""Task owned permission specs."""

from apps.authorization.registry import AuthorizationSpec, PermissionDefinition


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='tasks.permissions',
        module='task',
        permissions=(
            PermissionDefinition(
                code='task.view',
                name='查看任务',
                description='查看任务列表和任务详情',
            ),
            PermissionDefinition(
                code='task.create',
                name='创建任务',
                description='创建任务',
            ),
            PermissionDefinition(
                code='task.update',
                name='更新任务',
                description='编辑任务和预览任务',
            ),
            PermissionDefinition(
                code='task.delete',
                name='删除任务',
                description='删除任务',
            ),
            PermissionDefinition(
                code='task.assign',
                name='分配任务',
                description='为任务分配学员',
            ),
            PermissionDefinition(
                code='task.analytics.view',
                name='查看任务分析',
                description='查看任务进度、执行情况和分析统计',
            ),
        ),
        role_defaults={
            'STUDENT': ('task.view',),
            'MENTOR': (
                'task.view',
                'task.create',
                'task.update',
                'task.delete',
                'task.assign',
                'task.analytics.view',
            ),
            'DEPT_MANAGER': (
                'task.view',
                'task.create',
                'task.update',
                'task.delete',
                'task.assign',
                'task.analytics.view',
            ),
            'ADMIN': (
                'task.view',
                'task.create',
                'task.update',
                'task.delete',
                'task.assign',
            ),
        },
        scope_aware_permissions=('task.assign', 'task.analytics.view'),
    ),
)
