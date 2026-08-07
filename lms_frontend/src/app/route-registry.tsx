/* eslint-disable react-refresh/only-export-components */
/**
 * 业务路由注册表。
 *
 * 路径、权限、菜单元数据集中声明在这里；角色前缀和实际可访问性由
 * `role-routes` 与 route guard 根据这些 meta 生成，避免菜单和路由各维护一份。
 */
import { lazy, type ComponentType, type ReactElement, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Activity, BookOpen, FileSearch, HelpCircle, ListTodo, Settings, SquareTerminal, Tags, Users } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { PageFillShell, PageShell } from '@/components/ui/page-shell';
import { useAuth } from '@/session/auth/auth-context';
import { getRolePathPrefix, normalizeRoleCode } from '@/session/workspace/role-paths';
import type { RoleCode } from '@/types/common';
import { AUTHORIZATION_WORKBENCH_ACCESS_PERMISSIONS } from '@/entities/authorization/constants/access';
import type { DashboardVariant, WorkspaceConfig } from './workspace-config';

export type PermissionMode = 'all' | 'any';
export type MenuLabelResolver = string | ((workspace: WorkspaceConfig, role: RoleCode) => string);

const SHARED_WORKSPACE_ROLES: RoleCode[] = ['STUDENT', 'MENTOR', 'DEPT_MANAGER', 'ADMIN', 'SUPER_ADMIN'];
const MANAGEMENT_WORKSPACE_ROLES: RoleCode[] = ['MENTOR', 'DEPT_MANAGER', 'ADMIN', 'SUPER_ADMIN'];

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
const AdminDashboard = lazy(() => import('@/features/dashboard/components/admin-dashboard').then(m => ({ default: m.AdminDashboard })));

const StudentTaskCenter = lazy(() => import('@/app/routes/student-task-center').then(m => ({ default: m.StudentTaskCenter })));
const TaskManagement = lazy(() => import('@/features/tasks/components/task-management').then(m => ({ default: m.TaskManagement })));
const TaskDetail = lazy(() => import('@/features/tasks/components/task-detail').then(m => ({ default: m.TaskDetail })));
const TaskForm = lazy(() => import('@/features/tasks/components/task-form/task-form').then(m => ({ default: m.TaskForm })));
const TaskPreviewPage = lazy(() => import('@/features/tasks/components/task-preview/task-preview-page').then(m => ({ default: m.TaskPreviewPage })));

const KnowledgeCenter = lazy(() => import('@/features/knowledge/components/knowledge-center').then(m => ({ default: m.KnowledgeCenter })));
const TagManagementPage = lazy(() => import('@/features/tags/components/tag-management-page').then(m => ({ default: m.TagManagementPage })));

const QuizManagementPage = lazy(() => import('@/features/quiz-center/components/quiz-management-page').then(m => ({ default: m.QuizManagementPage })));
const QuizForm = lazy(() => import('@/features/quiz-center/quizzes/components/quiz-form').then(m => ({ default: m.QuizForm })));
const QuestionManagementPage = lazy(() => import('@/features/questions/components/question-management-page').then(m => ({ default: m.QuestionManagementPage })));
const QuestionFormPage = lazy(() => import('@/features/questions/components/question-form-page').then(m => ({ default: m.QuestionFormPage })));

const SpotCheckList = lazy(() => import('@/features/spot-checks/components/spot-check-list').then(m => ({ default: m.SpotCheckList })));
const SpotCheckForm = lazy(() => import('@/features/spot-checks/components/spot-check-form').then(m => ({ default: m.SpotCheckForm })));

const UserList = lazy(() => import('@/features/users/components/user-list').then(m => ({ default: m.UserList })));

const AuthorizationCenterPage = lazy(() => import('@/features/authorization/pages/authorization-center-page').then(m => ({ default: m.AuthorizationCenterPage })));
const ActivityLogsPanel = lazy(() => import('@/features/activity-logs/components/activity-logs-panel').then(m => ({ default: m.ActivityLogsPanel })));
const ActivityLogPolicyPanel = lazy(() => import('@/features/activity-logs/components/activity-log-policy-panel').then(m => ({ default: m.ActivityLogPolicyPanel })));

