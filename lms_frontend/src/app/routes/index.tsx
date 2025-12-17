/**
 * Route Configuration
 * Defines all application routes with nested layouts
 * Requirements: 3.1
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout, AuthLayout } from '@/app/layouts';
import { ProtectedRoute, RoleGuard } from './guards';
import { ROLE_CODES, type RoleCode } from '@/config/roles';

// Auth pages
import { LoginPage } from '@/features/auth/LoginPage';

// Dashboard
import { Dashboard } from '@/features/dashboard/Dashboard';

// Student pages
import { KnowledgeCenter } from '@/features/knowledge/KnowledgeCenter';
import { KnowledgeReader } from '@/features/knowledge/KnowledgeReader';
import { KnowledgeManagement } from '@/features/knowledge/KnowledgeManagement';
import { TaskCenter } from '@/features/tasks/TaskCenter';
import { LearningTaskPage } from '@/features/tasks/LearningTaskPage';
import { PracticeTaskPage } from '@/features/tasks/PracticeTaskPage';
import { ExamTaskPage } from '@/features/tasks/ExamTaskPage';
import { PracticeRunner } from '@/features/tasks/PracticeRunner';
import { ExamRunner } from '@/features/tasks/ExamRunner';

// Mentor/Manager pages
import { TestCenter } from '@/features/test-center/TestCenter';
import { QuestionManagement } from '@/features/test-center/QuestionManagement';
import { QuizManagement } from '@/features/test-center/QuizManagement';
import { TaskManagement } from '@/features/tasks/TaskManagement';

// Admin pages
import { UserDirectory } from '@/features/user-mgmt/UserDirectory';
import { OrganizationView } from '@/features/user-mgmt/OrganizationView';
import { MentorshipView } from '@/features/user-mgmt/MentorshipView';

// Team Manager pages
import { TeamDashboard } from '@/features/team/components/TeamDashboard';

// Analytics
import { AnalyticsDashboard } from '@/features/analytics/components/AnalyticsDashboard';
import { PersonalCenter } from '@/features/analytics/components/PersonalCenter';

// Grading
import { GradingCenter } from '@/features/grading/GradingCenter';

// Spot Checks
import { SpotCheckCenter } from '@/features/spot-checks/SpotCheckCenter';

// 403 Forbidden page
function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-6xl font-bold text-primary mb-4">403</h1>
      <h2 className="text-2xl font-semibold text-white mb-2">访问被拒绝</h2>
      <p className="text-text-muted mb-6">您没有权限访问此页面</p>
      <a href="/dashboard" className="text-primary hover:underline">
        返回仪表盘
      </a>
    </div>
  );
}

// 404 Not Found page
function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-white mb-2">页面未找到</h2>
      <p className="text-text-muted mb-6">您访问的页面不存在</p>
      <a href="/dashboard" className="text-primary hover:underline">
        返回仪表盘
      </a>
    </div>
  );
}

/**
 * Role arrays for route guards
 */
const STUDENT_ROLES: RoleCode[] = [ROLE_CODES.STUDENT];
const MENTOR_ROLES: RoleCode[] = [ROLE_CODES.MENTOR, ROLE_CODES.DEPT_MANAGER, ROLE_CODES.ADMIN];
const ADMIN_ROLES: RoleCode[] = [ROLE_CODES.ADMIN];
const TEAM_MANAGER_ROLES: RoleCode[] = [ROLE_CODES.TEAM_MANAGER];

