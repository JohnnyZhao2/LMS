"""Authorization catalog and defaults."""

from typing import Dict, List


PERMISSION_CATALOG: List[Dict[str, str]] = [
    {
        'code': 'knowledge.view',
        'name': '查看知识',
        'module': 'knowledge',
        'description': '查看知识列表、详情和知识统计',
    },
    {
        'code': 'knowledge.create',
        'name': '创建知识',
        'module': 'knowledge',
        'description': '创建知识文档和知识标签',
    },
    {
        'code': 'knowledge.update',
        'name': '更新知识',
        'module': 'knowledge',
        'description': '编辑知识文档内容和标签信息',
    },
    {
        'code': 'knowledge.delete',
        'name': '删除知识',
        'module': 'knowledge',
        'description': '删除知识文档',
    },
    {
        'code': 'quiz.view',
        'name': '查看试卷',
        'module': 'quiz',
        'description': '查看试卷列表和试卷详情',
    },
    {
        'code': 'quiz.create',
        'name': '创建试卷',
        'module': 'quiz',
        'description': '创建新试卷',
    },
    {
        'code': 'quiz.update',
        'name': '更新试卷',
        'module': 'quiz',
        'description': '编辑试卷和题目顺序',
    },
    {
        'code': 'quiz.delete',
        'name': '删除试卷',
        'module': 'quiz',
        'description': '删除试卷',
    },
    {
        'code': 'question.view',
        'name': '查看题目',
        'module': 'question',
        'description': '查看题库列表和题目详情',
    },
    {
        'code': 'question.create',
        'name': '创建题目',
        'module': 'question',
        'description': '创建题目',
    },
    {
        'code': 'question.update',
        'name': '更新题目',
        'module': 'question',
        'description': '编辑题目内容',
    },
    {
        'code': 'question.delete',
        'name': '删除题目',
        'module': 'question',
        'description': '删除题目',
    },
    {
        'code': 'task.view',
        'name': '查看任务',
        'module': 'task',
        'description': '查看任务列表和任务详情',
    },
    {
        'code': 'task.create',
        'name': '创建任务',
        'module': 'task',
        'description': '创建任务',
    },
    {
        'code': 'task.update',
        'name': '更新任务',
        'module': 'task',
        'description': '编辑任务和预览任务',
    },
    {
        'code': 'task.delete',
        'name': '删除任务',
        'module': 'task',
        'description': '删除任务',
    },
    {
        'code': 'task.assign',
        'name': '分配任务',
        'module': 'task',
        'description': '为任务分配学员',
    },
    {
        'code': 'task.analytics.view',
        'name': '查看任务分析',
        'module': 'task',
        'description': '查看任务进度、执行情况和分析统计',
    },
    {
        'code': 'spot_check.view',
        'name': '查看抽查',
        'module': 'spot_check',
        'description': '查看抽查记录列表和详情',
    },
    {
        'code': 'spot_check.create',
        'name': '创建抽查',
        'module': 'spot_check',
        'description': '创建抽查记录',
    },
    {
        'code': 'spot_check.update',
        'name': '更新抽查',
        'module': 'spot_check',
        'description': '编辑抽查记录',
    },
    {
        'code': 'spot_check.delete',
        'name': '删除抽查',
        'module': 'spot_check',
        'description': '删除抽查记录',
    },
    {
        'code': 'grading.view',
        'name': '查看阅卷中心',
        'module': 'grading',
        'description': '查看待阅卷任务、题目分析和作答详情',
    },
    {
        'code': 'grading.score',
        'name': '提交评分',
        'module': 'grading',
        'description': '为主观题提交评分',
    },
    {
        'code': 'submission.answer',
        'name': '答题提交',
        'module': 'submission',
        'description': '参与练习或考试并提交答案',
    },
    {
        'code': 'submission.review',
        'name': '查看答题结果',
        'module': 'submission',
        'description': '查看作答结果和详情',
    },
    {
        'code': 'user.view',
        'name': '查看用户',
        'module': 'user',
        'description': '查看用户列表和详情',
    },
    {
        'code': 'user.create',
        'name': '创建用户',
        'module': 'user',
        'description': '创建新用户',
    },
    {
        'code': 'user.update',
        'name': '更新用户',
        'module': 'user',
        'description': '更新用户基础信息',
    },
    {
        'code': 'user.delete',
        'name': '删除用户',
        'module': 'user',
        'description': '彻底删除离职用户',
    },
    {
        'code': 'user.activate',
        'name': '启用用户',
        'module': 'user',
        'description': '启用停用账号',
    },
    {
        'code': 'user.deactivate',
        'name': '停用用户',
        'module': 'user',
        'description': '停用账号',
    },
    {
        'code': 'user.reset_password',
        'name': '重置密码',
        'module': 'user',
        'description': '重置用户密码并生成临时密码',
    },
    {
        'code': 'user.assign_roles',
        'name': '分配角色',
        'module': 'user',
        'description': '为用户分配角色',
    },
    {
        'code': 'user.assign_mentor',
        'name': '指定导师',
        'module': 'user',
        'description': '为学员指定导师',
    },
    {
        'code': 'authorization.role_template.view',
        'name': '查看角色模板',
        'module': 'authorization',
        'description': '查看角色权限模板',
    },
    {
        'code': 'authorization.role_template.update',
        'name': '更新角色模板',
        'module': 'authorization',
        'description': '更新角色权限模板',
    },
    {
        'code': 'authorization.user_override.view',
        'name': '查看用户权限覆盖',
        'module': 'authorization',
        'description': '查看用户级权限覆盖规则',
    },
    {
        'code': 'authorization.user_override.create',
        'name': '创建用户权限覆盖',
        'module': 'authorization',
        'description': '新增用户级权限覆盖规则',
    },
    {
        'code': 'authorization.user_override.revoke',
        'name': '撤销用户权限覆盖',
        'module': 'authorization',
        'description': '撤销用户级权限覆盖规则',
    },
    {
        'code': 'analytics.view',
        'name': '查看数据看板',
        'module': 'analytics',
        'description': '查看团队数据看板',
    },
    {
        'code': 'profile.view',
        'name': '查看个人中心',
        'module': 'profile',
        'description': '查看个人中心',
    },
    {
        'code': 'profile.update',
        'name': '更新个人资料',
        'module': 'profile',
        'description': '更新个人资料',
    },
    {
        'code': 'activity_log.view',
        'name': '查看活动日志',
        'module': 'activity_log',
        'description': '查看用户日志、内容日志和操作日志',
    },
    {
        'code': 'activity_log.policy.update',
        'name': '更新日志策略',
        'module': 'activity_log',
        'description': '更新活动日志记录策略',
    },
]


