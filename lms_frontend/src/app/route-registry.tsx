/* eslint-disable react-refresh/only-export-components */
/**
 * 业务路由注册表。
 *
 * 路径、权限、菜单元数据集中声明在这里。
 * workbenches 同时决定菜单展示与工作台路由访问控制（未声明时默认 ['manage']）。
 */
import { lazy, type ReactElement } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, FileSearch, HelpCircle, ListTodo, SquareTerminal, Tags, Users } from 'lucide-react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { PageShell } from '@/components/ui/page-shell';
import { USER_ROLE_ASSIGN_PERMISSION } from '@/config/authorization';
import { useWorkbench } from '@/hooks/use-workbench';
import type { Workbench } from '@/types/common';

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
  path: string;
  workbenches?: Workbench[];
  requiredPermissions?: string[];
  permissionMode?: PermissionMode;
  menu?: MenuMeta;
  element: ReactElement;
};

export const canAccessBusinessRoute = (
  route: Pick<BusinessRouteMeta, 'workbenches' | 'requiredPermissions' | 'permissionMode'>,
  workbench: Workbench,
  hasCapability: (permissionCode: string) => boolean,
): boolean => {
  const allowedWorkbenches = route.workbenches ?? ['manage'];
  if (!allowedWorkbenches.includes(workbench)) {
    return false;
  }
  if (workbench === 'learn') {
    return true;
  }
  if (!route.requiredPermissions?.length) {
    return true;
  }
  return route.permissionMode === 'any'
    ? route.requiredPermissions.some(hasCapability)
    : route.requiredPermissions.every(hasCapability);
};

const StudentTaskCenter = lazy(() => import('@/app/routes/student-task-center').then(m => ({ default: m.StudentTaskCenter })));
const TaskManagement = lazy(() => import('@/features/tasks/components/task-management').then(m => ({ default: m.TaskManagement })));
const TaskDetail = lazy(() => import('@/features/tasks/components/task-detail').then(m => ({ default: m.TaskDetail })));
const TaskForm = lazy(() => import('@/app/routes/tasks/task-form').then(m => ({ default: m.TaskForm })));
const TaskPreviewPage = lazy(() => import('@/app/routes/tasks/task-preview').then(m => ({ default: m.TaskPreviewPage })));

const KnowledgeCenter = lazy(() => import('@/app/routes/knowledge/knowledge-page').then(m => ({ default: m.KnowledgeCenterPage })));
const TagManagementPage = lazy(() => import('@/features/tags/components/tag-management-page').then(m => ({ default: m.TagManagementPage })));

const QuizManagementPage = lazy(() => import('@/features/quizzes/components/quiz-management-page').then(m => ({ default: m.QuizManagementPage })));
const QuizForm = lazy(() => import('@/features/quizzes/components/quiz-form').then(m => ({ default: m.QuizForm })));
const QuestionManagementPage = lazy(() => import('@/features/questions/components/question-management-page').then(m => ({ default: m.QuestionManagementPage })));
const QuestionFormPage = lazy(() => import('@/features/questions/components/question-form-page').then(m => ({ default: m.QuestionFormPage })));

const SpotCheckList = lazy(() => import('@/features/spot-checks/components/spot-check-list').then(m => ({ default: m.SpotCheckList })));
const SpotCheckForm = lazy(() => import('@/features/spot-checks/components/spot-check-form').then(m => ({ default: m.SpotCheckForm })));

const UserList = lazy(() => import('@/features/users/components/user-list').then(m => ({ default: m.UserList })));

const AuthorizationCenterPage = lazy(() => import('@/app/routes/authorization/authorization-center-page').then(m => ({ default: m.AuthorizationCenterPage })));
const ActivityLogsPanel = lazy(() => import('@/features/activity-logs/components/activity-logs-panel').then(m => ({ default: m.ActivityLogsPanel })));
const ActivityLogPolicyPanel = lazy(() => import('@/features/activity-logs/components/activity-log-policy-panel').then(m => ({ default: m.ActivityLogPolicyPanel })));

const QuizPlayer = lazy(() => import('@/features/quiz-attempts/components/quiz-player').then(m => ({ default: m.QuizPlayer })));
const AnswerReview = lazy(() => import('@/features/quiz-attempts/components/answer-review').then(m => ({ default: m.AnswerReview })));

const GradingCenterPage = lazy(() => import('@/features/grading/components/grading-center-page').then(m => ({ default: m.GradingCenterPage })));

const ASSESSMENT_GROUP = {
  key: 'assessment',
  label: '测评管理',
  icon: HelpCircle,
  order: 40,
};

const USERS_GROUP = {
  key: 'users',
  label: '用户管理',
  icon: Users,
  order: 70,
};

const LOG_GROUP = {
  key: 'log-management',
  label: '日志管理',
  icon: SquareTerminal,
  order: 80,
};

const TaskRoutePage = () => {
  const workbench = useWorkbench();

  if (workbench === 'learn') {
    return <StudentTaskCenter />;
  }

  return <TaskManagement />;
};

const KeyedTaskForm = () => {
  const { id } = useParams<{ id: string }>();
  return <TaskForm key={id ?? 'create'} />;
};

const KeyedTaskPreviewPage = () => {
  const { id } = useParams<{ id: string }>();
  return <TaskPreviewPage key={id ?? 'preview'} />;
};

const KeyedQuizForm = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const mode = location.pathname.endsWith('/preview') ? 'preview' : id ? 'edit' : 'create';
  return <QuizForm key={`${mode}-${id ?? 'new'}`} />;
};