/**
 * Application Routes Component
 * Configures all routes with proper guards and layouts
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes - Auth Layout */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected Routes - Main Layout */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Root redirect */}
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* Dashboard - accessible by all authenticated users */}
        <Route
          path="dashboard"
          element={
            <RoleGuard allowedRoles={[ROLE_CODES.STUDENT, ROLE_CODES.MENTOR, ROLE_CODES.DEPT_MANAGER]}>
              <Dashboard />
            </RoleGuard>
          }
        />

        {/* Student Routes */}
        <Route
          path="knowledge"
          element={
            <RoleGuard allowedRoles={[...STUDENT_ROLES, ...MENTOR_ROLES]}>
              <KnowledgeCenter />
            </RoleGuard>
          }
        />
        <Route
          path="knowledge/:id"
          element={
            <RoleGuard allowedRoles={[...STUDENT_ROLES, ...MENTOR_ROLES]}>
              <KnowledgeReader />
            </RoleGuard>
          }
        />
        <Route
          path="tasks"
          element={
            <RoleGuard allowedRoles={STUDENT_ROLES}>
              <TaskCenter />
            </RoleGuard>
          }
        />
        {/* Learning Task Detail - Requirements: 7.1-7.5 */}
        <Route
          path="tasks/learning/:taskId"
          element={
            <RoleGuard allowedRoles={STUDENT_ROLES}>
              <LearningTaskPage />
            </RoleGuard>
          }
        />
        {/* Practice Task Detail - Requirements: 8.1-8.3 */}
        <Route
          path="tasks/practice/:taskId"
          element={
            <RoleGuard allowedRoles={STUDENT_ROLES}>
              <PracticeTaskPage />
            </RoleGuard>
          }
        />
        {/* Practice Quiz Runner */}
        <Route
          path="tasks/practice/:taskId/quiz/:quizId"
          element={
            <RoleGuard allowedRoles={STUDENT_ROLES}>
              <PracticeRunner />
            </RoleGuard>
          }
        />
        {/* Exam Task Detail - Requirements: 9.1-9.4 */}
        <Route
          path="tasks/exam/:taskId"
          element={
            <RoleGuard allowedRoles={STUDENT_ROLES}>
              <ExamTaskPage />
            </RoleGuard>
          }
        />
        {/* Exam Runner */}
        <Route
          path="tasks/exam/:taskId/start"
          element={
            <RoleGuard allowedRoles={STUDENT_ROLES}>
              <ExamRunner />
            </RoleGuard>
          }
        />
        <Route
          path="personal"
          element={
            <RoleGuard allowedRoles={STUDENT_ROLES}>
              <PersonalCenter />
            </RoleGuard>
          }
        />

        {/* Mentor/Manager Routes */}
        <Route
          path="test-center"
          element={
            <RoleGuard allowedRoles={MENTOR_ROLES}>
              <TestCenter />
            </RoleGuard>
          }
        />
        {/* Requirements: 12.1 - Question management */}
        <Route
          path="test-center/questions"
          element={
            <RoleGuard allowedRoles={MENTOR_ROLES}>
              <QuestionManagement />
            </RoleGuard>
          }
        />
        {/* Requirements: 13.1 - Quiz management */}
        <Route
          path="test-center/quizzes"
          element={
            <RoleGuard allowedRoles={MENTOR_ROLES}>
              <QuizManagement />
            </RoleGuard>
          }
        />
        {/* Task creation is handled via modal in TaskManagement page */}
        <Route
          path="tasks/create"
          element={<Navigate to="/task-management" replace />}
        />
        {/* Requirements: 15.1 - Grading center for mentors/managers */}
        <Route
          path="grading"
          element={
            <RoleGuard allowedRoles={[ROLE_CODES.MENTOR, ROLE_CODES.DEPT_MANAGER]}>
              <GradingCenter />
            </RoleGuard>
          }
        />
        {/* Requirements: 16.1 - Spot check center for mentors/managers */}
        <Route
          path="spot-checks"
          element={
            <RoleGuard allowedRoles={[ROLE_CODES.MENTOR, ROLE_CODES.DEPT_MANAGER]}>
              <SpotCheckCenter />
            </RoleGuard>
          }
        />

        {/* Requirements: 14.1 - Task management for mentors/managers/admin */}
        <Route
          path="task-management"
          element={
            <RoleGuard allowedRoles={MENTOR_ROLES}>
              <TaskManagement />
            </RoleGuard>
          }
        />

        {/* Admin Routes */}
        {/* Requirements: 17.1 - Knowledge management for admin */}
        <Route
          path="knowledge-management"
          element={
            <RoleGuard allowedRoles={ADMIN_ROLES}>
              <KnowledgeManagement />
            </RoleGuard>
          }
        />
        <Route
          path="users"
          element={
            <RoleGuard allowedRoles={ADMIN_ROLES}>
              <UserDirectory />
            </RoleGuard>
          }
        />
        <Route
          path="organization"
          element={
            <RoleGuard allowedRoles={ADMIN_ROLES}>
              <OrganizationView />
            </RoleGuard>
          }
        />
        <Route
          path="mentorship"
          element={
            <RoleGuard allowedRoles={ADMIN_ROLES}>
              <MentorshipView />
            </RoleGuard>
          }
        />

        {/* Team Manager Routes - Requirements: 20.1, 20.4 */}
        <Route
          path="team-dashboard"
          element={
            <RoleGuard allowedRoles={TEAM_MANAGER_ROLES}>
              <TeamDashboard />
            </RoleGuard>
          }
        />

        {/* Legacy routes - redirect to new paths */}
        <Route path="team" element={<Navigate to="/team-dashboard" replace />} />
        <Route path="reports" element={<Navigate to="/grading" replace />} />
        <Route path="ops" element={<Navigate to="/spot-checks" replace />} />
        <Route path="analytics" element={<AnalyticsDashboard />} />

        {/* Error pages */}
        <Route path="forbidden" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Catch-all redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRoutes;