const QuizPlayer = lazy(() => import('@/features/submissions/components/quiz-player').then(m => ({ default: m.QuizPlayer })));
const AnswerReview = lazy(() => import('@/features/submissions/components/answer-review').then(m => ({ default: m.AnswerReview })));

const GradingCenterPage = lazy(() => import('@/features/grading/components/grading-center-page').then(m => ({ default: m.GradingCenterPage })));

export const getWorkspaceDashboardElement = (variant: DashboardVariant): ReactElement => {
  if (variant === 'student') {
    return <StudentDashboard />;
  }
  if (variant === 'mentor') {
    return <MentorDashboard />;
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

const TaskDetailRoutePage = () => {
  const { id, role } = useParams<{ id: string; role: string }>();
  const { hasCapability } = useAuth();
  const normalizedRole = normalizeRoleCode(role);

  if (normalizedRole === 'STUDENT' || !hasCapability('tasks.change_task')) {
    return <TaskDetail />;
  }

  const rolePrefix = getRolePathPrefix(normalizedRole);
  return <Navigate to={`${rolePrefix}/tasks/${id}/edit`} replace />;
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
    allowedRoles: SHARED_WORKSPACE_ROLES,
    requiredPermissions: ['tasks.view_task'],
    showInMenu: true,
    menu: {
      label: (workspace) => (workspace.menuVariant === 'admin' ? '任务管理' : '任务中心'),
      icon: ListTodo,
      order: 50,
    },
    render: () => <TaskRoutePage />,
  },
  {
    key: 'task-create',
    kind: 'business',
    path: 'tasks/create',
    allowedRoles: MANAGEMENT_WORKSPACE_ROLES,
    requiredPermissions: ['tasks.add_task'],
    component: TaskForm,
  },
  {
    key: 'task-edit',
    kind: 'business',
    path: 'tasks/:id/edit',
    allowedRoles: MANAGEMENT_WORKSPACE_ROLES,
    requiredPermissions: ['tasks.change_task'],
    component: TaskForm,
  },
  {
    key: 'task-preview',
    kind: 'business',
    path: 'tasks/:id/preview',
    allowedRoles: MANAGEMENT_WORKSPACE_ROLES,
    requiredPermissions: ['tasks.change_task', 'tasks.view_task_analytics', 'tasks.view_grading'],
    permissionMode: 'any',
    component: TaskPreviewPage,
  },
  {
    key: 'task-detail',
    kind: 'business',
    path: 'tasks/:id',
    allowedRoles: SHARED_WORKSPACE_ROLES,
    requiredPermissions: ['tasks.view_task'],
    render: () => <TaskDetailRoutePage />,
  },
  {
    key: 'tags',
    kind: 'business',
    path: 'tags',
    allowedRoles: MANAGEMENT_WORKSPACE_ROLES,
    requiredPermissions: ['tags.view_tag'],
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
    allowedRoles: SHARED_WORKSPACE_ROLES,
    requiredPermissions: ['knowledge.view_knowledge'],
    showInMenu: true,
    menu: {
      label: (workspace) => (workspace.menuVariant === 'student' ? '知识中心' : '知识管理'),
      icon: BookOpen,
      order: 10,
    },
    component: KnowledgeCenter,
  },
  {
    key: 'knowledge-create',
    kind: 'business',
    path: 'knowledge/create',
    allowedRoles: MANAGEMENT_WORKSPACE_ROLES,
    requiredPermissions: ['knowledge.add_knowledge'],
    component: KnowledgeCenter,
  },
  {
    key: 'knowledge-edit',
    kind: 'business',
    path: 'knowledge/:id/edit',
    allowedRoles: MANAGEMENT_WORKSPACE_ROLES,
    requiredPermissions: ['knowledge.change_knowledge'],
    component: KnowledgeCenter,
  },
  {
    key: 'knowledge-detail',
    kind: 'business',
    path: 'knowledge/:id',
    allowedRoles: SHARED_WORKSPACE_ROLES,
    requiredPermissions: ['knowledge.view_knowledge'],
    component: KnowledgeCenter,
  },
  {
    key: 'quizzes',
    kind: 'business',
    path: 'quizzes',
    allowedRoles: MANAGEMENT_WORKSPACE_ROLES,
    requiredPermissions: ['quizzes.view_quiz', 'quizzes.add_quiz', 'quizzes.change_quiz', 'quizzes.delete_quiz'],
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
    allowedRoles: MANAGEMENT_WORKSPACE_ROLES,
    requiredPermissions: ['quizzes.add_quiz'],
    component: QuizForm,
  },
  {
    key: 'quiz-preview',
    kind: 'business',
    path: 'quizzes/:id/preview',
    allowedRoles: MANAGEMENT_WORKSPACE_ROLES,
    requiredPermissions: ['quizzes.view_quiz', 'questions.view_question'],
    component: QuizForm,
  },
  {
    key: 'quiz-edit',
    kind: 'business',
    path: 'quizzes/:id/edit',
    allowedRoles: MANAGEMENT_WORKSPACE_ROLES,
    requiredPermissions: ['quizzes.change_quiz'],
    component: QuizForm,
  },
  {
    key: 'questions',
    kind: 'business',
    path: 'questions',
    allowedRoles: MANAGEMENT_WORKSPACE_ROLES,
    requiredPermissions: ['questions.view_question', 'questions.add_question', 'questions.change_question', 'questions.delete_question'],
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
    component: QuestionManagementPage,
  },
  {
    key: 'question-create',
    kind: 'business',
    path: 'questions/create',
    allowedRoles: MANAGEMENT_WORKSPACE_ROLES,
    requiredPermissions: ['questions.add_question'],
    component: QuestionFormPage,
  },
  {
    key: 'question-edit',
    kind: 'business',
    path: 'questions/:id/edit',
    allowedRoles: MANAGEMENT_WORKSPACE_ROLES,
    requiredPermissions: ['questions.change_question'],
    component: QuestionFormPage,
  },
  {
    key: 'spot-checks',
    kind: 'business',
    path: 'spot-checks',
    // 学员只有 spot_checks.view_spotcheck（看自己的），入口在任务中心「抽查」Tab；
    // 管理端菜单/路由禁止 STUDENT，避免和学员待办入口重复。
    allowedRoles: ['MENTOR', 'DEPT_MANAGER', 'ADMIN', 'SUPER_ADMIN'],
    requiredPermissions: ['spot_checks.view_spotcheck'],
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
    allowedRoles: ['MENTOR', 'DEPT_MANAGER', 'ADMIN', 'SUPER_ADMIN'],
    requiredPermissions: ['spot_checks.add_spotcheck'],
    // 发起统一在列表弹窗完成（左侧选人/勾选）
    render: () => <SpotCheckCreateRedirect />,
  },
  {
    key: 'spot-check-edit',
    kind: 'business',
    path: 'spot-checks/:id/edit',
    allowedRoles: ['MENTOR', 'DEPT_MANAGER', 'ADMIN', 'SUPER_ADMIN'],
    requiredPermissions: ['spot_checks.view_spotcheck', 'spot_checks.change_spotcheck'],
    component: SpotCheckForm,
  },
  {
    key: 'users',
    kind: 'business',
    path: 'users',
    allowedRoles: MANAGEMENT_WORKSPACE_ROLES,
    requiredPermissions: ['users.view_user'],
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
    allowedRoles: MANAGEMENT_WORKSPACE_ROLES,
    requiredPermissions: ['activity_logs.change_activitylogpolicy'],
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
    allowedRoles: MANAGEMENT_WORKSPACE_ROLES,
    requiredPermissions: ['activity_logs.view_activitylog'],
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
    allowedRoles: MANAGEMENT_WORKSPACE_ROLES,
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
    allowedRoles: ['STUDENT'],
    component: QuizPlayer,
  },
  {
    key: 'review-practice',
    kind: 'business',
    path: 'review/practice',
    allowedRoles: ['STUDENT'],
    render: () => <AnswerReview type="practice" />,
  },
  {
    key: 'review-exam',
    kind: 'business',
    path: 'review/exam',
    allowedRoles: ['STUDENT'],
    render: () => <AnswerReview type="exam" />,
  },
  {
    key: 'grading-center',
    kind: 'business',
    path: 'grading-center',
    allowedRoles: MANAGEMENT_WORKSPACE_ROLES,
    requiredPermissions: ['tasks.view_grading'],
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
    component: GradingCenterPage,
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
