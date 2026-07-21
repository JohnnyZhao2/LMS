import React from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { BreadcrumbNav, type BreadcrumbItem } from '@/components/ui/breadcrumb-nav';
import { ROUTES } from '@/config/routes';
import { useCurrentRole } from '@/hooks/use-current-role';
import { getWorkspaceHome, getWorkspacePath } from '@/config/role-paths';
import type { RoleCode } from '@/types/common';
import { getWorkspaceConfig } from '@/app/workspace-config';

const resolveKnowledgeLabel = (role: RoleCode | null) => {
  const workspace = getWorkspaceConfig(role);
  return workspace?.menuVariant === 'student' ? '知识中心' : '知识管理';
}

const resolveTaskPreviewLabel = (tab: string | null) => {
  if (tab === 'grading') {
    return '阅卷中心'
  }
  return '进度监控'
}

/** 管理端任务链路：任务管理 > 综合任务 [> leaf]；学员：任务中心 [> leaf] */
const taskCrumbs = (
  roleCode: RoleCode | null,
  tasksPath: string,
  leaf?: string,
): BreadcrumbItem[] => {
  if (roleCode === 'STUDENT') {
    return leaf
      ? [{ title: '任务中心', path: tasksPath }, { title: leaf }]
      : [{ title: '任务中心' }]
  }
  return leaf
    ? [
        { title: '任务管理', path: tasksPath },
        { title: '综合任务', path: tasksPath },
        { title: leaf },
      ]
    : [
        { title: '任务管理', path: tasksPath },
        { title: '综合任务' },
      ]
}

