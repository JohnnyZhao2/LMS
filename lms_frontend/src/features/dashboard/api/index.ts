/**
 * Dashboard API exports
 * @module features/dashboard/api
 */

export { dashboardKeys } from './keys';
export { fetchStudentDashboard, useStudentDashboard } from './get-student-dashboard';
export { 
  fetchMentorDashboard, 
  useMentorDashboard,
  type MentorDashboardData 
} from './get-mentor-dashboard';
