import type { PermissionCatalogItem } from '@/types/api';

interface PermissionPresentationMeta {
  pageLabel: string;
  detail: string;
}

interface ModulePresentationMeta {
  label: string;
  summary: string;
  order: number;
}

export const MODULE_PRESENTATION: Record<string, ModulePresentationMeta> = {
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
  analytics: {
    label: '数据看板',
    summary: '团队经理菜单中的数据看板入口。',
    order: 100,
  },
  profile: {
    label: '个人中心',
    summary: '学员菜单中的个人中心入口。',
    order: 110,
  },
};

export const PERMISSION_PRESENTATION: Record<string, PermissionPresentationMeta> = {
  'task.view': {
    pageLabel: '任务列表 / 任务详情',
    detail: '进入任务管理页并查看任务详情。',
  },
  'task.create': {
    pageLabel: '任务配置 / 新建任务',
    detail: '创建新任务。',
  },
  'task.update': {
    pageLabel: '任务配置 / 编辑任务',
    detail: '编辑任务并进入任务预览页。',
  },
  'task.delete': {
    pageLabel: '任务配置 / 删除任务',
    detail: '删除任务。',
  },
  'task.assign': {
    pageLabel: '任务配置 / 学员分配',
    detail: '查看可分配学员并为任务分配学员。',
  },
  'task.analytics.view': {
    pageLabel: '任务管理 / 进度监控',
    detail: '查看任务分析、执行情况和完成进度。',
  },
  'knowledge.view': {
    pageLabel: '知识列表 / 知识详情',
    detail: '查看知识中心、知识详情和知识统计。',
  },
  'knowledge.create': {
    pageLabel: '知识管理 / 新建知识',
    detail: '创建知识文档和辅助标签。',
  },
  'knowledge.update': {
    pageLabel: '知识管理 / 编辑知识',
    detail: '更新知识文档和标签信息。',
  },
  'knowledge.delete': {
    pageLabel: '知识管理 / 删除知识',
    detail: '删除知识文档。',
  },
  'tag.view': {
    pageLabel: '标签管理 / 标签列表',
    detail: '查看标签管理页和标签列表。',
  },
  'tag.create': {
    pageLabel: '标签管理 / 新建标签',
    detail: '创建新标签。',
  },
  'tag.update': {
    pageLabel: '标签管理 / 编辑标签',
    detail: '更新标签信息和适用范围。',
  },
  'tag.delete': {
    pageLabel: '标签管理 / 删除标签',
    detail: '删除标签。',
  },
  'quiz.view': {
    pageLabel: '试卷中心 / 试卷列表',
    detail: '查看试卷列表和试卷详情。',
  },
  'quiz.create': {
    pageLabel: '试卷中心 / 新建试卷',
    detail: '创建试卷。',
  },
  'quiz.update': {
    pageLabel: '试卷中心 / 编辑试卷',
    detail: '编辑试卷内容和题目顺序。',
  },
  'quiz.delete': {
    pageLabel: '试卷中心 / 删除试卷',
    detail: '删除试卷。',
  },
  'question.view': {
    pageLabel: '试卷中心 / 题库列表',
    detail: '查看题库列表和题目详情。',
  },
  'question.create': {
    pageLabel: '试卷中心 / 新建题目',
    detail: '创建题目。',
  },
  'question.update': {
    pageLabel: '试卷中心 / 编辑题目',
    detail: '编辑题目内容。',
  },
  'question.delete': {
    pageLabel: '试卷中心 / 删除题目',
    detail: '删除题目。',
  },
  'grading.view': {
    pageLabel: '任务管理 / 阅卷中心',
    detail: '查看待阅卷任务、题目分析和作答详情。',
  },
  'grading.score': {
    pageLabel: '任务管理 / 提交评分',
    detail: '对主观题答案提交评分。',
  },
  'spot_check.view': {
    pageLabel: '抽查管理 / 抽查列表',
    detail: '查看抽查记录列表和详情。',
  },
  'spot_check.create': {
    pageLabel: '抽查管理 / 新建抽查',
    detail: '创建抽查记录。',
  },
  'spot_check.update': {
    pageLabel: '抽查管理 / 编辑抽查',
    detail: '更新抽查记录。',
  },
  'spot_check.delete': {
    pageLabel: '抽查管理 / 删除抽查',
    detail: '删除抽查记录。',
  },
  'user.view': {
    pageLabel: '用户管理 / 用户列表',
    detail: '查看用户列表和用户详情。',
  },
  'user.create': {
    pageLabel: '用户管理 / 创建用户',
    detail: '创建新用户。',
  },
  'user.update': {
    pageLabel: '用户管理 / 编辑用户',
    detail: '编辑用户资料并指定导师。',
  },
  'user.activate': {
    pageLabel: '用户管理 / 启停账号',
    detail: '启用/停用账号并重置密码。',
  },
  'user.authorize': {
    pageLabel: '用户管理 / 分配权限',
    detail: '分配角色并配置用户权限自定义。',
  },
  'user.delete': {
    pageLabel: '用户管理 / 删除用户',
    detail: '彻底删除离职用户。',
  },
  'authorization.role_template.view': {
    pageLabel: '配置管理 / 角色模板',
    detail: '查看角色权限模板配置。',
  },
  'authorization.role_template.update': {
    pageLabel: '配置管理 / 角色模板',
    detail: '更新角色权限模板配置。',
  },
  'activity_log.view': {
    pageLabel: '用户管理 / 日志审计',
    detail: '查看用户日志、内容日志和操作日志。',
  },
  'activity_log.policy.update': {
    pageLabel: '配置管理 / 日志策略',
    detail: '更新活动日志记录策略。',
  },
  'submission.answer': {
    pageLabel: '答题流程',
    detail: '进入答题页并提交练习或考试答案。',
  },
  'submission.review': {
    pageLabel: '结果查看',
    detail: '查看作答结果、成绩和答题详情。',
  },
  'analytics.view': {
    pageLabel: '团队经理 / 数据看板',
    detail: '查看团队数据看板。',
  },
  'profile.view': {
    pageLabel: '学员 / 个人中心',
    detail: '查看个人中心。',
  },
  'profile.update': {
    pageLabel: '学员 / 个人中心',
    detail: '更新个人资料。',
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
    pageLabel: '未归档页面',
    detail: permission.description || '未补充页面能力说明。',
  }
);
