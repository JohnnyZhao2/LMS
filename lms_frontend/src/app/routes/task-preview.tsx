/**
 * 任务预览路由：app 层组合 tasks 预览页 + grading 面板。
 */
import { GradingCenterTab } from '@/features/assessment/components/grading/grading-center-tab';
import { TaskPreviewPage } from '@/features/tasks/components/task-preview/task-preview-page';

export const TaskPreviewRoutePage = () => (
  <TaskPreviewPage GradingPanel={GradingCenterTab} />
);
