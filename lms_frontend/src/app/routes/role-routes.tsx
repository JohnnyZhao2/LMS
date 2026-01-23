/* eslint-disable react-refresh/only-export-components */
/**
 * 角色前缀下的路由配置
 * 所有路由都在 /:role 下，路径不需要开头的 /
 */
import { Route } from 'react-router-dom';
import { lazy } from 'react';
import { ProtectedRoute } from '@/components/protected-route';

// Dashboard
const StudentDashboard = lazy(() => import('@/features/dashboard/components/student-dashboard').then(m => ({ default: m.StudentDashboard })));
const MentorDashboard = lazy(() => import('@/features/dashboard/components/mentor-dashboard').then(m => ({ default: m.MentorDashboard })));
const TeamManagerDashboard = lazy(() => import('@/features/dashboard/components/team-manager-dashboard').then(m => ({ default: m.TeamManagerDashboard })));

// Tasks
const TaskList = lazy(() => import('@/features/tasks/components/task-list').then(m => ({ default: m.TaskList })));
const TaskDetail = lazy(() => import('@/features/tasks/components/task-detail').then(m => ({ default: m.TaskDetail })));
const TaskForm = lazy(() => import('@/features/tasks/components/task-form').then(m => ({ default: m.TaskForm })));
const TaskPreviewPage = lazy(() => import('@/features/tasks/components/task-preview').then(m => ({ default: m.TaskPreviewPage })));

// Knowledge
const KnowledgeCenter = lazy(() => import('@/features/knowledge/components/knowledge-center').then(m => ({ default: m.KnowledgeCenter })));
const KnowledgeDetail = lazy(() => import('@/features/knowledge/components/knowledge-detail').then(m => ({ default: m.KnowledgeDetail })));
const KnowledgeForm = lazy(() => import('@/features/knowledge/components/knowledge-form').then(m => ({ default: m.KnowledgeForm })));

// Quiz Center
const QuizCenter = lazy(() => import('@/features/quiz-center/components/quiz-center').then(m => ({ default: m.QuizCenter })));
const QuizForm = lazy(() => import('@/features/quiz-center/quizzes/components/quiz-form').then(m => ({ default: m.QuizForm })));

// Spot Checks
const SpotCheckList = lazy(() => import('@/features/spot-checks/components/spot-check-list').then(m => ({ default: m.SpotCheckList })));
const SpotCheckForm = lazy(() => import('@/features/spot-checks/components/spot-check-form').then(m => ({ default: m.SpotCheckForm })));

// Users
const UserList = lazy(() => import('@/features/users/components/user-list').then(m => ({ default: m.UserList })));

// Submissions
const QuizPlayer = lazy(() => import('@/features/submissions/components/quiz-player').then(m => ({ default: m.QuizPlayer })));
const AnswerReview = lazy(() => import('@/features/submissions/components/answer-review').then(m => ({ default: m.AnswerReview })));

// Other
const Personal = () => <div>个人中心（开发中）</div>;
const Analytics = () => <div>团队数据看板（开发中）</div>;

/**
 * 根据 URL 中的角色渲染对应的仪表盘
 */
import { useParams } from 'react-router-dom';
import type { RoleCode } from '@/types/api';

const Dashboard = () => {
  const { role } = useParams<{ role: string }>();
  const currentRole = role?.toUpperCase() as RoleCode;

  if (currentRole === 'STUDENT') {
    return <StudentDashboard />;
  }
  if (currentRole === 'MENTOR' || currentRole === 'DEPT_MANAGER') {
    return <MentorDashboard />;
  }
  if (currentRole === 'TEAM_MANAGER') {
    return <TeamManagerDashboard />;
  }
  if (currentRole === 'ADMIN') {
    return <MentorDashboard />;
  }

  return <StudentDashboard />;
};

export const roleRoutes = [
  // Dashboard
  <Route key="dashboard" path="dashboard" element={<Dashboard />} />,
  <Route key="dashboard-index" index element={<Dashboard />} />,

  // Tasks
  <Route key="task-list" path="tasks" element={<TaskList />} />,
  <Route
    key="task-create"
    path="tasks/create"
    element={
      <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
        <TaskForm />
      </ProtectedRoute>
    }
  />,
  <Route
    key="task-edit"
    path="tasks/:id/edit"
    element={
      <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
        <TaskForm />
      </ProtectedRoute>
    }
  />,
  <Route
    key="task-preview"
    path="tasks/:id/preview"
    element={
      <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
        <TaskPreviewPage />
      </ProtectedRoute>
    }
  />,
  <Route key="task-detail" path="tasks/:id" element={<TaskDetail />} />,

  // Knowledge
  <Route key="knowledge-list" path="knowledge" element={<KnowledgeCenter />} />,
  <Route
    key="knowledge-create"
    path="knowledge/create"
    element={
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <KnowledgeForm />
      </ProtectedRoute>
    }
  />,
  <Route
    key="knowledge-edit"
    path="knowledge/:id/edit"
    element={
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <KnowledgeForm />
      </ProtectedRoute>
    }
  />,
  <Route key="knowledge-detail" path="knowledge/:id" element={<KnowledgeDetail />} />,

  // Quiz Center
  <Route
    key="quiz-center"
    path="quiz-center"
    element={
      <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
        <QuizCenter />
      </ProtectedRoute>
    }
  />,
  <Route
    key="quiz-create"
    path="quiz-center/quizzes/create"
    element={
      <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
        <QuizForm />
      </ProtectedRoute>
    }
  />,
  <Route
    key="quiz-edit"
    path="quiz-center/quizzes/:id/edit"
    element={
      <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
        <QuizForm />
      </ProtectedRoute>
    }
  />,

  // Spot Checks
  <Route
    key="spot-check-list"
    path="spot-checks"
    element={
      <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
        <SpotCheckList />
      </ProtectedRoute>
    }
  />,
  <Route
    key="spot-check-create"
    path="spot-checks/create"
    element={
      <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
        <SpotCheckForm />
      </ProtectedRoute>
    }
  />,

  // Users
  <Route
    key="user-list"
    path="users"
    element={
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <UserList />
      </ProtectedRoute>
    }
  />,

  // Submissions
  <Route key="quiz" path="quiz/:id" element={<QuizPlayer />} />,
  <Route key="review-practice" path="review/practice" element={<AnswerReview type="practice" />} />,
  <Route key="review-exam" path="review/exam" element={<AnswerReview type="exam" />} />,

  // Other
  <Route
    key="personal"
    path="personal"
    element={
      <ProtectedRoute allowedRoles={['STUDENT']}>
        <Personal />
      </ProtectedRoute>
    }
  />,
  <Route
    key="analytics"
    path="analytics"
    element={
      <ProtectedRoute allowedRoles={['TEAM_MANAGER']}>
        <Analytics />
      </ProtectedRoute>
    }
  />,
];
