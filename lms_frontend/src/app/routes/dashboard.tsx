import { lazy } from 'react';

import { useAuth } from '@/lib/auth';
import { useWorkbench } from '@/hooks/use-workbench';

const StudentDashboard = lazy(() => import('@/features/dashboard/components/student-dashboard').then((module) => ({ default: module.StudentDashboard })));
const MentorDashboard = lazy(() => import('@/features/dashboard/components/mentor-dashboard').then((module) => ({ default: module.MentorDashboard })));
const AdminDashboard = lazy(() => import('@/features/dashboard/components/admin-dashboard').then((module) => ({ default: module.AdminDashboard })));

export const DashboardPage = () => {
  const { managementRole, user } = useAuth();
  const workbench = useWorkbench();

  if (workbench === 'learn') return <StudentDashboard />;
  if (managementRole === 'MENTOR' || managementRole === 'DEPT_MANAGER') return <MentorDashboard />;
  if (managementRole === 'ADMIN' || user?.is_superuser) return <AdminDashboard />;
  return <StudentDashboard />;
};
