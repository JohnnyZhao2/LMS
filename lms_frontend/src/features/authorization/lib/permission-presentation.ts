interface ModulePresentationMeta {
  label: string;
  order: number;
}

/** module = Django app_label */
const MODULE_PRESENTATION: Record<string, ModulePresentationMeta> = {
  tasks: {
    label: '任务管理',
    order: 10,
  },
  knowledge: {
    label: '知识管理',
    order: 20,
  },
  tags: {
    label: '标签管理',
    order: 25,
  },
  quizzes: {
    label: '试卷管理',
    order: 30,
  },
  questions: {
    label: '题库管理',
    order: 40,
  },
  spot_checks: {
    label: '抽查管理',
    order: 60,
  },
  users: {
    label: '用户管理',
    order: 70,
  },
  activity_logs: {
    label: '日志管理',
    order: 85,
  },
};

export const getModulePresentation = (moduleCode: string): ModulePresentationMeta => (
  MODULE_PRESENTATION[moduleCode] ?? {
    label: moduleCode,
    order: 999,
  }
);

const ACTION_LABELS: Record<string, string> = {
  view: '查看',
  add: '创建',
  change: '更新',
  delete: '删除',
};

const RESOURCE_LABELS: Record<string, string> = {
  'tasks.task': '任务',
  'knowledge.knowledge': '知识',
  'tags.tag': '标签',
  'quizzes.quiz': '试卷',
  'questions.question': '题目',
  'spot_checks.spotcheck': '抽查',
  'users.user': '用户',
  'activity_logs.activitylog': '活动日志',
  'activity_logs.activitylogpolicy': '日志策略',
};

export const getPermissionLabel = (code: string, name: string): string => {
  const match = code.match(/^([^.]+)\.(view|add|change|delete)_(.+)$/);
  const resource = match && RESOURCE_LABELS[`${match[1]}.${match[3]}`];
  return resource ? `${ACTION_LABELS[match[2]]}${resource}` : name;
};
