/* eslint-disable react-refresh/only-export-components */
/**
 * 业务路由注册表。
 *
 * 路径、权限、菜单元数据集中声明在这里；角色前缀和实际可访问性由
 * `role-routes` 与 route guard 根据这些 meta 生成，避免菜单和路由各维护一份。
 *
 * 跨 feature 组合只允许发生在 app 层（routes/*）；本文件只做注册与 lazy，
 * 避免把组合依赖打进入口包。
 */
import { lazy, type ComponentType, type ReactElement, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Activity, BookOpen, FileSearch, HelpCircle, ListTodo, Settings, SquareTerminal, Tags, Users } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { PageFillShell, PageShell } from '@/components/ui/page-shell';
import { getRolePathPrefix, normalizeRoleCode } from '@/config/role-paths';
import type { RoleCode } from '@/types/common';
import { AUTHORIZATION_WORKBENCH_ACCESS_PERMISSIONS } from '@/config/authorization-access';
import type { DashboardVariant, WorkspaceConfig } from '@/app/workspace-config';

export type PermissionMode = 'all' | 'any';
export type MenuLabelResolver = string | ((workspace: WorkspaceConfig, role: RoleCode) => string);

export type MenuMeta = {
  label: MenuLabelResolver;
  icon?: LucideIcon;
  group?: {
    key: string;
    label: string;
    icon: LucideIcon;
    order: number;
  };
  order: number;
};

type BaseRouteMeta = {
  key: string;
  path: string;
  allowedRoles?: RoleCode[];
  requiredPermissions?: string[];
  permissionMode?: PermissionMode;
  showInMenu?: boolean;
  menu?: MenuMeta;
  component?: ComponentType;
  render?: () => ReactElement;
};

export type BusinessRouteMeta = BaseRouteMeta & {
  kind: 'business';
};

export interface MenuItem {
  key?: string;
  icon?: ReactNode;
  label: string;
  children?: MenuItem[];
}

export type OrderedMenuItem = {
  order: number;
  item: MenuItem;
};

const StudentDashboard = lazy(() => import('@/features/dashboard/components/student-dashboard').then(m => ({ default: m.StudentDashboard })));
const MentorDashboard = lazy(() => import('@/features/dashboard/components/mentor-dashboard').then(m => ({ default: m.MentorDashboard })));
const TeamManagerDashboard = lazy(() => import('@/features/dashboard/components/team-manager-dashboard').then(m => ({ default: m.TeamManagerDashboard })));
const AdminDashboard = lazy(() => import('@/features/dashboard/components/admin-dashboard').then(m => ({ default: m.AdminDashboard })));

const StudentTaskCenter = lazy(() => import('@/app/routes/student-task-center').then(m => ({ default: m.StudentTaskCenter })));
const TaskManagement = lazy(() => import('@/features/tasks/components/task-management').then(m => ({ default: m.TaskManagement })));
const TaskFormRoutePage = lazy(() => import('@/app/routes/task-form').then(m => ({ default: m.TaskFormRoutePage })));
const TaskDetailRoutePage = lazy(() => import('@/app/routes/task-detail').then(m => ({ default: m.TaskDetailRoutePage })));
const TaskPreviewRoutePage = lazy(() => import('@/app/routes/task-preview').then(m => ({ default: m.TaskPreviewRoutePage })));

const KnowledgeCenterRoutePage = lazy(() => import('@/app/routes/knowledge-center').then(m => ({ default: m.KnowledgeCenterRoutePage })));
const TagManagementPage = lazy(() => import('@/features/tags/components/tag-management-page').then(m => ({ default: m.TagManagementPage })));

const QuizManagementPage = lazy(() => import('@/features/assessment/components/quizzes/quiz-management-page').then(m => ({ default: m.QuizManagementPage })));
const QuizFormRoutePage = lazy(() => import('@/app/routes/quiz-form').then(m => ({ default: m.QuizFormRoutePage })));
const QuestionManagementRoutePage = lazy(() => import('@/app/routes/question-management').then(m => ({ default: m.QuestionManagementRoutePage })));
const QuestionFormRoutePage = lazy(() => import('@/app/routes/question-form').then(m => ({ default: m.QuestionFormRoutePage })));

const SpotCheckList = lazy(() => import('@/features/spot-checks/components/spot-check-list').then(m => ({ default: m.SpotCheckList })));
const SpotCheckForm = lazy(() => import('@/features/spot-checks/components/spot-check-form').then(m => ({ default: m.SpotCheckForm })));

const UserList = lazy(() => import('@/features/user-management/components/users/user-list').then(m => ({ default: m.UserList })));

const AuthorizationCenterPage = lazy(() => import('@/features/user-management/components/authorization/authorization-center-page').then(m => ({ default: m.AuthorizationCenterPage })));
const ActivityLogsPanel = lazy(() => import('@/features/activity-logs/components/activity-logs-panel').then(m => ({ default: m.ActivityLogsPanel })));
const ActivityLogPolicyPanel = lazy(() => import('@/features/activity-logs/components/activity-log-policy-panel').then(m => ({ default: m.ActivityLogPolicyPanel })));

