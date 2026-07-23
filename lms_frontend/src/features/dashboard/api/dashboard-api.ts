import { buildExamReportQueryString } from '@/features/dashboard/utils/exam-report-query';
import type {
  AdminDashboard,
  ExamReportExportTemplate,
  ExamReportFiltersState,
  ExamReportResponse,
  MentorDashboard,
  StudentDashboard,
  TaskParticipant,
  TeamManagerDashboard,
} from '@/features/dashboard/types/dashboard';
import { apiClient } from '@/lib/api-client';

export const getAdminDashboard = () =>
  apiClient.get<AdminDashboard>('/dashboard/admin/');

export const getMentorDashboard = () =>
  apiClient.get<MentorDashboard>('/dashboard/mentor/');

export const getStudentDashboard = (taskLimit: number, knowledgeLimit: number) =>
  apiClient.get<StudentDashboard>(
    `/dashboard/student/?task_limit=${taskLimit}&knowledge_limit=${knowledgeLimit}`,
  );

export const getTaskParticipants = (taskId: number) =>
  apiClient.get<TaskParticipant[]>(`/dashboard/student/task/${taskId}/participants/`);

export const getTeamManagerDashboard = () =>
  apiClient.get<TeamManagerDashboard>('/dashboard/team-manager/');

export const getExamReport = (filters: ExamReportFiltersState) =>
  apiClient.get<ExamReportResponse>(
    `/dashboard/exam-report/?${buildExamReportQueryString(filters, { includePagination: true })}`,
  );

/**
 * 下载考试报告 Excel，触发浏览器保存。
 */
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
