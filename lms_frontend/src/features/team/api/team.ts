/**
 * Team Data API
 * API functions for team manager dashboard data
 * Requirements: 20.1, 20.3
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

// ============================================
// Types
// ============================================

/**
 * Department completion statistics
 */
export interface DepartmentStats {
  department_id: number;
  department_name: string;
  completion_rate: number;
  average_score: number;
  student_count: number;
}

/**
 * Team overview response
 * Requirements: 20.1, 20.2
 */
export interface TeamOverviewResponse {
  departments: DepartmentStats[];
  total_students: number;
  overall_completion_rate: number;
  overall_average_score: number;
}

/**
 * Knowledge heat item
 * Requirements: 20.3
 */
export interface KnowledgeHeatItem {
  id: number;
  title: string;
  view_count: number;
  completion_count: number;
  primary_category: string;
}

/**
 * Knowledge heat response
 */
export interface KnowledgeHeatResponse {
  items: KnowledgeHeatItem[];
  total_count: number;
}

// ============================================
// API Functions
// ============================================

/**
 * Fetch team overview data
 * Requirements: 20.1, 20.2
 */
export async function fetchTeamOverview(): Promise<TeamOverviewResponse> {
  return api.get<TeamOverviewResponse>(API_ENDPOINTS.analytics.teamOverview);
}

/**
 * Fetch knowledge heat data
 * Requirements: 20.3
 */
export async function fetchKnowledgeHeat(): Promise<KnowledgeHeatResponse> {
  return api.get<KnowledgeHeatResponse>(API_ENDPOINTS.analytics.knowledgeHeat);
}

// ============================================
// React Query Hooks
// ============================================

/**
 * Hook to fetch team overview data
 * Requirements: 20.1, 20.2
 */
export function useTeamOverview() {
  return useQuery({
    queryKey: ['team', 'overview'],
    queryFn: fetchTeamOverview,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch knowledge heat data
 * Requirements: 20.3
 */
export function useKnowledgeHeat() {
  return useQuery({
    queryKey: ['team', 'knowledge-heat'],
    queryFn: fetchKnowledgeHeat,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
