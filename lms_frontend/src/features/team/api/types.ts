/**
 * Team API Types
 * Type definitions for team manager dashboard API
 * @module features/team/api/types
 */

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
