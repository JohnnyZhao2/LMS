import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentRole } from '@/hooks/use-current-role';
import type {
  ExamReportFiltersState,
  ExamReportResponse,
} from '@/features/dashboard/types/dashboard';
import { buildExamReportQueryString } from '@/features/dashboard/utils/exam-report-query';

const EXAM_REPORT_ROLES = new Set(['MENTOR', 'DEPT_MANAGER', 'ADMIN', 'SUPER_ADMIN']);

export const getExamReport = (filters: ExamReportFiltersState) =>
  apiClient.get<ExamReportResponse>(
    `/dashboard/exam-report/?${buildExamReportQueryString(filters, { includePagination: true })}`,
  );

export const useExamReport = (filters: ExamReportFiltersState) => {
  const currentRole = useCurrentRole();
  const enabled = EXAM_REPORT_ROLES.has(currentRole ?? '');
  const query = buildExamReportQueryString(filters, { includePagination: true });

  return useQuery({
    queryKey: queryKeys.dashboards.examReport({ currentRole, filters: query }),
    queryFn: () => getExamReport(filters),
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
};
