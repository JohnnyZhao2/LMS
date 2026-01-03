/**
 * 仪表盘路由
 */
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/protected-route';
import { StudentDashboard } from '@/features/dashboard/components/student-dashboard';
import { MentorDashboard } from '@/features/dashboard/components/mentor-dashboard';
import { TeamManagerDashboard } from '@/features/dashboard/components/team-manager-dashboard';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { ROUTES } from '@/config/routes';

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
