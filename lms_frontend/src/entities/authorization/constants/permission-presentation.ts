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