const QuizPlayer = lazy(() => import('@/features/assessment/components/submissions/quiz-player').then(m => ({ default: m.QuizPlayer })));
const AnswerReview = lazy(() => import('@/features/assessment/components/submissions/answer-review').then(m => ({ default: m.AnswerReview })));

const GradingCenterRoutePage = lazy(() => import('@/app/routes/grading-center').then(m => ({ default: m.GradingCenterRoutePage })));

export const getWorkspaceDashboardElement = (variant: DashboardVariant): ReactElement => {
  if (variant === 'student') {
    return <StudentDashboard />;
  }
  if (variant === 'mentor') {
    return <MentorDashboard />;
  }
  if (variant === 'team_manager') {
    return <TeamManagerDashboard />;
  }
  return <AdminDashboard />;
};

const TaskRoutePage = () => {
  const { role } = useParams<{ role: string }>();

  if (normalizeRoleCode(role) === 'STUDENT') {
    return <StudentTaskCenter />;
  }

  return <TaskManagement />;
};

/** 发起抽查统一走列表弹窗，独立 create 路由重定向 */
const SpotCheckCreateRedirect = () => {
  const { role } = useParams<{ role: string }>();
  return <Navigate to={`${getRolePathPrefix(normalizeRoleCode(role))}/spot-checks`} replace />;
};

