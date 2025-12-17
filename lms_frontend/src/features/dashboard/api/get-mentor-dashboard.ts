/**
 * Get Mentor Dashboard API
 * Fetches dashboard data for mentors and department managers
 * @module features/dashboard/api/get-mentor-dashboard
 * Requirements: 11.1, 11.2, 11.3 - Display statistics for subordinate students
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import { dashboardKeys } from './keys';

/**
 * Mentor/Department Manager Dashboard Data
 * Requirements: 11.1, 11.2, 11.3
 */
export interface MentorDashboardData {
  /** 所辖学员数量 */
  student_count: number;
  /** 所辖学员的任务完成率 (0-100) */
  completion_rate: number;
  /** 所辖学员的平均分 */
  average_score: number;
  /** 待评分考试数量 */
  pending_grading_count: number;
  /** 最近提交的答题记录 */
  recent_submissions: Array<{
    id: number;
    student_name: string;
    task_title: string;
    task_type: 'PRACTICE' | 'EXAM';
    submitted_at: string;
    status: 'SUBMITTED' | 'GRADING' | 'GRADED';
  }>;
}

/**
 * Fetch mentor/department manager dashboard data
 * @returns Mentor dashboard data with student statistics
 * Requirements: 11.1 - Display completion rate statistics for subordinate students
 * Requirements: 11.2 - Display average score statistics for subordinate students
 * Requirements: 11.3 - Display pending grading exam count
 */
export async function fetchMentorDashboard(): Promise<MentorDashboardData> {
  return api.get<MentorDashboardData>(API_ENDPOINTS.dashboard.mentor);
}

/**
 * Hook to get mentor/department manager dashboard data
 * Requirements: 11.1, 11.2, 11.3
 */
export function useMentorDashboard() {
  return useQuery({
    queryKey: dashboardKeys.mentor(),
    queryFn: fetchMentorDashboard,
  });
}
