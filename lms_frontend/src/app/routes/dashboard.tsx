/**
 * 仪表盘路由
 */
import { Route } from 'react-router-dom';
import { lazy } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { ROUTES } from '@/config/routes';

const StudentDashboard = lazy(() => import('@/features/dashboard/components/student-dashboard').then(m => ({ default: m.StudentDashboard })));
const MentorDashboard = lazy(() => import('@/features/dashboard/components/mentor-dashboard').then(m => ({ default: m.MentorDashboard })));
const TeamManagerDashboard = lazy(() => import('@/features/dashboard/components/team-manager-dashboard').then(m => ({ default: m.TeamManagerDashboard })));

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

export const dashboardRoutes = [
  <Route
    key="dashboard"
    path={ROUTES.DASHBOARD}
    element={
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    }
  />,
];
