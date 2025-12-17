/**
 * Get Student Dashboard API
 * Fetches dashboard data for students
 * @module features/dashboard/api/get-student-dashboard
 * Requirements: 4.1, 4.2 - Display pending tasks and latest knowledge documents
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { StudentDashboardData } from '@/types/api';
import { dashboardKeys } from './keys';

/**
 * Fetch student dashboard data
 * @returns Student dashboard data including pending tasks and latest knowledge
 * Requirements: 4.1 - Display pending tasks (learning/practice/exam)
 * Requirements: 4.2 - Display latest knowledge documents
 */
export async function fetchStudentDashboard(): Promise<StudentDashboardData> {
  return api.get<StudentDashboardData>(API_ENDPOINTS.dashboard.student);
}

/**
 * Hook to get student dashboard data
 */
export function useStudentDashboard() {
  return useQuery({
    queryKey: dashboardKeys.student(),
    queryFn: fetchStudentDashboard,
  });
}
