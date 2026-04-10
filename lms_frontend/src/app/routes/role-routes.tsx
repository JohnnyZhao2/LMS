/* eslint-disable react-refresh/only-export-components */
/**
 * 角色前缀下的路由配置
 * 所有路由都在 /:role 下，路径不需要开头的 /
 */
import { Navigate, Route } from 'react-router-dom';
import { lazy } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/features/auth/stores/auth-context';
import { ROUTES } from '@/config/routes';
import {
  getAccessibleWorkspaceHome,
  getWorkspaceConfig,
  normalizeRoleCode,
} from '../workspace-config';

// Dashboard
const StudentDashboard = lazy(() => import('@/features/dashboard/components/student-dashboard').then(m => ({ default: m.StudentDashboard })));
const MentorDashboard = lazy(() => import('@/features/dashboard/components/mentor-dashboard').then(m => ({ default: m.MentorDashboard })));
const TeamManagerDashboard = lazy(() => import('@/features/dashboard/components/team-manager-dashboard').then(m => ({ default: m.TeamManagerDashboard })));
const AdminDashboard = lazy(() => import('@/features/dashboard/components/admin-dashboard').then(m => ({ default: m.AdminDashboard })));

// Tasks
const TaskList = lazy(() => import('@/features/tasks/components/task-list').then(m => ({ default: m.TaskList })));
const TaskDetail = lazy(() => import('@/features/tasks/components/task-detail').then(m => ({ default: m.TaskDetail })));
const TaskForm = lazy(() => import('@/features/tasks/components/task-form/task-form').then(m => ({ default: m.TaskForm })));
const TaskPreviewPage = lazy(() => import('@/features/tasks/components/task-preview').then(m => ({ default: m.TaskPreviewPage })));

// Knowledge
const KnowledgeCenter = lazy(() => import('@/features/knowledge/components/knowledge-center').then(m => ({ default: m.KnowledgeCenter })));
const TagManagementPage = lazy(() => import('@/features/tags/components/tag-management-page').then(m => ({ default: m.TagManagementPage })));

// Quizzes / Questions
const QuizManagementPage = lazy(() => import('@/features/quiz-center/components/quiz-management-page').then(m => ({ default: m.QuizManagementPage })));
const QuizForm = lazy(() => import('@/features/quiz-center/quizzes/components/quiz-form').then(m => ({ default: m.QuizForm })));
const QuestionManagementPage = lazy(() => import('@/features/questions/components/question-management-page').then(m => ({ default: m.QuestionManagementPage })));
const QuestionFormPage = lazy(() => import('@/features/questions/components/question-form-page').then(m => ({ default: m.QuestionFormPage })));

// Spot Checks
const SpotCheckList = lazy(() => import('@/features/spot-checks/components/spot-check-list').then(m => ({ default: m.SpotCheckList })));
const SpotCheckForm = lazy(() => import('@/features/spot-checks/components/spot-check-form').then(m => ({ default: m.SpotCheckForm })));

// Users
const UserList = lazy(() => import('@/features/users/components/user-list').then(m => ({ default: m.UserList })));
const UserAuthorizationPage = lazy(() => import('@/features/users/pages/user-authorization-page').then(m => ({ default: m.UserAuthorizationPage })));

const AuthorizationCenterPage = lazy(() => import('@/features/authorization/pages/authorization-center-page').then(m => ({ default: m.AuthorizationCenterPage })));
const ActivityLogsPage = lazy(() => import('@/features/activity-logs/pages/activity-logs-page').then(m => ({ default: m.ActivityLogsPage })));
const ActivityLogPolicyPage = lazy(() => import('@/features/activity-logs/pages/activity-log-policy-page').then(m => ({ default: m.ActivityLogPolicyPage })));

// Submissions
const QuizPlayer = lazy(() => import('@/features/submissions/components/quiz-player').then(m => ({ default: m.QuizPlayer })));
const AnswerReview = lazy(() => import('@/features/submissions/components/answer-review').then(m => ({ default: m.AnswerReview })));

// Grading Center
const GradingCenterPage = lazy(() => import('@/features/grading/components/grading-center-page').then(m => ({ default: m.GradingCenterPage })));

// Other
const Personal = () => <div>个人中心（开发中）</div>;

/**
 * 根据 URL 中的角色渲染对应的仪表盘
 */
