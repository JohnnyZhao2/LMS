import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentRole } from '@/session/hooks/use-current-role';
import type {
  ExamReportExportTemplate,
  ExamReportFiltersState,
  ExamReportResponse,
} from '@/types/dashboard';

const EXAM_REPORT_ROLES = new Set(['MENTOR', 'DEPT_MANAGER', 'ADMIN', 'SUPER_ADMIN']);

const buildExamReportQueryString = (
  filters: ExamReportFiltersState,
  options?: { template?: ExamReportExportTemplate; includePagination?: boolean },
) => {
  const params = new URLSearchParams({ view: filters.view });
  if (filters.examId) params.set('exam_id', String(filters.examId));
  if (filters.studentId) params.set('student_id', String(filters.studentId));
  if (filters.departmentId) params.set('department_id', String(filters.departmentId));
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  if (options?.includePagination) {
    params.set('page', String(filters.page ?? 1));
    params.set('page_size', String(filters.pageSize ?? 10));
  }
  if (options?.template) params.set('template', options.template);
  return params.toString();
};

export const useExamReport = (filters: ExamReportFiltersState) => {
  const currentRole = useCurrentRole();
  const enabled = EXAM_REPORT_ROLES.has(currentRole ?? '');
  const query = buildExamReportQueryString(filters, { includePagination: true });

  return useQuery({
    queryKey: queryKeys.dashboards.examReport({ currentRole, filters: query }),
    queryFn: () =>
      apiClient.get<ExamReportResponse>(`/dashboard/exam-report/?${query}`),
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
};

export const downloadExamReport = async (
  filters: ExamReportFiltersState,
  template: ExamReportExportTemplate,
) => {
  const query = buildExamReportQueryString(filters, { template });
  const blob = await apiClient.download(`/dashboard/exam-report/export/?${query}`);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `exam_report_${template}_${Date.now()}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
};