export const BUSINESS_ROUTE_META: BusinessRouteMeta[] = [
  {
    path: 'tasks',
    workbenches: ['learn', 'manage'],
    requiredPermissions: ['tasks.view_task'],
    menu: {
      label: (workbench) => (workbench === 'manage' ? '任务管理' : '任务中心'),
      icon: ListTodo,
      order: 50,
    },
    element: <TaskRoutePage />,
  },
  {
    path: 'tasks/create',
    requiredPermissions: ['tasks.add_task'],
    element: <KeyedTaskForm />,
  },
  {
    path: 'tasks/:id/edit',
    requiredPermissions: ['tasks.change_task'],
    element: <KeyedTaskForm />,
  },
  {
    path: 'tasks/:id/preview',
    requiredPermissions: ['tasks.view_task_analytics', 'tasks.view_grading'],
    permissionMode: 'any',
    element: <KeyedTaskPreviewPage />,
  },
  {
    path: 'tasks/:id',
    workbenches: ['learn'],
    element: <TaskDetail />,
  },
  {
    path: 'tags',
    requiredPermissions: ['tags.view_tag'],
    menu: {
      label: '标签管理',
      icon: Tags,
      order: 20,
    },
    element: <TagManagementPage />,
  },
  {
    path: 'knowledge',
    workbenches: ['learn', 'manage'],
    requiredPermissions: ['knowledge.view_knowledge'],
    menu: {
      label: (workbench) => (workbench === 'learn' ? '知识中心' : '知识管理'),
      icon: BookOpen,
      order: 10,
    },
    element: <KnowledgeCenter />,
  },
  {
    path: 'knowledge/create',
    requiredPermissions: ['knowledge.add_knowledge'],
    element: <KnowledgeCenter />,
  },
  {
    path: 'knowledge/:id/edit',
    requiredPermissions: ['knowledge.change_knowledge'],
    element: <KnowledgeCenter />,
  },
  {
    path: 'knowledge/:id',
    workbenches: ['learn', 'manage'],
    requiredPermissions: ['knowledge.view_knowledge'],
    element: <KnowledgeCenter />,
  },
  {
    path: 'quizzes',
    requiredPermissions: ['quizzes.view_quiz', 'quizzes.add_quiz', 'quizzes.change_quiz', 'quizzes.delete_quiz'],
    permissionMode: 'any',
    menu: {
      label: '试卷管理',
      group: ASSESSMENT_GROUP,
      order: 10,
    },
    element: <QuizManagementPage />,
  },
  {
    path: 'quizzes/create',
    requiredPermissions: ['quizzes.add_quiz'],
    element: <KeyedQuizForm />,
  },
  {
    path: 'quizzes/:id/preview',
    requiredPermissions: ['quizzes.view_quiz', 'questions.view_question'],
    element: <KeyedQuizForm />,
  },
  {
    path: 'quizzes/:id/edit',
    requiredPermissions: ['quizzes.change_quiz'],
    element: <KeyedQuizForm />,
  },
  {
    path: 'questions',
    requiredPermissions: ['questions.view_question', 'questions.add_question', 'questions.change_question', 'questions.delete_question'],
    permissionMode: 'any',
    menu: {
      label: '题目管理',
      group: ASSESSMENT_GROUP,
      order: 20,
    },
    element: <QuestionManagementPage />,
  },
  {
    path: 'questions/create',
    requiredPermissions: ['questions.add_question'],
    element: <QuestionFormPage />,
  },
  {
    path: 'questions/:id/edit',
    requiredPermissions: ['questions.change_question'],
    element: <QuestionFormPage />,
  },
  {
    path: 'spot-checks',
    // 学员抽查看/提交走任务中心 Tab；管理端菜单不挂学习入口。
    requiredPermissions: ['spot_checks.view_spotcheck'],
    menu: {
      label: '抽查管理',
      icon: FileSearch,
      order: 60,
    },
    element: <SpotCheckList />,
  },
  {
    path: 'spot-checks/create',
    requiredPermissions: ['spot_checks.add_spotcheck'],
    element: <Navigate to="/spot-checks" replace />,
  },
  {
    path: 'spot-checks/:id/edit',
    requiredPermissions: ['spot_checks.view_spotcheck', 'spot_checks.change_spotcheck'],
    element: <SpotCheckForm />,
  },
  {
    path: 'users',
    requiredPermissions: ['users.view_user'],
    menu: {
      label: '用户列表',
      group: USERS_GROUP,
      order: 10,
    },
    element: <UserList />,
  },
  {
    path: 'audit-logs/policy',
    requiredPermissions: ['activity_logs.change_activitylogpolicy'],
    menu: {
      label: '日志策略',
      group: LOG_GROUP,
      order: 20,
    },
    element: (
      <PageShell>
        <ActivityLogPolicyPanel />
      </PageShell>
    ),
  },
  {
    path: 'audit-logs',
    requiredPermissions: ['activity_logs.view_activitylog'],
    menu: {
      label: '日志审计',
      group: LOG_GROUP,
      order: 10,
    },
    element: <ActivityLogsPanel />,
  },
  {
    path: 'authorization',
    requiredPermissions: [USER_ROLE_ASSIGN_PERMISSION],
    menu: {
      label: '角色授权',
      group: USERS_GROUP,
      order: 20,
    },
    element: <AuthorizationCenterPage />,
  },
  {
    path: 'quiz/:id',
    workbenches: ['learn'],
    element: <QuizPlayer />,
  },
  {
    path: 'review/practice',
    workbenches: ['learn'],
    element: <AnswerReview type="practice" />,
  },
  {
    path: 'review/exam',
    workbenches: ['learn'],
    element: <AnswerReview type="exam" />,
  },
  {
    path: 'grading-center',
    requiredPermissions: ['tasks.view_grading'],
    menu: {
      label: '阅卷中心',
      group: ASSESSMENT_GROUP,
      order: 30,
    },
    element: <GradingCenterPage />,
  },
];
