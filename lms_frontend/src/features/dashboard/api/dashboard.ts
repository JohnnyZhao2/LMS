/**
 * Dashboard API
 * API functions for fetching dashboard data
 * Requirements: 4.1, 4.2
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { StudentDashboardData, MentorDashboardData } from '@/types/api';

/**
 * Query keys for dashboard data
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  student: () => [...dashboardKeys.all, 'student'] as const,
  mentor: () => [...dashboardKeys.all, 'mentor'] as const,
};

/**
 * Fetch student dashboard data
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

/**
 * Fetch mentor dashboard data
 */
export async function fetchMentorDashboard(): Promise<MentorDashboardData> {
  return api.get<MentorDashboardData>(API_ENDPOINTS.dashboard.mentor);
}

/**
 * Hook to get mentor dashboard data
 */
export function useMentorDashboard() {
  return useQuery({
    queryKey: dashboardKeys.mentor(),
    queryFn: fetchMentorDashboard,
  });
}