export const BUSINESS_ROUTE_META: BusinessRouteMeta[] = [
  {
    key: 'tasks',
    kind: 'business',
    path: 'tasks',
    requiredPermissions: ['task.view'],
    showInMenu: true,
    menu: {
      label: (_workspace, role) => (role === 'STUDENT' ? '任务中心' : '任务管理'),
      icon: ListTodo,
      order: 50,
    },
    render: () => <TaskRoutePage />,
  },
  {
    key: 'task-create',
    kind: 'business',
    path: 'tasks/create',
    requiredPermissions: ['task.create'],
    component: TaskFormRoutePage,
  },
  {
    key: 'task-edit',
    kind: 'business',
    path: 'tasks/:id/edit',
    requiredPermissions: ['task.update'],
    component: TaskFormRoutePage,
  },
  {
    key: 'task-preview',
    kind: 'business',
    path: 'tasks/:id/preview',
    requiredPermissions: ['task.update', 'task.analytics.view', 'grading.view'],
    permissionMode: 'any',
    component: TaskPreviewRoutePage,
  },
  {
    key: 'task-detail',
    kind: 'business',
    path: 'tasks/:id',
    requiredPermissions: ['task.view'],
    component: TaskDetailRoutePage,
  },
  {
    key: 'tags',
    kind: 'business',
    path: 'tags',
    requiredPermissions: ['tag.view'],
    showInMenu: true,
    menu: {
      label: '标签管理',
      icon: Tags,
      order: 20,
    },
    component: TagManagementPage,
  },
  {
    key: 'knowledge',
    kind: 'business',
    path: 'knowledge',
    requiredPermissions: ['knowledge.view'],
    showInMenu: true,
    menu: {
      label: (workspace) => (workspace.menuVariant === 'student' ? '知识中心' : '知识管理'),
      icon: BookOpen,
      order: 10,
    },
    component: KnowledgeCenterRoutePage,
  },
  {
    key: 'knowledge-create',
    kind: 'business',
    path: 'knowledge/create',
    requiredPermissions: ['knowledge.create'],
    component: KnowledgeCenterRoutePage,
  },
  {
    key: 'knowledge-edit',
    kind: 'business',
    path: 'knowledge/:id/edit',
    requiredPermissions: ['knowledge.update'],
    component: KnowledgeCenterRoutePage,
  },
  {
    key: 'knowledge-detail',
    kind: 'business',
    path: 'knowledge/:id',
    requiredPermissions: ['knowledge.view'],
    component: KnowledgeCenterRoutePage,
  },
  {
    key: 'quizzes',
    kind: 'business',
    path: 'quizzes',
    requiredPermissions: ['quiz.view', 'quiz.create', 'quiz.update', 'quiz.delete'],
    permissionMode: 'any',
    showInMenu: true,
    menu: {
      label: '试卷管理',
      group: {
        key: 'assessment',
        label: '测评管理',
        icon: HelpCircle,
        order: 40,
      },
      order: 10,
    },
    component: QuizManagementPage,
  },
  {
    key: 'quiz-create',
    kind: 'business',
    path: 'quizzes/create',
    requiredPermissions: ['quiz.create'],
    component: QuizFormRoutePage,
  },
  {
    key: 'quiz-preview',
    kind: 'business',
    path: 'quizzes/:id/preview',
    requiredPermissions: ['quiz.view', 'question.view'],
    component: QuizFormRoutePage,
  },
  {
    key: 'quiz-edit',
    kind: 'business',
    path: 'quizzes/:id/edit',
    requiredPermissions: ['quiz.update'],
    component: QuizFormRoutePage,
  },
  {
    key: 'questions',
    kind: 'business',
    path: 'questions',
    requiredPermissions: ['question.view', 'question.create', 'question.update', 'question.delete'],
    permissionMode: 'any',
    showInMenu: true,
    menu: {
      label: '题目管理',
      group: {
        key: 'assessment',
        label: '测评管理',
        icon: HelpCircle,
        order: 40,
      },
      order: 20,
    },
    component: QuestionManagementRoutePage,
  },
  {
    key: 'question-create',
    kind: 'business',
    path: 'questions/create',
    requiredPermissions: ['question.create'],
    component: QuestionFormRoutePage,
  },
  {
    key: 'question-edit',
    kind: 'business',
    path: 'questions/:id/edit',
    requiredPermissions: ['question.update'],
    component: QuestionFormRoutePage,
  },
  {
    key: 'spot-checks',
    kind: 'business',
    path: 'spot-checks',
    // 学员只有 spot_check.view（看自己的），入口在任务中心「抽查」Tab；
    // 管理端菜单/路由禁止 STUDENT，避免和学员待办入口重复。
    allowedRoles: ['MENTOR', 'DEPT_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'TEAM_MANAGER'],
    requiredPermissions: ['spot_check.view'],
    showInMenu: true,
    menu: {
      label: '抽查管理',
      icon: FileSearch,
      order: 60,
    },
    component: SpotCheckList,
  },
  {
    key: 'spot-check-create',
    kind: 'business',
    path: 'spot-checks/create',
    allowedRoles: ['MENTOR', 'DEPT_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'TEAM_MANAGER'],
    requiredPermissions: ['spot_check.create'],
    // 发起统一在列表弹窗完成（左侧选人/勾选）
    render: () => <SpotCheckCreateRedirect />,
  },
  {
    key: 'spot-check-edit',
    kind: 'business',
    path: 'spot-checks/:id/edit',
    allowedRoles: ['MENTOR', 'DEPT_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'TEAM_MANAGER'],
    requiredPermissions: ['spot_check.view'],
    component: SpotCheckForm,
  },
  {
    key: 'users',
    kind: 'business',
    path: 'users',
    requiredPermissions: ['user.view'],
    showInMenu: true,
    menu: {
      label: '用户列表',
      group: {
        key: 'users',
        label: '用户管理',
        icon: Users,
        order: 70,
      },
      order: 10,
    },
    component: UserList,
  },
  {
    key: 'audit-log-policy',
    kind: 'business',
    path: 'audit-logs/policy',
    requiredPermissions: ['activity_log.policy.update'],
    showInMenu: true,
    menu: {
      label: '日志策略',
      group: {
        key: 'log-management',
        label: '日志管理',
        icon: SquareTerminal,
        order: 80,
      },
      order: 20,
    },
    render: () => (
      <PageShell>
        <PageHeader title="日志策略" icon={<Settings />} />
        <ActivityLogPolicyPanel />
      </PageShell>
    ),
  },
  {
    key: 'audit-logs',
    kind: 'business',
    path: 'audit-logs',
    requiredPermissions: ['activity_log.view'],
    showInMenu: true,
    menu: {
      label: '日志审计',
      group: {
        key: 'log-management',
        label: '日志管理',
        icon: SquareTerminal,
        order: 80,
      },
      order: 10,
    },
    render: () => (
      <PageFillShell>
        <PageHeader title="日志审计" icon={<Activity />} />
        <ActivityLogsPanel />
      </PageFillShell>
    ),
  },
  {
    key: 'authorization-center',
    kind: 'business',
    path: 'authorization',
    requiredPermissions: AUTHORIZATION_WORKBENCH_ACCESS_PERMISSIONS,
    permissionMode: 'any',
    showInMenu: true,
    menu: {
      label: '用户授权',
      group: {
        key: 'users',
        label: '用户管理',
        icon: Users,
        order: 70,
      },
      order: 20,
    },
    component: AuthorizationCenterPage,
  },
  {
    key: 'quiz-player',
    kind: 'business',
    path: 'quiz/:id',
    requiredPermissions: ['submission.answer'],
    component: QuizPlayer,
  },
  {
    key: 'review-practice',
    kind: 'business',
    path: 'review/practice',
    requiredPermissions: ['submission.review'],
    render: () => <AnswerReview type="practice" />,
  },
  {
    key: 'review-exam',
    kind: 'business',
    path: 'review/exam',
    requiredPermissions: ['submission.review'],
    render: () => <AnswerReview type="exam" />,
  },
  {
    key: 'grading-center',
    kind: 'business',
    path: 'grading-center',
    requiredPermissions: ['grading.view'],
    showInMenu: true,
    menu: {
      label: '阅卷中心',
      group: {
        key: 'assessment',
        label: '测评管理',
        icon: HelpCircle,
        order: 40,
      },
      order: 30,
    },
    component: GradingCenterRoutePage,
  },
];

export const getBusinessRouteElement = (route: BusinessRouteMeta): ReactElement => {
  if (route.render) {
    return route.render();
  }

  if (!route.component) {
    throw new Error(`路由 ${route.key} 缺少 component/render`);
  }

  const Component = route.component;
  return <Component />;
};
