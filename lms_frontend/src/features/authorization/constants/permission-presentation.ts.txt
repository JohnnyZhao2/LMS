import type { PermissionCatalogItem } from '@/types/api';

interface PermissionPresentationMeta {
  detail: string;
}

interface ModulePresentationMeta {
  label: string;
  summary: string;
  order: number;
}

export const MODULE_PRESENTATION: Record<string, ModulePresentationMeta> = {
  dashboard: {
    label: '仪表盘',
    summary: '系统托管的仪表盘入口权限，用于角色工作台首页访问控制。',
    order: 5,
  },
  task: {
    label: '任务管理',
    summary: '管理员菜单中的任务管理页，覆盖任务列表、任务配置、学员分配与进度监控。',
    order: 10,
  },
  knowledge: {
    label: '知识管理',
    summary: '知识中心和知识管理共用模块，覆盖知识列表、详情、统计和知识维护。',
    order: 20,
  },
  tag: {
    label: '标签管理',
    summary: '标签管理页，负责标签列表、创建、编辑和删除。',
    order: 25,
  },
  quiz: {
    label: '试卷管理',
    summary: '试卷中心主入口，负责试卷列表、组卷和试卷维护。',
    order: 30,
  },
  question: {
    label: '题库管理',
    summary: '试卷中心内部的题库页，负责题库查询和题目维护。',
    order: 40,
  },
  grading: {
    label: '阅卷中心',
    summary: '任务管理下的阅卷能力，覆盖待阅卷列表、题目分析和评分提交。',
    order: 50,
  },
  spot_check: {
    label: '抽查管理',
    summary: '导师和室经理的抽查模块，负责抽查记录查询和维护。',
    order: 60,
  },
  user: {
    label: '用户管理',
    summary: '管理员菜单中的用户管理页，覆盖用户资料、账号控制和用户授权维护。',
    order: 70,
  },
  config: {
    label: '配置管理',
    summary: '权限中心的角色模板配置和日志策略管理。',
    order: 80,
  },
  submission: {
    label: '作答流程',
    summary: '学员端答题和结果查看能力。',
    order: 90,
  },
  profile: {
    label: '个人中心',
    summary: '学员菜单中的个人中心入口。',
    order: 100,
  },
};

export const PERMISSION_PRESENTATION: Record<string, PermissionPresentationMeta> = {
  'dashboard.team_manager.view': {
    detail: '访问团队经理仪表盘入口（系统托管）。',
  },
  'task.view': {
    detail: '进入任务管理页并查看任务详情。',
  },
  'task.create': {
    detail: '创建新任务。',
  },
  'task.update': {
    detail: '编辑任务并进入任务预览页。',
  },
  'task.delete': {
    detail: '删除任务。',
  },
  'task.assign': {
    detail: '查看可分配学员并为任务分配学员。',
  },
  'task.analytics.view': {
    detail: '查看任务分析、执行情况和完成进度。',
  },
  'knowledge.view': {
    detail: '查看知识中心、知识详情和知识统计。',
  },
  'knowledge.create': {
    detail: '创建知识文档和辅助标签。',
  },
  'knowledge.update': {
    detail: '更新知识文档和标签信息。',
  },
  'knowledge.delete': {
    detail: '删除知识文档。',
  },
  'tag.view': {
    detail: '查看标签管理页和标签列表。',
  },
  'tag.create': {
    detail: '创建新标签。',
  },
  'tag.update': {
    detail: '更新标签信息和适用范围。',
  },
  'tag.delete': {
    detail: '删除标签。',
  },
  'quiz.view': {
    detail: '查看试卷列表和试卷详情。',
  },
  'quiz.create': {
    detail: '创建试卷。',
  },
  'quiz.update': {
    detail: '编辑试卷内容和题目顺序。',
  },
  'quiz.delete': {
    detail: '删除试卷。',
  },
  'question.view': {
    detail: '查看题库列表和题目详情。',
  },
  'question.create': {
    detail: '创建题目。',
  },
  'question.update': {
    detail: '编辑题目内容。',
  },
  'question.delete': {
    detail: '删除题目。',
  },
  'grading.view': {
    detail: '查看待阅卷任务、题目分析和作答详情。',
  },
  'grading.score': {
    detail: '对主观题答案提交评分。',
  },
  'spot_check.view': {
    detail: '查看抽查记录列表和详情。',
  },
  'spot_check.create': {
    detail: '创建抽查记录。',
  },
  'spot_check.update': {
    detail: '更新抽查记录。',
  },
  'spot_check.delete': {
    detail: '删除抽查记录。',
  },
  'user.view': {
    detail: '查看用户列表和用户详情。',
  },
  'user.create': {
    detail: '创建新用户。',
  },
  'user.update': {
    detail: '编辑用户资料并指定导师。',
  },
  'user.activate': {
    detail: '启用/停用账号并重置密码。',
  },
  'user.authorize': {
    detail: '分配角色并配置用户权限自定义。',
  },
  'user.delete': {
    detail: '彻底删除离职用户。',
  },
  'user.avatar.update': {
    detail: '修改其他用户头像。',
  },
  'authorization.role_template.view': {
    detail: '查看角色权限模板配置。',
  },
  'authorization.role_template.update': {
    detail: '更新角色权限模板配置。',
  },
  'activity_log.view': {
    detail: '查看用户日志、内容日志和操作日志。',
  },
  'activity_log.policy.update': {
    detail: '更新活动日志记录策略。',
  },
  'submission.answer': {
    detail: '进入答题页并提交测验或考试答案。',
  },
  'submission.review': {
    detail: '查看作答结果、成绩和答题详情。',
  },
  'profile.student.view': {
    detail: '查看学员个人中心。',
  },
  'profile.student.update': {
    detail: '更新学员个人资料。',
  },
};

export const getModulePresentation = (moduleCode: string): ModulePresentationMeta => (
  MODULE_PRESENTATION[moduleCode] ?? {
    label: moduleCode,
    summary: '未归档模块，请补充模块说明。',
    order: 999,
  }
);

export const getPermissionPresentation = (permission: PermissionCatalogItem): PermissionPresentationMeta => (
  PERMISSION_PRESENTATION[permission.code] ?? {
    detail: permission.description || '未补充页面能力说明。',
  }
);