import { useParams } from 'react-router-dom';

const Dashboard = () => {
  const { role } = useParams<{ role: string }>();
  const { hasCapability, availableRoles } = useAuth();
  const routeRole = normalizeRoleCode(role);
  const workspace = getWorkspaceConfig(routeRole);
  const fallbackPath = getAccessibleWorkspaceHome(
    availableRoles.map((item) => item.code),
    hasCapability,
    routeRole,
  ) ?? ROUTES.LOGIN;

  if (!workspace) {
    return <Navigate to={fallbackPath} replace />;
  }

  if (!hasCapability(workspace.requiredCapability)) {
    return <Navigate to={fallbackPath === workspace.home ? ROUTES.LOGIN : fallbackPath} replace />;
  }

  if (workspace.dashboardVariant === 'student') {
    return <StudentDashboard />;
  }
  if (workspace.dashboardVariant === 'mentor') {
    return <MentorDashboard />;
  }
  if (workspace.dashboardVariant === 'team_manager') {
    return <TeamManagerDashboard />;
  }
  if (workspace.dashboardVariant === 'admin') {
    return <AdminDashboard />;
  }

  return <Navigate to={fallbackPath} replace />;
};

export const roleRoutes = [
  // Dashboard
  <Route key="dashboard" path="dashboard" element={<Dashboard />} />,
  <Route key="dashboard-index" index element={<Dashboard />} />,

  // Tasks
  <Route
    key="task-list"
    path="tasks"
    element={
      <ProtectedRoute requiredPermissions={['task.view']}>
        <TaskList />
      </ProtectedRoute>
    }
  />,
  <Route
    key="task-create"
    path="tasks/create"
    element={
      <ProtectedRoute requiredPermissions={['task.create']}>
        <TaskForm />
      </ProtectedRoute>
    }
  />,
  <Route
    key="task-edit"
    path="tasks/:id/edit"
    element={
      <ProtectedRoute requiredPermissions={['task.update']}>
        <TaskForm />
      </ProtectedRoute>
    }
  />,
  <Route
    key="task-preview"
    path="tasks/:id/preview"
    element={
      <ProtectedRoute
        requiredPermissions={['task.update', 'task.analytics.view', 'grading.view']}
        permissionMode="any"
      >
        <TaskPreviewPage />
      </ProtectedRoute>
    }
  />,
  <Route
    key="task-detail"
    path="tasks/:id"
    element={
      <ProtectedRoute requiredPermissions={['task.view']}>
        <TaskDetail />
      </ProtectedRoute>
    }
  />,

  // Knowledge
  <Route
    key="tags"
    path="tags"
    element={
      <ProtectedRoute requiredPermissions={['tag.view']}>
        <TagManagementPage />
      </ProtectedRoute>
    }
  />,

  <Route
    key="knowledge-list"
    path="knowledge"
    element={
      <ProtectedRoute requiredPermissions={['knowledge.view']}>
        <KnowledgeCenter />
      </ProtectedRoute>
    }
  />,
  <Route
    key="knowledge-create"
    path="knowledge/create"
    element={
      <ProtectedRoute requiredPermissions={['knowledge.create']}>
        <KnowledgeCenter />
      </ProtectedRoute>
    }
  />,
  <Route
    key="knowledge-edit"
    path="knowledge/:id/edit"
    element={
      <ProtectedRoute requiredPermissions={['knowledge.update']}>
        <KnowledgeCenter />
      </ProtectedRoute>
    }
  />,
  <Route
    key="knowledge-detail"
    path="knowledge/:id"
    element={
      <ProtectedRoute requiredPermissions={['knowledge.view']}>
        <KnowledgeCenter />
      </ProtectedRoute>
    }
  />,

  // Quizzes
  <Route
    key="quizzes"
    path="quizzes"
    element={
      <ProtectedRoute
        requiredPermissions={['quiz.view', 'quiz.create', 'quiz.update', 'quiz.delete']}
        permissionMode="any"
      >
        <QuizManagementPage />
      </ProtectedRoute>
    }
  />,
  <Route
    key="quiz-create"
    path="quizzes/create"
    element={
      <ProtectedRoute requiredPermissions={['quiz.create']}>
        <QuizForm />
      </ProtectedRoute>
    }
  />,
  <Route
    key="quiz-preview"
    path="quizzes/:id/preview"
    element={
      <ProtectedRoute requiredPermissions={['quiz.view', 'question.view']}>
        <QuizForm />
      </ProtectedRoute>
    }
  />,
  <Route
    key="quiz-edit"
    path="quizzes/:id/edit"
    element={
      <ProtectedRoute requiredPermissions={['quiz.update']}>
        <QuizForm />
      </ProtectedRoute>
    }
  />,
  <Route
    key="questions"
    path="questions"
    element={
      <ProtectedRoute
        requiredPermissions={['question.view', 'question.create', 'question.update', 'question.delete']}
        permissionMode="any"
      >
        <QuestionManagementPage />
      </ProtectedRoute>
    }
  />,
  <Route
    key="question-create"
    path="questions/create"
    element={
      <ProtectedRoute requiredPermissions={['question.create']}>
        <QuestionFormPage />
      </ProtectedRoute>
    }
  />,
  <Route
    key="question-edit"
    path="questions/:id/edit"
    element={
      <ProtectedRoute requiredPermissions={['question.update']}>
        <QuestionFormPage />
      </ProtectedRoute>
    }
  />,

  // Spot Checks
  <Route
    key="spot-check-list"
    path="spot-checks"
    element={
      <ProtectedRoute requiredPermissions={['spot_check.view']}>
        <SpotCheckList />
      </ProtectedRoute>
    }
  />,
  <Route
    key="spot-check-create"
    path="spot-checks/create"
    element={
      <ProtectedRoute requiredPermissions={['spot_check.create']}>
        <SpotCheckForm />
      </ProtectedRoute>
    }
  />,
  <Route
    key="spot-check-edit"
    path="spot-checks/:id/edit"
    element={
      <ProtectedRoute requiredPermissions={['spot_check.view', 'spot_check.update']}>
        <SpotCheckForm />
      </ProtectedRoute>
    }
  />,

  // Users
  <Route
    key="user-list"
    path="users"
    element={
      <ProtectedRoute requiredPermissions={['user.view']}>
        <UserList />
      </ProtectedRoute>
    }
  />,
  <Route
    key="user-authorization"
    path="users/authorization"
    element={
      <ProtectedRoute requiredPermissions={['user.authorize']}>
        <UserAuthorizationPage />
      </ProtectedRoute>
    }
  />,

  // Authorization Center
  <Route
    key="audit-log-policy"
    path="audit-logs/policy"
    element={
      <ProtectedRoute requiredPermissions={['activity_log.policy.update']}>
        <ActivityLogPolicyPage />
      </ProtectedRoute>
    }
  />,
  <Route
    key="audit-logs"
    path="audit-logs"
    element={
      <ProtectedRoute requiredPermissions={['activity_log.view']}>
        <ActivityLogsPage />
      </ProtectedRoute>
    }
  />,
  <Route
    key="authorization-center"
    path="authorization"
    element={
      <ProtectedRoute
        requiredPermissions={['authorization.role_template.view', 'authorization.role_template.update']}
        permissionMode="any"
      >
        <AuthorizationCenterPage />
      </ProtectedRoute>
    }
  />,

  // Submissions
  <Route
    key="quiz"
    path="quiz/:id"
    element={
      <ProtectedRoute requiredPermissions={['submission.answer']}>
        <QuizPlayer />
      </ProtectedRoute>
    }
  />,
  <Route
    key="review-practice"
    path="review/practice"
    element={
      <ProtectedRoute requiredPermissions={['submission.review']}>
        <AnswerReview type="practice" />
      </ProtectedRoute>
    }
  />,
  <Route
    key="review-exam"
    path="review/exam"
    element={
      <ProtectedRoute requiredPermissions={['submission.review']}>
        <AnswerReview type="exam" />
      </ProtectedRoute>
    }
  />,

  // Grading Center
  <Route
    key="grading-center"
    path="grading-center"
    element={
      <ProtectedRoute requiredPermissions={['grading.view']}>
        <GradingCenterPage />
      </ProtectedRoute>
    }
  />,

  // Other
  <Route
    key="personal"
    path="personal"
    element={
      <ProtectedRoute requiredPermissions={['profile.student.view', 'profile.student.update']} permissionMode="any">
        <Personal />
      </ProtectedRoute>
    }
  />,
];
