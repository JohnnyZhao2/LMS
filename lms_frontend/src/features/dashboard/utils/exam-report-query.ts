import type {
  ExamReportExportTemplate,
  ExamReportFiltersState,
} from '@/features/dashboard/types/dashboard';

export const buildExamReportQueryString = (
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