DASHBOARD_PERMISSION_CODES = [
    'dashboard.student.view',
    'dashboard.mentor.view',
    'dashboard.team_manager.view',
    'dashboard.admin.view',
]

SYSTEM_MANAGED_PERMISSION_CODES = sorted([
    *DASHBOARD_PERMISSION_CODES,
    'activity_log.view',
    'activity_log.policy.update',
])

ROLE_SYSTEM_PERMISSION_DEFAULTS: Dict[str, List[str]] = {
    'ADMIN': [
        'activity_log.view',
        'activity_log.policy.update',
    ],
}


ROLE_PERMISSION_DEFAULTS: Dict[str, List[str]] = {
    'STUDENT': [
        'knowledge.view',
        'task.view',
        'submission.answer',
        'submission.review',
        'profile.view',
        'profile.update',
    ],
    'MENTOR': [
        'quiz.view',
        'quiz.create',
        'quiz.update',
        'quiz.delete',
        'question.view',
        'question.create',
        'question.update',
        'question.delete',
        'task.view',
        'task.create',
        'task.update',
        'task.delete',
        'task.assign',
        'task.analytics.view',
        'spot_check.view',
        'spot_check.create',
        'spot_check.update',
        'spot_check.delete',
        'grading.view',
        'grading.score',
    ],
    'DEPT_MANAGER': [
        'knowledge.view',
        'knowledge.create',
        'knowledge.update',
        'knowledge.delete',
        'quiz.view',
        'quiz.create',
        'quiz.update',
        'quiz.delete',
        'question.view',
        'question.create',
        'question.update',
        'question.delete',
        'task.view',
        'task.create',
        'task.update',
        'task.delete',
        'task.assign',
        'task.analytics.view',
        'spot_check.view',
        'spot_check.create',
        'spot_check.update',
        'spot_check.delete',
        'grading.view',
        'grading.score',
    ],
    'TEAM_MANAGER': [
        'knowledge.view',
        'analytics.view',
    ],
    'ADMIN': [
        'knowledge.view',
        'knowledge.create',
        'knowledge.update',
        'knowledge.delete',
        'quiz.view',
        'quiz.create',
        'quiz.update',
        'quiz.delete',
        'question.view',
        'question.create',
        'question.update',
        'question.delete',
        'task.view',
        'task.create',
        'task.update',
        'task.delete',
        'task.assign',
        'task.analytics.view',
        'grading.view',
        'grading.score',
        'user.view',
        'user.create',
        'user.update',
        'user.delete',
        'user.activate',
        'user.deactivate',
        'user.reset_password',
        'user.assign_roles',
        'user.assign_mentor',
        'authorization.role_template.view',
        'authorization.role_template.update',
        'authorization.user_override.view',
        'authorization.user_override.create',
        'authorization.user_override.revoke',
    ],
}


SCOPE_ALL = 'ALL'
SCOPE_SELF = 'SELF'
SCOPE_MENTEES = 'MENTEES'
SCOPE_DEPARTMENT = 'DEPARTMENT'
SCOPE_EXPLICIT_USERS = 'EXPLICIT_USERS'

SCOPE_CHOICES = [
    (SCOPE_ALL, '全部对象'),
    (SCOPE_SELF, '仅本人'),
    (SCOPE_MENTEES, '仅名下学员'),
    (SCOPE_DEPARTMENT, '仅同部门'),
    (SCOPE_EXPLICIT_USERS, '仅指定用户'),
]


EFFECT_ALLOW = 'ALLOW'
EFFECT_DENY = 'DENY'
EFFECT_CHOICES = [
    (EFFECT_ALLOW, '允许'),
    (EFFECT_DENY, '拒绝'),
]
