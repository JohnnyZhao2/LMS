import React from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { BreadcrumbNav, type BreadcrumbItem } from '@/components/ui/breadcrumb-nav';
import { ROUTES } from '@/config/routes';
import { useWorkbench } from '@/session/hooks/use-workbench';
import type { Workbench } from '@/types/common';

const resolveTaskLabel = (workbench: Workbench) =>
  workbench === 'manage' ? '任务管理' : '任务中心';

const resolveKnowledgeLabel = (workbench: Workbench) =>
  workbench === 'learn' ? '知识中心' : '知识管理';

const resolveTaskPreviewLabel = (tab: string | null) => {
  if (tab === 'grading') {
    return '阅卷中心';
  }
  return '进度监控';
};

const createBreadcrumbs = (
  pathname: string,
  workbench: Workbench,
  entry: string | null,
  taskPreviewTab: string | null,
): BreadcrumbItem[] => {
  const taskLabel = resolveTaskLabel(workbench);
  const knowledgeLabel = resolveKnowledgeLabel(workbench);
  const taskPreviewLabel = resolveTaskPreviewLabel(taskPreviewTab);

  const routePatterns: Array<{
    pattern: string;
    items: BreadcrumbItem[];
  }> = [
    { pattern: '/dashboard', items: [{ title: '概览' }] },
    { pattern: '/knowledge/create', items: [{ title: knowledgeLabel, path: ROUTES.KNOWLEDGE }, { title: '新建知识' }] },
    { pattern: '/knowledge/:id/edit', items: [{ title: knowledgeLabel, path: ROUTES.KNOWLEDGE }, { title: '编辑知识' }] },
    { pattern: '/knowledge/:id', items: [{ title: knowledgeLabel, path: ROUTES.KNOWLEDGE }, { title: '知识详情' }] },
    { pattern: '/knowledge', items: [{ title: knowledgeLabel }] },
    { pattern: '/tags', items: [{ title: '标签管理' }] },
    { pattern: '/quizzes/create', items: [{ title: '测评管理', path: ROUTES.QUIZZES }, { title: '试卷管理', path: ROUTES.QUIZZES }, { title: '新建试卷' }] },
    { pattern: '/quizzes/:id/edit', items: [{ title: '测评管理', path: ROUTES.QUIZZES }, { title: '试卷管理', path: ROUTES.QUIZZES }, { title: '编辑试卷' }] },
    { pattern: '/quizzes/:id/preview', items: [{ title: '测评管理', path: ROUTES.QUIZZES }, { title: '试卷管理', path: ROUTES.QUIZZES }, { title: '试卷预览' }] },
    { pattern: '/quizzes', items: [{ title: '测评管理', path: ROUTES.QUIZZES }, { title: '试卷管理' }] },
    { pattern: '/questions/create', items: [{ title: '测评管理', path: ROUTES.QUIZZES }, { title: '题目管理', path: ROUTES.QUESTIONS }, { title: '新建题目' }] },
    { pattern: '/questions/:id/edit', items: [{ title: '测评管理', path: ROUTES.QUIZZES }, { title: '题目管理', path: ROUTES.QUESTIONS }, { title: '编辑题目' }] },
    { pattern: '/questions', items: [{ title: '测评管理', path: ROUTES.QUIZZES }, { title: '题目管理' }] },
    {
      pattern: '/grading-center',
      items: entry === 'task-management'
        ? [{ title: taskLabel, path: ROUTES.TASKS }, { title: '阅卷中心' }]
        : [{ title: '测评管理', path: ROUTES.QUIZZES }, { title: '阅卷中心' }],
    },
    { pattern: '/tasks/create', items: [{ title: taskLabel, path: ROUTES.TASKS }, { title: '新建任务' }] },
    { pattern: '/tasks/:id/edit', items: [{ title: taskLabel, path: ROUTES.TASKS }, { title: '编辑任务' }] },
    { pattern: '/tasks/:id/preview', items: [{ title: taskLabel, path: ROUTES.TASKS }, { title: taskPreviewLabel }] },
    { pattern: '/tasks/:id', items: [{ title: taskLabel, path: ROUTES.TASKS }, { title: '任务详情' }] },
    { pattern: '/tasks', items: [{ title: taskLabel }] },
    { pattern: '/spot-checks/create', items: [{ title: '抽查管理', path: ROUTES.SPOT_CHECKS }, { title: '发起抽查' }] },
    { pattern: '/spot-checks/:id/edit', items: [{ title: '抽查管理', path: ROUTES.SPOT_CHECKS }, { title: '抽查详情' }] },
    { pattern: '/spot-checks', items: [{ title: '抽查管理' }] },
    { pattern: '/users', items: [{ title: '用户管理' }, { title: '用户列表' }] },
    { pattern: '/authorization', items: [{ title: '用户管理', path: ROUTES.USERS }, { title: '用户授权' }] },
    { pattern: '/audit-logs/policy', items: [{ title: '日志管理', path: ROUTES.AUDIT_LOGS }, { title: '日志策略' }] },
    { pattern: '/audit-logs', items: [{ title: '日志管理' }, { title: '日志审计' }] },
    { pattern: '/quiz/:id', items: [{ title: taskLabel, path: ROUTES.TASKS }, { title: '在线答题' }] },
    { pattern: '/review/practice', items: [{ title: taskLabel, path: ROUTES.TASKS }, { title: '测验回顾' }] },
    { pattern: '/review/exam', items: [{ title: taskLabel, path: ROUTES.TASKS }, { title: '考试回顾' }] },
  ];

  const matchedRoute = routePatterns.find((route) => matchPath({ path: route.pattern, end: true }, pathname));
  return matchedRoute?.items ?? [];
};

export const GlobalBreadcrumb: React.FC = () => {
  const location = useLocation();
  const workbench = useWorkbench();
  const { entry, taskPreviewTab } = React.useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return {
      entry: searchParams.get('entry'),
      taskPreviewTab: searchParams.get('tab'),
    };
  }, [location.search]);
  const items = React.useMemo(
    () => createBreadcrumbs(location.pathname, workbench, entry, taskPreviewTab),
    [entry, location.pathname, taskPreviewTab, workbench],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 flex min-w-0 items-center md:mb-5">
      <BreadcrumbNav items={items} homePath={ROUTES.DASHBOARD} />
    </div>
  );
};
