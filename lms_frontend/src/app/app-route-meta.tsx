/* eslint-disable react-refresh/only-export-components */
import { lazy, type ComponentType, type ReactElement, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BookOpen,
  FileSearch,
  HelpCircle,
  LayoutGrid,
  Settings,
  ShieldCheck,
  SquareCheck,
  SquareTerminal,
  Tags,
  Users,
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import type { RoleCode } from '@/types/common';
import { PageHeader } from '@/components/ui/page-header';
import { PageFillShell, PageShell } from '@/components/ui/page-shell';
import {
  getRolePathPrefix,
  getWorkspaceConfig,
  normalizeRoleCode,
  type DashboardVariant,
  type WorkspaceConfig,
} from './workspace-config';

const StudentDashboard = lazy(() => import('@/features/dashboard/components/student-dashboard').then(m => ({ default: m.StudentDashboard })));
const MentorDashboard = lazy(() => import('@/features/dashboard/components/mentor-dashboard').then(m => ({ default: m.MentorDashboard })));
const TeamManagerDashboard = lazy(() => import('@/features/dashboard/components/team-manager-dashboard').then(m => ({ default: m.TeamManagerDashboard })));
const AdminDashboard = lazy(() => import('@/features/dashboard/components/admin-dashboard').then(m => ({ default: m.AdminDashboard })));

const StudentTaskList = lazy(() => import('@/features/tasks/components/student-task-list').then(m => ({ default: m.StudentTaskList })));
const TaskManagement = lazy(() => import('@/features/tasks/components/task-management').then(m => ({ default: m.TaskManagement })));
const TaskDetail = lazy(() => import('@/features/tasks/components/task-detail').then(m => ({ default: m.TaskDetail })));
const TaskForm = lazy(() => import('@/features/tasks/components/task-form/task-form').then(m => ({ default: m.TaskForm })));
const TaskPreviewPage = lazy(() => import('@/features/tasks/components/task-preview').then(m => ({ default: m.TaskPreviewPage })));

const KnowledgeCenter = lazy(() => import('@/features/knowledge/components/knowledge-center').then(m => ({ default: m.KnowledgeCenter })));
const TagManagementPage = lazy(() => import('@/features/tags/components/tag-management-page').then(m => ({ default: m.TagManagementPage })));

const QuizManagementPage = lazy(() => import('@/features/quiz-center/components/quiz-management-page').then(m => ({ default: m.QuizManagementPage })));
const QuizForm = lazy(() => import('@/features/quiz-center/quizzes/components/quiz-form').then(m => ({ default: m.QuizForm })));
const QuestionManagementPage = lazy(() => import('@/features/questions/components/question-management-page').then(m => ({ default: m.QuestionManagementPage })));
const QuestionFormPage = lazy(() => import('@/features/questions/components/question-form-page').then(m => ({ default: m.QuestionFormPage })));

const SpotCheckList = lazy(() => import('@/features/spot-checks/components/spot-check-list').then(m => ({ default: m.SpotCheckList })));
const SpotCheckForm = lazy(() => import('@/features/spot-checks/components/spot-check-form').then(m => ({ default: m.SpotCheckForm })));

const UserList = lazy(() => import('@/features/users/components/user-list').then(m => ({ default: m.UserList })));
const UserAuthorizationPage = lazy(() => import('@/features/users/pages/user-authorization-page').then(m => ({ default: m.UserAuthorizationPage })));

const AuthorizationCenterPage = lazy(() => import('@/features/authorization/pages/authorization-center-page').then(m => ({ default: m.AuthorizationCenterPage })));
const ActivityLogsPanel = lazy(() => import('@/features/activity-logs/components/activity-logs-panel').then(m => ({ default: m.ActivityLogsPanel })));
const ActivityLogPolicyPanel = lazy(() => import('@/features/activity-logs/components/activity-log-policy-panel').then(m => ({ default: m.ActivityLogPolicyPanel })));

const QuizPlayer = lazy(() => import('@/features/submissions/components/quiz-player').then(m => ({ default: m.QuizPlayer })));
const AnswerReview = lazy(() => import('@/features/submissions/components/answer-review').then(m => ({ default: m.AnswerReview })));

const GradingCenterPage = lazy(() => import('@/features/grading/components/grading-center-page').then(m => ({ default: m.GradingCenterPage })));

type PermissionMode = 'all' | 'any';
type MenuSection = 'main' | 'settings';
type MenuLabelResolver = string | ((workspace: WorkspaceConfig, role: RoleCode) => string);

type MenuMeta = {
  section: MenuSection;
  label: MenuLabelResolver;
  icon?: LucideIcon;
  group?: string;
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

export type WorkspaceRouteMeta = BaseRouteMeta & {
  kind: 'workspace';
  dashboardVariant: DashboardVariant;
  allowedRoles: RoleCode[];
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

type OrderedMenuItem = {
  order: number;
  item: MenuItem;
};

const MAIN_MENU_GROUPS: Record<string, { label: string; icon: LucideIcon; order: number }> = {
  assessment: {
    label: '测评管理',
    icon: HelpCircle,
    order: 40,
  },
  users: {
    label: '用户管理',
    icon: Users,
    order: 70,
  },
};

export const WORKSPACE_ROUTE_META: WorkspaceRouteMeta[] = [
  {
    key: 'student-dashboard',
    kind: 'workspace',
    path: 'dashboard',
    allowedRoles: ['STUDENT'],
    dashboardVariant: 'student',
    showInMenu: true,
    menu: {
      section: 'main',
      label: '概览',
      icon: LayoutGrid,
      order: 0,
    },
  },
  {
    key: 'mentor-dashboard',
    kind: 'workspace',
    path: 'dashboard',
    allowedRoles: ['MENTOR', 'DEPT_MANAGER'],
    dashboardVariant: 'mentor',
    showInMenu: true,
    menu: {
      section: 'main',
      label: '概览',
      icon: LayoutGrid,
      order: 0,
    },
  },
  {
    key: 'team-manager-dashboard',
    kind: 'workspace',
    path: 'dashboard',
    allowedRoles: ['TEAM_MANAGER'],
    dashboardVariant: 'team_manager',
    showInMenu: true,
    menu: {
      section: 'main',
      label: '概览',
      icon: LayoutGrid,
      order: 0,
    },
  },
  {
    key: 'admin-dashboard',
    kind: 'workspace',
    path: 'dashboard',
    allowedRoles: ['ADMIN', 'SUPER_ADMIN'],
    dashboardVariant: 'admin',
    showInMenu: true,
    menu: {
      section: 'main',
      label: '概览',
      icon: LayoutGrid,
      order: 0,
    },
  },
];

export const BUSINESS_ROUTE_META: BusinessRouteMeta[] = [
  {
    key: 'tasks',
    kind: 'business',
    path: 'tasks',
    requiredPermissions: ['task.view'],
    showInMenu: true,
    menu: {
      section: 'main',
      label: (workspace) => (workspace.menuVariant === 'admin' ? '任务管理' : '任务中心'),
      icon: SquareCheck,
      order: 50,
    },
    render: () => <TaskRoutePage />,
  },
  {
    key: 'task-create',
    kind: 'business',
    path: 'tasks/create',
    requiredPermissions: ['task.create'],
    component: TaskForm,
  },
  {
    key: 'task-edit',
    kind: 'business',
    path: 'tasks/:id/edit',
    requiredPermissions: ['task.update'],
    component: TaskForm,
  },
  {
    key: 'task-preview',
    kind: 'business',
    path: 'tasks/:id/preview',
    requiredPermissions: ['task.update', 'task.analytics.view', 'grading.view'],
    permissionMode: 'any',
    component: TaskPreviewPage,
  },
  {
    key: 'task-detail',
    kind: 'business',
    path: 'tasks/:id',
    requiredPermissions: ['task.view'],
    component: TaskDetail,
  },
  {
    key: 'tags',
    kind: 'business',
    path: 'tags',
    requiredPermissions: ['tag.view'],
    showInMenu: true,
    menu: {
      section: 'main',
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
      section: 'main',
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
    requiredPermissions: ['knowledge.create'],
    component: KnowledgeCenter,
  },
  {
    key: 'knowledge-edit',
    kind: 'business',
    path: 'knowledge/:id/edit',
    requiredPermissions: ['knowledge.update'],
    component: KnowledgeCenter,
  },
  {
    key: 'knowledge-detail',
    kind: 'business',
    path: 'knowledge/:id',
    requiredPermissions: ['knowledge.view'],
    component: KnowledgeCenter,
  },
  {
    key: 'quizzes',
    kind: 'business',
    path: 'quizzes',
    requiredPermissions: ['quiz.view', 'quiz.create', 'quiz.update', 'quiz.delete'],
    permissionMode: 'any',
    showInMenu: true,
    menu: {
      section: 'main',
      label: '试卷管理',
      group: 'assessment',
      order: 10,
    },
    component: QuizManagementPage,
  },
  {
    key: 'quiz-create',
    kind: 'business',
    path: 'quizzes/create',
    requiredPermissions: ['quiz.create'],
    component: QuizForm,
  },
  {
    key: 'quiz-preview',
    kind: 'business',
    path: 'quizzes/:id/preview',
    requiredPermissions: ['quiz.view', 'question.view'],
    component: QuizForm,
  },
  {
    key: 'quiz-edit',
    kind: 'business',
    path: 'quizzes/:id/edit',
    requiredPermissions: ['quiz.update'],
    component: QuizForm,
  },
  {
    key: 'questions',
    kind: 'business',
    path: 'questions',
    requiredPermissions: ['question.view', 'question.create', 'question.update', 'question.delete'],
    permissionMode: 'any',
    showInMenu: true,
    menu: {
      section: 'main',
      label: '题目管理',
      group: 'assessment',
      order: 20,
    },
    component: QuestionManagementPage,
  },
  {
    key: 'question-create',
    kind: 'business',
    path: 'questions/create',
    requiredPermissions: ['question.create'],
    component: QuestionFormPage,
  },
  {
    key: 'question-edit',
    kind: 'business',
    path: 'questions/:id/edit',
    requiredPermissions: ['question.update'],
    component: QuestionFormPage,
  },
  {
    key: 'spot-checks',
    kind: 'business',
    path: 'spot-checks',
    requiredPermissions: ['spot_check.view'],
    showInMenu: true,
    menu: {
      section: 'main',
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
    requiredPermissions: ['spot_check.create'],
    component: SpotCheckForm,
  },
  {
    key: 'spot-check-edit',
    kind: 'business',
    path: 'spot-checks/:id/edit',
    requiredPermissions: ['spot_check.view', 'spot_check.update'],
    component: SpotCheckForm,
  },
  {
    key: 'users',
    kind: 'business',
    path: 'users',
    requiredPermissions: ['user.view'],
    showInMenu: true,
    menu: {
      section: 'main',
      label: '用户列表',
      group: 'users',
      order: 10,
    },
    component: UserList,
  },
  {
    key: 'user-authorization',
    kind: 'business',
    path: 'users/authorization',
    requiredPermissions: ['user.authorize'],
    showInMenu: true,
    menu: {
      section: 'main',
      label: '用户授权',
      group: 'users',
      order: 20,
    },
    component: UserAuthorizationPage,
  },
  {
    key: 'audit-log-policy',
    kind: 'business',
    path: 'audit-logs/policy',
    requiredPermissions: ['activity_log.policy.update'],
    showInMenu: true,
    menu: {
      section: 'settings',
      label: '日志策略',
      icon: Settings,
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
      section: 'main',
      label: '日志审计',
      icon: SquareTerminal,
      order: 80,
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
    requiredPermissions: ['authorization.role_template.view', 'authorization.role_template.update'],
    permissionMode: 'any',
    showInMenu: true,
    menu: {
      section: 'settings',
      label: '角色模板',
      icon: ShieldCheck,
      order: 10,
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
      section: 'main',
      label: '阅卷中心',
      group: 'assessment',
      order: 30,
    },
    component: GradingCenterPage,
  },
];

const resolveMenuLabel = (
  label: MenuLabelResolver,
  workspace: WorkspaceConfig,
  role: RoleCode,
): string => (typeof label === 'function' ? label(workspace, role) : label);

const isPermissionGranted = (
  route: BusinessRouteMeta,
  hasCapability: (permissionCode: string) => boolean,
  hasAnyCapability: (permissionCodes: string[]) => boolean,
): boolean => {
  if (!route.requiredPermissions?.length) {
    return true;
  }

  return route.permissionMode === 'any'
    ? hasAnyCapability(route.requiredPermissions)
    : route.requiredPermissions.every((permissionCode) => hasCapability(permissionCode));
};

export const resolveWorkspaceRouteByRole = (
  role: RoleCode | null | undefined,
): WorkspaceRouteMeta | null => {
  if (!role) {
    return null;
  }
  return WORKSPACE_ROUTE_META.find((route) => route.allowedRoles.includes(role)) ?? null;
};

export const getWorkspaceDashboardElement = (
  variant: DashboardVariant,
): ReactElement => {
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

export const getMenuItemsBySection = (
  role: RoleCode | null,
  hasCapability: (permissionCode: string) => boolean,
  hasAnyCapability: (permissionCodes: string[]) => boolean,
  section: MenuSection,
): MenuItem[] => {
  if (!role) {
    return [];
  }

  const workspace = getWorkspaceConfig(role);
  if (!workspace) {
    return [];
  }

  const rolePrefix = getRolePathPrefix(role);
  if (!rolePrefix) {
    return [];
  }

  const items: Array<MenuItem & { order: number; group?: string }> = [];
  const workspaceRoute = resolveWorkspaceRouteByRole(role);

  if (section === 'main' && workspaceRoute?.showInMenu && workspaceRoute.menu) {
    items.push({
      key: `${rolePrefix}/${workspaceRoute.path}`,
      icon: workspaceRoute.menu.icon ? <workspaceRoute.menu.icon className="w-4 h-4" /> : undefined,
      label: resolveMenuLabel(workspaceRoute.menu.label, workspace, role),
      order: workspaceRoute.menu.order,
    });
  }

  BUSINESS_ROUTE_META.forEach((route) => {
    if (!route.showInMenu || !route.menu || route.menu.section !== section) {
      return;
    }
    if (route.allowedRoles && !route.allowedRoles.includes(role)) {
      return;
    }
    if (!isPermissionGranted(route, hasCapability, hasAnyCapability)) {
      return;
    }

    items.push({
      key: `${rolePrefix}/${route.path}`,
      icon: route.menu.icon ? <route.menu.icon className="w-4 h-4" /> : undefined,
      label: resolveMenuLabel(route.menu.label, workspace, role),
      order: route.menu.order,
      group: route.menu.group,
    });
  });

  const directItems: OrderedMenuItem[] = items
    .filter((item) => !item.group)
    .sort((left, right) => left.order - right.order)
    .map((item) => ({
      order: item.order,
      item: {
        key: item.key,
        icon: item.icon,
        label: item.label,
        children: item.children,
      },
    }));

  const groupedLeafItems = items.filter(
    (item): item is MenuItem & { order: number; group: string } => typeof item.group === 'string',
  );

  const groupedItems = groupedLeafItems.reduce<Record<string, Array<MenuItem & { order: number; group: string }>>>(
    (result, item) => {
      if (!result[item.group]) {
        result[item.group] = [];
      }
      result[item.group].push(item);
      return result;
    },
    {},
  );

  const groupItems = Object.entries(groupedItems).reduce<OrderedMenuItem[]>(
    (result, [groupKey, groupChildren]) => {
      const groupMeta = MAIN_MENU_GROUPS[groupKey];
      if (!groupMeta) {
        return result;
      }

      result.push({
        order: groupMeta.order,
        item: {
          key: `${rolePrefix}/${groupKey}`,
          icon: <groupMeta.icon className="w-4 h-4" />,
          label: groupMeta.label,
          children: groupChildren
            .sort((left, right) => left.order - right.order)
            .map((item) => ({
              key: item.key,
              icon: item.icon,
              label: item.label,
              children: item.children,
            })),
        },
      });
      return result;
    },
    [],
  );

  return [...directItems, ...groupItems]
    .sort((left, right) => left.order - right.order)
    .map(({ item }) => item);
};

const TaskRoutePage = () => {
  const { role } = useParams<{ role: string }>();

  if (normalizeRoleCode(role) === 'STUDENT') {
    return <StudentTaskList />;
  }

  return <TaskManagement />;
};
