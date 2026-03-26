"""
活动日志动作白名单定义
用于生成策略开关与前端展示分组
"""

LOG_ACTIONS = [
    # ==================== 用户日志 ====================
    {
        'key': 'user.login',
        'category': 'user',
        'group': '认证',
        'label': '登录成功',
        'default_enabled': True,
    },
    {
        'key': 'user.login_failed',
        'category': 'user',
        'group': '认证',
        'label': '登录失败',
        'default_enabled': True,
    },
    {
        'key': 'user.logout',
        'category': 'user',
        'group': '认证',
        'label': '登出',
        'default_enabled': True,
    },
    {
        'key': 'user.switch_role',
        'category': 'user',
        'group': '认证',
        'label': '切换角色',
        'default_enabled': True,
    },
    {
        'key': 'user.password_change',
        'category': 'user',
        'group': '账号管理',
        'label': '重置/修改密码',
        'default_enabled': True,
    },
    {
        'key': 'user.activate',
        'category': 'user',
        'group': '账号管理',
        'label': '启用账号',
        'default_enabled': True,
    },
    {
        'key': 'user.deactivate',
        'category': 'user',
        'group': '账号管理',
        'label': '停用账号',
        'default_enabled': True,
    },
    {
        'key': 'user.role_assigned',
        'category': 'user',
        'group': '账号管理',
        'label': '分配角色',
        'default_enabled': True,
    },
    {
        'key': 'user.mentor_assigned',
        'category': 'user',
        'group': '账号管理',
        'label': '分配导师',
        'default_enabled': True,
    },
    # ==================== 内容日志 ====================
    {
        'key': 'content.knowledge.create',
        'category': 'content',
        'group': '知识文档',
        'label': '创建知识文档',
        'default_enabled': True,
    },
    {
        'key': 'content.knowledge.update',
        'category': 'content',
        'group': '知识文档',
        'label': '更新知识文档',
        'default_enabled': True,
    },
    {
        'key': 'content.knowledge.delete',
        'category': 'content',
        'group': '知识文档',
        'label': '删除知识文档',
        'default_enabled': True,
    },
    {
        'key': 'content.question.create',
        'category': 'content',
        'group': '题目',
        'label': '创建题目',
        'default_enabled': True,
    },
    {
        'key': 'content.question.update',
        'category': 'content',
        'group': '题目',
        'label': '更新题目',
        'default_enabled': True,
    },
    {
        'key': 'content.question.delete',
        'category': 'content',
        'group': '题目',
        'label': '删除题目',
        'default_enabled': True,
    },
    {
        'key': 'content.quiz.create',
        'category': 'content',
        'group': '试卷',
        'label': '创建试卷',
        'default_enabled': True,
    },
    {
        'key': 'content.quiz.update',
        'category': 'content',
        'group': '试卷',
        'label': '更新试卷',
        'default_enabled': True,
    },
    {
        'key': 'content.quiz.delete',
        'category': 'content',
        'group': '试卷',
        'label': '删除试卷',
        'default_enabled': True,
    },
    # ==================== 操作日志 ====================
    {
        'key': 'operation.task_management.create_and_assign',
        'category': 'operation',
        'group': '任务管理',
        'label': '创建并分配任务',
        'default_enabled': True,
    },
    {
        'key': 'operation.task_management.update_task',
        'category': 'operation',
        'group': '任务管理',
        'label': '更新任务',
        'default_enabled': True,
    },
    {
        'key': 'operation.task_management.delete_task',
        'category': 'operation',
        'group': '任务管理',
        'label': '删除任务',
        'default_enabled': True,
    },
    {
        'key': 'operation.spot_check.create_spot_check',
        'category': 'operation',
        'group': '抽查记录',
        'label': '创建抽查记录',
        'default_enabled': True,
    },
    {
        'key': 'operation.spot_check.update_spot_check',
        'category': 'operation',
        'group': '抽查记录',
        'label': '更新抽查记录',
        'default_enabled': True,
    },
    {
        'key': 'operation.spot_check.delete_spot_check',
        'category': 'operation',
        'group': '抽查记录',
        'label': '删除抽查记录',
        'default_enabled': True,
    },
    {
        'key': 'operation.submission.start_quiz',
        'category': 'operation',
        'group': '答题/考试',
        'label': '开始答题',
        'default_enabled': True,
    },
    {
        'key': 'operation.submission.submit',
        'category': 'operation',
        'group': '答题/考试',
        'label': '提交答卷',
        'default_enabled': True,
    },
    {
        'key': 'operation.learning.complete_knowledge',
        'category': 'operation',
        'group': '学习进度',
        'label': '完成学习',
        'default_enabled': True,
    },
]


LOG_ACTION_INDEX = {item['key']: item for item in LOG_ACTIONS}
