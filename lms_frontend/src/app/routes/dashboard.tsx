import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

import { getFirstAccessibleRoutePath } from '@/app/menu-builder';
import { useRoleMenu } from '@/app/navigation/use-role-menu';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useSetWorkbench, useWorkbench } from '@/hooks/use-workbench';
import { useAuth } from '@/lib/auth';

const StudentDashboard = lazy(() => import('@/features/dashboard/components/student-dashboard').then((module) => ({ default: module.StudentDashboard })));
const MentorDashboard = lazy(() => import('@/features/dashboard/components/mentor-dashboard').then((module) => ({ default: module.MentorDashboard })));
const AdminDashboard = lazy(() => import('@/features/dashboard/components/admin-dashboard').then((module) => ({ default: module.AdminDashboard })));

export const DashboardPage = () => {
  const { hasCapability, hasFullScopeCapability } = useAuth();
  const workbench = useWorkbench();
  const setWorkbench = useSetWorkbench();
  const menuItems = useRoleMenu(workbench);

  if (workbench === 'learn') return <StudentDashboard />;
  const canViewDashboard = hasCapability('tasks.view_task_analytics');
  const hasFullScopeDashboard = hasFullScopeCapability('tasks.view_task_analytics');
  if (canViewDashboard && hasFullScopeDashboard) return <AdminDashboard />;
  if (canViewDashboard) return <MentorDashboard />;

  const firstPath = getFirstAccessibleRoutePath(menuItems);
  if (firstPath) {
    return <Navigate to={firstPath} replace />;
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6">
      <EmptyState
        icon={ShieldAlert}
        title="暂无可用的管理功能"
        description="当前角色尚未配置可访问的管理端页面，请联系管理员分配权限或切回学员端。"
      />
      <Button variant="outline" onClick={() => setWorkbench('learn')}>
        切回学员端
      </Button>
    </div>
  );
};
