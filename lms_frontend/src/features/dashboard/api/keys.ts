/**
 * Dashboard Query Keys
 * React Query keys for dashboard data caching
 * @module features/dashboard/api/keys
 */

/**
 * Query keys for dashboard data
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  student: () => [...dashboardKeys.all, 'student'] as const,
  mentor: () => [...dashboardKeys.all, 'mentor'] as const,
};
