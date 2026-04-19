import type { PermissionOverrideScope } from '@/types/authorization';

interface ModulePresentationMeta {
  label: string;
  order: number;
}

interface ScopeGroupPresentationMeta {
  label: string;
  description: string;
}

const MODULE_PRESENTATION: Record<string, ModulePresentationMeta> = {
  dashboard: {
    label: '仪表盘',
    order: 5,
  },
  task: {
    label: '任务管理',
    order: 10,
  },
  knowledge: {
    label: '知识管理',
    order: 20,
  },
  tag: {
    label: '标签管理',
    order: 25,
  },
  quiz: {
    label: '试卷管理',
    order: 30,
  },
  question: {
    label: '题库管理',
    order: 40,
  },
  grading: {
    label: '阅卷中心',
    order: 50,
  },
  spot_check: {
    label: '抽查管理',
    order: 60,
  },
  user: {
    label: '用户管理',
    order: 70,
  },
  config: {
    label: '系统配置',
    order: 80,
  },
  log_management: {
    label: '日志管理',
    order: 85,
  },
  submission: {
    label: '作答流程',
    order: 90,
  },
  profile: {
    label: '个人中心',
    order: 100,
  },
};

const SCOPE_GROUP_PRESENTATION: Record<string, ScopeGroupPresentationMeta> = {
  user_scope: {
    label: '用户可见范围',
    description: '决定该角色默认能查看哪些用户。',
  },
  task_student_scope: {
    label: '任务学员范围',
    description: '决定任务分配与任务分析默认作用到哪些学员。',
  },
  spot_check_student_scope: {
    label: '抽查学员范围',
    description: '决定抽查查看与创建默认作用到哪些学员。',
  },
};

const SCOPE_TYPE_LABELS: Record<PermissionOverrideScope, string> = {
  ALL: '全部对象',
  SELF: '本人',
  MENTEES: '名下学员',
  DEPARTMENT: '同部门',
  EXPLICIT_USERS: '指定用户',
};

export const getModulePresentation = (moduleCode: string): ModulePresentationMeta => (
  MODULE_PRESENTATION[moduleCode] ?? {
    label: moduleCode,
    order: 999,
  }
);

export const getScopeGroupPresentation = (scopeGroupKey: string): ScopeGroupPresentationMeta => (
  SCOPE_GROUP_PRESENTATION[scopeGroupKey] ?? {
    label: scopeGroupKey,
    description: '决定该组能力默认作用到哪些对象。',
  }
);

export const getScopeTypeLabel = (scopeType: PermissionOverrideScope): string => (
  SCOPE_TYPE_LABELS[scopeType] ?? scopeType
);
