from apps.authorization.registry import AuthorizationSpec, perm


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='dashboard.system_permissions',
        module='dashboard',
        permissions=(
            perm(
                code='dashboard.student.view',
                name='查看学员仪表盘',
                description='访问学员工作台仪表盘',
                is_configurable=False,
                required_role_codes=('STUDENT',),
            ),
            perm(
                code='dashboard.mentor.view',
                name='查看导师仪表盘',
                description='访问导师工作台仪表盘',
                is_configurable=False,
                required_role_codes=('MENTOR', 'DEPT_MANAGER'),
            ),
            perm(
                code='dashboard.team_manager.view',
                name='查看团队经理仪表盘',
                description='访问团队经理看板',
                is_configurable=False,
                required_role_codes=('TEAM_MANAGER',),
            ),
            perm(
                code='dashboard.admin.view',
                name='查看管理员仪表盘',
                description='访问管理员工作台仪表盘',
                is_configurable=False,
                required_role_codes=('ADMIN',),
            ),
        ),
    ),
)
