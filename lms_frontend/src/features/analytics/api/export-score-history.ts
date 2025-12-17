/**
 * Export Score History API
 * Exports score history as a file
 * @module features/analytics/api/export-score-history
 * Requirements: 10.4 - Download file containing score history
 */

import { API_ENDPOINTS } from '@/config/api';
import type { ScoreHistoryParams } from './types';

/**
 * Export score history as file
 * Requirements: 10.4 - Download file containing score history
 * @param params - Filter parameters
 * @returns Blob containing the exported file
 */
export async function exportScoreHistory(
  params?: ScoreHistoryParams
): Promise<Blob> {
  const searchParams = new URLSearchParams();
  
  if (params?.type) searchParams.set('task_type', params.type);
  
  const queryString = searchParams.toString();
  const url = queryString
    ? `${API_ENDPOINTS.personalCenter.scoresExport}?${queryString}`
    : API_ENDPOINTS.personalCenter.scoresExport;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('lms_access_token')}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('导出失败');
  }
  
  return response.blob();
}