const createBreadcrumbs = (
  pathname: string,
  roleCode: RoleCode | null,
  entry: string | null,
  taskPreviewTab: string | null,
): BreadcrumbItem[] => {
  const buildWorkspaceRoute = (route: string) => getWorkspacePath(roleCode, route) ?? route
  const knowledgeLabel = resolveKnowledgeLabel(roleCode)
  const taskPreviewLabel = resolveTaskPreviewLabel(taskPreviewTab)
  const tasksPath = buildWorkspaceRoute(ROUTES.TASKS)
  const knowledgePath = buildWorkspaceRoute(ROUTES.KNOWLEDGE)
  const quizzesPath = buildWorkspaceRoute(ROUTES.QUIZZES)
  const spotChecksPath = buildWorkspaceRoute(ROUTES.SPOT_CHECKS)

  const routePatterns: Array<{
    pattern: string
    items: BreadcrumbItem[]
  }> = [
    { pattern: '/:role/dashboard', items: [{ title: '概览' }] },
    { pattern: '/:role/knowledge/create', items: [{ title: knowledgeLabel, path: knowledgePath }, { title: '新建知识' }] },
    { pattern: '/:role/knowledge/:id/edit', items: [{ title: knowledgeLabel, path: knowledgePath }, { title: '编辑知识' }] },
    { pattern: '/:role/knowledge/:id', items: [{ title: knowledgeLabel, path: knowledgePath }, { title: '知识详情' }] },
    { pattern: '/:role/knowledge', items: [{ title: knowledgeLabel }] },
    { pattern: '/:role/tags', items: [{ title: '标签管理' }] },
    { pattern: '/:role/quizzes/create', items: [{ title: '测评管理', path: quizzesPath }, { title: '试卷管理', path: quizzesPath }, { title: '新建试卷' }] },
    { pattern: '/:role/quizzes/:id/edit', items: [{ title: '测评管理', path: quizzesPath }, { title: '试卷管理', path: quizzesPath }, { title: '编辑试卷' }] },
    { pattern: '/:role/quizzes/:id/preview', items: [{ title: '测评管理', path: quizzesPath }, { title: '试卷管理', path: quizzesPath }, { title: '试卷预览' }] },
    { pattern: '/:role/quizzes', items: [{ title: '测评管理', path: quizzesPath }, { title: '试卷管理' }] },
    { pattern: '/:role/questions/create', items: [{ title: '测评管理', path: quizzesPath }, { title: '题目管理', path: buildWorkspaceRoute(ROUTES.QUESTIONS) }, { title: '新建题目' }] },
    { pattern: '/:role/questions/:id/edit', items: [{ title: '测评管理', path: quizzesPath }, { title: '题目管理', path: buildWorkspaceRoute(ROUTES.QUESTIONS) }, { title: '编辑题目' }] },
    { pattern: '/:role/questions', items: [{ title: '测评管理', path: quizzesPath }, { title: '题目管理' }] },
    {
      pattern: '/:role/grading-center',
      items: entry === 'task-management'
        ? taskCrumbs(roleCode, tasksPath, '阅卷中心')
        : [{ title: '阅卷中心' }]
    },
    { pattern: '/:role/tasks/create', items: taskCrumbs(roleCode, tasksPath, '新建任务') },
    { pattern: '/:role/tasks/:id/edit', items: taskCrumbs(roleCode, tasksPath, '编辑任务') },
    { pattern: '/:role/tasks/:id/preview', items: taskCrumbs(roleCode, tasksPath, taskPreviewLabel) },
    { pattern: '/:role/tasks/:id', items: taskCrumbs(roleCode, tasksPath, '任务详情') },
    { pattern: '/:role/tasks', items: taskCrumbs(roleCode, tasksPath) },
    { pattern: '/:role/spot-checks/create', items: [{ title: '任务管理', path: tasksPath }, { title: '抽查任务', path: spotChecksPath }, { title: '发起抽查' }] },
    { pattern: '/:role/spot-checks/:id/edit', items: [{ title: '任务管理', path: tasksPath }, { title: '抽查任务', path: spotChecksPath }, { title: '抽查详情' }] },
    { pattern: '/:role/spot-checks', items: [{ title: '任务管理', path: tasksPath }, { title: '抽查任务' }] },
    { pattern: '/:role/users', items: [{ title: '用户管理' }, { title: '用户列表' }] },
    { pattern: '/:role/authorization', items: [{ title: '用户管理', path: buildWorkspaceRoute(ROUTES.USERS) }, { title: '用户授权' }] },
    { pattern: '/:role/audit-logs/policy', items: [{ title: '日志管理', path: buildWorkspaceRoute(ROUTES.AUDIT_LOGS) }, { title: '日志策略' }] },
    { pattern: '/:role/audit-logs', items: [{ title: '日志管理' }, { title: '日志审计' }] },
    { pattern: '/:role/quiz/:id', items: taskCrumbs(roleCode, tasksPath, '在线答题') },
    { pattern: '/:role/review/practice', items: taskCrumbs(roleCode, tasksPath, '测验回顾') },
    { pattern: '/:role/review/exam', items: taskCrumbs(roleCode, tasksPath, '考试回顾') },
  ]

  const matchedRoute = routePatterns.find((route) => matchPath({ path: route.pattern, end: true }, pathname))
  return matchedRoute?.items ?? []
}

export const GlobalBreadcrumb: React.FC = () => {
  const location = useLocation()
  const currentRole = useCurrentRole()
  const homePath = getWorkspaceHome(currentRole) ?? ROUTES.DASHBOARD
  const { entry, taskPreviewTab } = React.useMemo(() => {
    const searchParams = new URLSearchParams(location.search)
    return {
      entry: searchParams.get('entry'),
      taskPreviewTab: searchParams.get('tab'),
    }
  }, [location.search])
  const items = React.useMemo(
    () => createBreadcrumbs(location.pathname, currentRole, entry, taskPreviewTab),
    [currentRole, entry, location.pathname, taskPreviewTab],
  )

  if (items.length === 0) {
    return null
  }

  return (
    <div className="mb-4 flex min-w-0 items-center md:mb-5">
      <BreadcrumbNav items={items} homePath={homePath} />
    </div>
  )
}
