import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/protected-route';
import { LoginForm } from '@/features/auth/components/login-form';
import { StudentDashboard } from '@/features/dashboard/components/student-dashboard';
import { MentorDashboard } from '@/features/dashboard/components/mentor-dashboard';
import { TeamManagerDashboard } from '@/features/dashboard/components/team-manager-dashboard';
import { StudentKnowledgeCenter } from '@/features/knowledge/components/student-knowledge-center';
import { KnowledgeDetail } from '@/features/knowledge/components/knowledge-detail';
import { AdminKnowledgeList } from '@/features/knowledge/components/admin-knowledge-list';
import { TaskList } from '@/features/tasks/components/task-list';
import { TaskDetail } from '@/features/tasks/components/task-detail';
import { TaskForm } from '@/features/tasks/components/task-form';
import { QuizPlayer } from '@/features/submissions/components/quiz-player';
import { AnswerReview } from '@/features/submissions/components/answer-review';
import { GradingList } from '@/features/grading/components/grading-list';
import { GradingForm } from '@/features/grading/components/grading-form';
import { QuizList } from '@/features/quizzes/components/quiz-list';
import { QuestionList } from '@/features/questions/components/question-list';
import { QuestionForm } from '@/features/questions/components/question-form';
import { QuizForm } from '@/features/quizzes/components/quiz-form';
import { SpotCheckList } from '@/features/spot-checks/components/spot-check-list';
import { SpotCheckForm } from '@/features/spot-checks/components/spot-check-form';
import { UserList } from '@/features/users/components/user-list';
import { UserForm } from '@/features/users/components/user-form';
import { UserDetail } from '@/features/users/components/user-detail';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { ROUTES } from '@/config/routes';

// 占位组件
const Personal = () => <div>个人中心（开发中）</div>;
const Analytics = () => <div>团队数据看板（开发中）</div>;

/**
 * 根据角色渲染对应的仪表盘
 */
const Dashboard = () => {
  const { currentRole } = useAuth();

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

/**
 * 路由配置
 */
export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* 登录页 */}
      <Route path={ROUTES.LOGIN} element={<LoginForm />} />

      {/* 仪表盘 */}
      <Route
        path={ROUTES.DASHBOARD}
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* 知识中心（学员） */}
      <Route
        path={ROUTES.KNOWLEDGE}
        element={
          <ProtectedRoute>
            <StudentKnowledgeCenter />
          </ProtectedRoute>
        }
      />
      <Route
        path={`${ROUTES.KNOWLEDGE}/:id`}
        element={
          <ProtectedRoute>
            <KnowledgeDetail />
          </ProtectedRoute>
        }
      />

      {/* 知识库管理（管理员） */}
      <Route
        path={ROUTES.ADMIN_KNOWLEDGE}
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminKnowledgeList />
          </ProtectedRoute>
        }
      />
      <Route
        path={`${ROUTES.ADMIN_KNOWLEDGE}/:id`}
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <KnowledgeDetail />
          </ProtectedRoute>
        }
      />

      {/* 任务中心 */}
      <Route
        path={ROUTES.TASKS}
        element={
          <ProtectedRoute>
            <TaskList />
          </ProtectedRoute>
        }
      />
      <Route
        path={`${ROUTES.TASKS}/create`}
        element={
          <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
            <TaskForm />
          </ProtectedRoute>
        }
      />
      <Route
        path={`${ROUTES.TASKS}/:id`}
        element={
          <ProtectedRoute>
            <TaskDetail />
          </ProtectedRoute>
        }
      />

      {/* 答题 */}
      <Route
        path="/quiz/:id"
        element={
          <ProtectedRoute>
            <QuizPlayer type="practice" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exam/:id"
        element={
          <ProtectedRoute>
            <QuizPlayer type="exam" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/review/practice"
        element={
          <ProtectedRoute>
            <AnswerReview type="practice" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/review/exam"
        element={
          <ProtectedRoute>
            <AnswerReview type="exam" />
          </ProtectedRoute>
        }
      />

      {/* 评分中心 */}
      <Route
        path={ROUTES.GRADING}
        element={
          <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
            <GradingList />
          </ProtectedRoute>
        }
      />
      <Route
        path={`${ROUTES.GRADING}/:id`}
        element={
          <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
            <GradingForm />
          </ProtectedRoute>
        }
      />

      {/* 试卷管理 */}
      <Route
        path={ROUTES.QUIZZES}
        element={
          <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
            <QuizList />
          </ProtectedRoute>
        }
      />

      {/* 测试中心 - 题目管理 */}
      <Route
        path={ROUTES.TEST_CENTER_QUESTIONS}
        element={
          <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
            <QuestionList />
          </ProtectedRoute>
        }
      />
      <Route
        path={`${ROUTES.TEST_CENTER_QUESTIONS}/create`}
        element={
          <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
            <QuestionForm />
          </ProtectedRoute>
        }
      />
      <Route
        path={`${ROUTES.TEST_CENTER_QUESTIONS}/:id/edit`}
        element={
          <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
            <QuestionForm />
          </ProtectedRoute>
        }
      />

      {/* 测试中心 - 试卷管理 */}
      <Route
        path={ROUTES.TEST_CENTER_QUIZZES}
        element={
          <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
            <QuizList />
          </ProtectedRoute>
        }
      />
      <Route
        path={`${ROUTES.TEST_CENTER_QUIZZES}/create`}
        element={
          <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
            <QuizForm />
          </ProtectedRoute>
        }
      />
      <Route
        path={`${ROUTES.TEST_CENTER_QUIZZES}/:id/edit`}
        element={
          <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
            <QuizForm />
          </ProtectedRoute>
        }
      />

      {/* 题库管理（管理员旧路由，保持兼容） */}
      <Route
        path={ROUTES.QUESTIONS}
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <QuestionList />
          </ProtectedRoute>
        }
      />

      {/* 抽查中心 */}
      <Route
        path={ROUTES.SPOT_CHECKS}
        element={
          <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER']}>
            <SpotCheckList />
          </ProtectedRoute>
        }
      />
      <Route
        path={`${ROUTES.SPOT_CHECKS}/create`}
        element={
          <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER']}>
            <SpotCheckForm />
          </ProtectedRoute>
        }
      />

      {/* 用户管理 */}
      <Route
        path={ROUTES.USERS}
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <UserList />
          </ProtectedRoute>
        }
      />
      <Route
        path={`${ROUTES.USERS}/create`}
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <UserForm />
          </ProtectedRoute>
        }
      />
      <Route
        path={`${ROUTES.USERS}/:id/edit`}
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <UserForm />
          </ProtectedRoute>
        }
      />
      <Route
        path={`${ROUTES.USERS}/:id`}
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <UserDetail />
          </ProtectedRoute>
        }
      />

      {/* 个人中心 */}
      <Route
        path={ROUTES.PERSONAL}
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <Personal />
          </ProtectedRoute>
        }
      />

      {/* 团队数据看板 */}
      <Route
        path={ROUTES.ANALYTICS}
        element={
          <ProtectedRoute allowedRoles={['TEAM_MANAGER']}>
            <Analytics />
          </ProtectedRoute>
        }
      />

      {/* 默认重定向 */}
      <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  );
};
