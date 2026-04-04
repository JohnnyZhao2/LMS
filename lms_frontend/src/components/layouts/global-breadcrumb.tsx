import React from 'react';
import { matchPath, useLocation, useParams } from 'react-router-dom';
import { BreadcrumbNav, type BreadcrumbItem } from '@/components/ui/breadcrumb-nav';
import { ROUTES } from '@/config/routes';
import type { RoleCode } from '@/types/api';

const resolveTaskLabel = (role: RoleCode | null) => (
  role === 'ADMIN' || role === 'SUPER_ADMIN' ? '任务管理' : '任务中心'
)

const resolveKnowledgeLabel = (role: RoleCode | null) => (
  role === 'STUDENT' || role === 'TEAM_MANAGER' ? '知识中心' : '知识管理'
)

const buildRolePath = (role: string | undefined, route: string) => (
  role ? `/${role}${route}` : route
)

const createBreadcrumbs = (
  pathname: string,
  role: string | undefined,
  roleCode: RoleCode | null,
  entry: string | null,
): BreadcrumbItem[] => {
  const taskLabel = resolveTaskLabel(roleCode)
  const knowledgeLabel = resolveKnowledgeLabel(roleCode)
  const tasksPath = buildRolePath(role, ROUTES.TASKS)
  const knowledgePath = buildRolePath(role, ROUTES.KNOWLEDGE)
  const quizzesPath = buildRolePath(role, ROUTES.QUIZZES)
  const auditLogsPath = buildRolePath(role, ROUTES.AUDIT_LOGS)
  const spotChecksPath = buildRolePath(role, ROUTES.SPOT_CHECKS)

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
    { pattern: '/:role/quizzes', items: [{ title: '测评管理', path: quizzesPath }, { title: '试卷管理' }] },
    { pattern: '/:role/questions', items: [{ title: '测评管理', path: quizzesPath }, { title: '题目管理' }] },
    {
      pattern: '/:role/grading-center',
      items: entry === 'task-management'
        ? [{ title: taskLabel, path: tasksPath }, { title: '阅卷中心' }]
        : [{ title: '测评管理', path: quizzesPath }, { title: '阅卷中心' }]
    },
    { pattern: '/:role/tasks/create', items: [{ title: taskLabel, path: tasksPath }, { title: '新建任务' }] },
    { pattern: '/:role/tasks/:id/edit', items: [{ title: taskLabel, path: tasksPath }, { title: '编辑任务' }] },
    { pattern: '/:role/tasks/:id/preview', items: [{ title: taskLabel, path: tasksPath }, { title: '任务预览' }] },
    { pattern: '/:role/tasks/:id', items: [{ title: taskLabel, path: tasksPath }, { title: '任务详情' }] },
    { pattern: '/:role/tasks', items: [{ title: taskLabel }] },
    { pattern: '/:role/spot-checks/create', items: [{ title: '抽查管理', path: spotChecksPath }, { title: '发起抽查' }] },
    { pattern: '/:role/spot-checks/:id/edit', items: [{ title: '抽查管理', path: spotChecksPath }, { title: '编辑抽查' }] },
    { pattern: '/:role/spot-checks', items: [{ title: '抽查管理' }] },
    { pattern: '/:role/users', items: [{ title: '用户管理' }] },
    { pattern: '/:role/authorization', items: [{ title: '角色模板' }] },
    { pattern: '/:role/audit-logs/policy', items: [{ title: '日志审计', path: auditLogsPath }, { title: '日志策略' }] },
    { pattern: '/:role/audit-logs', items: [{ title: '日志审计' }] },
    { pattern: '/:role/quiz/:id', items: [{ title: taskLabel, path: tasksPath }, { title: '在线答题' }] },
    { pattern: '/:role/review/practice', items: [{ title: taskLabel, path: tasksPath }, { title: '练习回顾' }] },
    { pattern: '/:role/review/exam', items: [{ title: taskLabel, path: tasksPath }, { title: '考试回顾' }] },
    { pattern: '/:role/personal', items: [{ title: '个人中心' }] },
    { pattern: '/:role/analytics', items: [{ title: '数据看板' }] },
  ]

  const matchedRoute = routePatterns.find((route) => matchPath({ path: route.pattern, end: true }, pathname))
  return matchedRoute?.items ?? []
}

export const GlobalBreadcrumb: React.FC = () => {
  const location = useLocation()
  const { role } = useParams<{ role: string }>()
  const roleCode = role?.toUpperCase() as RoleCode | undefined
  const homePath = buildRolePath(role, ROUTES.DASHBOARD)
  const entry = React.useMemo(() => new URLSearchParams(location.search).get('entry'), [location.search])

  const items = React.useMemo(
    () => createBreadcrumbs(location.pathname, role, roleCode ?? null, entry),
    [entry, location.pathname, role, roleCode],
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
