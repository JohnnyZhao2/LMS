/* eslint-disable react-refresh/only-export-components */
/**
 * 业务路由注册表。
 *
 * 路径、权限、菜单元数据集中声明在这里。
 * workbenches 只影响菜单和手动切台，不参与路由访问控制。
 */
import { lazy, type ComponentType, type ReactElement, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Activity, BookOpen, FileSearch, HelpCircle, ListTodo, Settings, SquareTerminal, Tags, Users } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { PageFillShell, PageShell } from '@/components/ui/page-shell';
import { AUTHORIZATION_WORKBENCH_ACCESS_PERMISSIONS } from '@/entities/authorization/constants/access';
import { useWorkbench } from '@/session/hooks/use-workbench';
import type { Workbench } from '@/types/common';
import type { DashboardVariant } from './workspace-config';

export type PermissionMode = 'all' | 'any';
export type MenuLabelResolver = string | ((workbench: Workbench) => string);

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

export type BusinessRouteMeta = {
  key: string;
  path: string;
  workbenches?: Workbench[];
  requiredPermissions?: string[];
  permissionMode?: PermissionMode;
  menu?: MenuMeta;
  component?: ComponentType;
  render?: () => ReactElement;
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

export const getDashboardElement = (variant: DashboardVariant): ReactElement => {
  if (variant === 'student') {
    return <StudentDashboard />;
  }
  if (variant === 'mentor') {
    return <MentorDashboard />;
  }
  return <AdminDashboard />;
};

const TaskRoutePage = () => {
  const workbench = useWorkbench();

  if (workbench === 'learn') {
    return <StudentTaskCenter />;
  }

  return <TaskManagement />;
};

/** 发起抽查统一走列表弹窗，独立 create 路由重定向 */
const SpotCheckCreateRedirect = () => <Navigate to="/spot-checks" replace />;

export const BUSINESS_ROUTE_META: BusinessRouteMeta[] = [
  {
    key: 'tasks',
    path: 'tasks',
    workbenches: ['learn', 'manage'],
    menu: {
      label: (workbench) => (workbench === 'manage' ? '任务管理' : '任务中心'),
      icon: ListTodo,
      order: 50,
    },
    render: () => <TaskRoutePage />,
  },
  {
    key: 'task-create',
    path: 'tasks/create',
    requiredPermissions: ['tasks.add_task'],
    component: TaskForm,
  },
  {
    key: 'task-edit',
    path: 'tasks/:id/edit',
    requiredPermissions: ['tasks.change_task'],
    component: TaskForm,
  },
  {
    key: 'task-preview',
    path: 'tasks/:id/preview',
    requiredPermissions: ['tasks.change_task', 'tasks.view_grading'],
    permissionMode: 'any',
    component: TaskPreviewPage,
  },
  {
    key: 'task-detail',
    path: 'tasks/:id',
    workbenches: ['learn', 'manage'],
    component: TaskDetail,
  },
  {
    key: 'tags',
    path: 'tags',
    requiredPermissions: ['tags.view_tag'],
    menu: {
      label: '标签管理',
      icon: Tags,
      order: 20,
    },
    component: TagManagementPage,
  },
  {
    key: 'knowledge',
    path: 'knowledge',
    workbenches: ['learn', 'manage'],
    menu: {
      label: (workbench) => (workbench === 'learn' ? '知识中心' : '知识管理'),
      icon: BookOpen,
      order: 10,
    },
    component: KnowledgeCenter,
  },
  {
    key: 'knowledge-create',
    path: 'knowledge/create',
    requiredPermissions: ['knowledge.add_knowledge'],
    component: KnowledgeCenter,
  },
  {
    key: 'knowledge-edit',
    path: 'knowledge/:id/edit',
    requiredPermissions: ['knowledge.change_knowledge'],
    component: KnowledgeCenter,
  },
  {
    key: 'knowledge-detail',
    path: 'knowledge/:id',
    workbenches: ['learn', 'manage'],
    component: KnowledgeCenter,
  },
  {
    key: 'quizzes',
    path: 'quizzes',
    requiredPermissions: ['quizzes.view_quiz', 'quizzes.add_quiz', 'quizzes.change_quiz', 'quizzes.delete_quiz'],
    permissionMode: 'any',
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
    path: 'quizzes/create',
    requiredPermissions: ['quizzes.add_quiz'],
    component: QuizForm,
  },
  {
    key: 'quiz-preview',
    path: 'quizzes/:id/preview',
    requiredPermissions: ['quizzes.view_quiz', 'questions.view_question'],
    component: QuizForm,
  },
  {
    key: 'quiz-edit',
    path: 'quizzes/:id/edit',
    requiredPermissions: ['quizzes.change_quiz'],
    component: QuizForm,
  },
  {
    key: 'questions',
    path: 'questions',
    requiredPermissions: ['questions.view_question', 'questions.add_question', 'questions.change_question', 'questions.delete_question'],
    permissionMode: 'any',
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
    path: 'questions/create',
    requiredPermissions: ['questions.add_question'],
    component: QuestionFormPage,
  },
  {
    key: 'question-edit',
    path: 'questions/:id/edit',
    requiredPermissions: ['questions.change_question'],
    component: QuestionFormPage,
  },
  {
    key: 'spot-checks',
    path: 'spot-checks',
    // 学员抽查看/提交走任务中心 Tab + /spot-checks/mine；
    // 管理端菜单不挂学习入口。
    requiredPermissions: ['spot_checks.view_spotcheck'],
    menu: {
      label: '抽查管理',
      icon: FileSearch,
      order: 60,
    },
    component: SpotCheckList,
  },
  {
    key: 'spot-check-create',
    path: 'spot-checks/create',
    requiredPermissions: ['spot_checks.add_spotcheck'],
    // 发起统一在列表弹窗完成（左侧选人/勾选）
    render: () => <SpotCheckCreateRedirect />,
  },
  {
    key: 'spot-check-edit',
    path: 'spot-checks/:id/edit',
    requiredPermissions: ['spot_checks.view_spotcheck', 'spot_checks.change_spotcheck'],
    component: SpotCheckForm,
  },
  {
    key: 'users',
    path: 'users',
    requiredPermissions: ['users.view_user'],
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
    path: 'audit-logs/policy',
    requiredPermissions: ['activity_logs.change_activitylogpolicy'],
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
    path: 'audit-logs',
    requiredPermissions: ['activity_logs.view_activitylog'],
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
    path: 'authorization',
    requiredPermissions: AUTHORIZATION_WORKBENCH_ACCESS_PERMISSIONS,
    permissionMode: 'any',
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
    path: 'quiz/:id',
    workbenches: ['learn'],
    component: QuizPlayer,
  },
  {
    key: 'review-practice',
    path: 'review/practice',
    workbenches: ['learn'],
    render: () => <AnswerReview type="practice" />,
  },
  {
    key: 'review-exam',
    path: 'review/exam',
    workbenches: ['learn'],
    render: () => <AnswerReview type="exam" />,
  },
  {
    key: 'grading-center',
    path: 'grading-center',
    requiredPermissions: ['tasks.view_grading'],
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
