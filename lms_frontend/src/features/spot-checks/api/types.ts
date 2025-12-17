/**
 * Spot Check API Types
 * Type definitions for spot check center API
 * @module features/spot-checks/api/types
 */

import type { UserBasic, SpotCheck } from '@/types/domain';
import type { ListParams } from '@/types/api';

/**
 * Spot check list item
 */
export interface SpotCheckListItem {
  id: number;
  student: UserBasic;
  content: string;
  score: number;
  comment?: string;
  checked_by: UserBasic;
  checked_at: string;
}

/**
 * Spot check detail data
 * Using type alias since no additional fields are needed
 */
export type SpotCheckDetail = SpotCheck;

/**
 * Create spot check request
 * Requirements: 16.3 - 要求选择被抽查学员、填写抽查内容、评分和评语
 */
export interface CreateSpotCheckRequest {
  student_id: number;
  content: string;
  score: number;
  comment?: string;
}

/**
 * Update spot check request
 */
export interface UpdateSpotCheckRequest {
  content?: string;
  score?: number;
  comment?: string;
}

/**
 * Spot check filter params
 */
export interface SpotCheckFilterParams extends ListParams {
  student_id?: number;
  checked_by_id?: number;
  start_date?: string;
  end_date?: string;
}
