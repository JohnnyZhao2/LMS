import type { ExamReportExportTemplate, ExamReportView } from '@/types/dashboard';

export const VIEW_META: Record<
  ExamReportView,
  { label: string; template: ExamReportExportTemplate; sheetLabel: string }
> = {
  student: { label: '学员视角', template: 'student_summary', sheetLabel: '学员汇总' },
  exam: { label: '考试视角', template: 'exam_summary', sheetLabel: '考试汇总' },
  detail: { label: '明细视角', template: 'detail', sheetLabel: '考试明细' },
};

export const VIEW_OPTIONS = (Object.keys(VIEW_META) as ExamReportView[]).map((value) => ({
  value,
  label: VIEW_META[value].label,
}));
