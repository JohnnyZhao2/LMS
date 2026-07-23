import { apiClient } from '@/lib/api-client';
import { buildPaginationParams, buildQueryString } from '@/lib/api-utils';
import type {
  SpotCheck,
  SpotCheckCreateRequest,
  SpotCheckScoreRequest,
  SpotCheckStatus,
  SpotCheckStudent,
  SpotCheckSubmitRequest,
} from '@/features/spot-checks/types/spot-check';
import type { PaginatedResponse } from '@/types/common';

export interface GetSpotChecksParams {
  page?: number;
  pageSize?: number;
  studentId?: number;
  batchId?: string | null;
  status?: SpotCheckStatus;
  topic?: string;
}

export interface GetMySpotChecksParams {
  page?: number;
  pageSize?: number;
  status?: string;
}

export interface GetSpotCheckStudentsParams {
  search?: string;
}

export const getSpotChecks = ({
  page = 1,
  pageSize = 20,
  studentId,
  batchId,
  status,
  topic,
}: GetSpotChecksParams = {}) =>
  apiClient.get<PaginatedResponse<SpotCheck>>(
    `/spot-checks/${buildQueryString({
      ...buildPaginationParams(page, pageSize),
      student_id: studentId,
      batch_id: batchId || undefined,
      status,
      topic: topic?.trim() || undefined,
    })}`,
  );

export const getMySpotChecks = ({ page = 1, pageSize = 50, status }: GetMySpotChecksParams = {}) =>
  apiClient.get<PaginatedResponse<SpotCheck>>(
    `/spot-checks/mine/${buildQueryString({
      ...buildPaginationParams(page, pageSize),
      status: status && status !== 'all' ? status : undefined,
    })}`,
  );

export const getSpotCheckBatchPeers = async (batchId: string) => {
  const pageSize = 100;
  let page = 1;
  const all: SpotCheck[] = [];

  while (true) {
    const response = await getSpotChecks({ page, pageSize, batchId });
    all.push(...response.results);
    if (page >= response.total_pages || response.results.length === 0) break;
    page += 1;
  }

  return all;
};

export const getSpotCheckStudents = ({ search }: GetSpotCheckStudentsParams = {}) =>
  apiClient.get<SpotCheckStudent[]>(`/spot-checks/students/${buildQueryString({ search })}`);

export const getSpotCheck = (id: number) => apiClient.get<SpotCheck>(`/spot-checks/${id}/`);

export const createSpotCheck = (data: SpotCheckCreateRequest) =>
  apiClient.post<SpotCheck[]>('/spot-checks/', data);

export const scoreSpotCheck = ({ id, data }: { id: number; data: SpotCheckScoreRequest }) =>
  apiClient.post<SpotCheck>(`/spot-checks/${id}/score/`, data);

export const submitSpotCheck = ({ id, data }: { id: number; data: SpotCheckSubmitRequest }) =>
  apiClient.post<SpotCheck>(`/spot-checks/${id}/submit/`, data);

export const deleteSpotCheck = (id: number) => apiClient.delete(`/spot-checks/${id}/`);
