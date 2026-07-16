import { buildExamReportQueryString } from '@/features/dashboard/utils/exam-report-query';
import { apiClient } from '@/lib/api-client';
import type {
  ExamReportExportTemplate,
  ExamReportFiltersState,
} from '@/features/dashboard/types/dashboard';

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
