interface ModulePresentationMeta {
  label: string;
  order: number;
}

export const MODULE_PRESENTATION: Record<string, ModulePresentationMeta> = {
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
    label: '配置管理',
    order: 80,
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

export const getModulePresentation = (moduleCode: string): ModulePresentationMeta => (
  MODULE_PRESENTATION[moduleCode] ?? {
    label: moduleCode,
    order: 999,
  }
);
