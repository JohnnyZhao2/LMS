/**
 * 任务详情路由：学员看详情；管理端有预览权限则重定向到 preview。
 * knowledge 详情弹窗在 app 层注入 tags 能力。
 */
import { Navigate, useParams } from 'react-router-dom';

import { knowledgeTagDeps } from '@/app/tag-deps';
import { getRolePathPrefix, normalizeRoleCode } from '@/config/role-paths';
import { KnowledgeDetailModal } from '@/features/knowledge/components/modals/knowledge-detail-modal';
import type { TaskKnowledgePreviewProps } from '@/features/tasks/components/task-form/task-form';
import { TaskDetail } from '@/features/tasks/components/task-detail';
import { useAuth } from '@/lib/auth-context';

const KnowledgeDetailWithTags = (props: TaskKnowledgePreviewProps) => (
  <KnowledgeDetailModal {...props} tagDeps={knowledgeTagDeps} />
);

export const TaskDetailRoutePage = () => {
  const { id, role } = useParams<{ id: string; role: string }>();
  const { hasCapability } = useAuth();
  const normalizedRole = normalizeRoleCode(role);

  const canOpenTaskPreview =
    hasCapability('task.update') ||
    hasCapability('task.analytics.view') ||
    hasCapability('grading.view');

  if (normalizedRole === 'STUDENT' || !canOpenTaskPreview) {
    return <TaskDetail KnowledgeDetail={KnowledgeDetailWithTags} />;
  }

  const rolePrefix = getRolePathPrefix(normalizedRole);
  return <Navigate to={`${rolePrefix}/tasks/${id}/preview?tab=progress&entry=task-management`} replace />;
};
