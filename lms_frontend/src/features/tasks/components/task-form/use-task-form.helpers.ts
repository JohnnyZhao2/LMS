import type { TaskCreateRequest } from '@/features/tasks/api/create-task';
import type { TaskUpdateRequest } from '@/features/tasks/api/update-task';
import { formatScore } from '@/lib/score';
import type { TaskDetail } from '@/types/task';

import type { ResourceGroup, SelectedResource } from './task-form.types';

export const buildStableUid = (seed: string, fallback: number): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 2147483647;
  }
  return hash || fallback;
};

export const buildTaskFormInitialSelectedResources = ({
  isEdit,
  task,
  initialResources,
}: {
  isEdit: boolean;
  task?: TaskDetail;
  initialResources?: SelectedResource[];
}): SelectedResource[] => {
  if (isEdit && task) {
    const knowledgeResources: SelectedResource[] = (task.knowledge_items || []).map((item, idx) => {
      const sourceId = item.knowledge ?? -item.knowledge_revision_id;
      return {
        uid: buildStableUid(`DOCUMENT:${sourceId}:${idx}`, item.knowledge_revision_id + idx),
        id: sourceId,
        title: item.source_title || item.knowledge_title || `文档 ${item.knowledge_revision_id}`,
        resourceType: 'DOCUMENT',
        category: item.space_tag_name || '文档',
        isMissingSource: item.knowledge == null,
      };
    });

    const practiceResources: SelectedResource[] = (task.quizzes || [])
      .filter((item) => item.allow_retry)
      .map((item, idx) => {
        const sourceId = item.quiz ?? -item.task_quiz_id;
        return {
          uid: buildStableUid(`QUIZ:${sourceId}:${idx}:practice`, item.task_quiz_id + idx + 1000),
          id: sourceId,
          taskQuizId: item.task_quiz_id,
          title: item.source_title || item.quiz_title || `试卷 ${item.task_quiz_id}`,
          resourceType: 'QUIZ',
          category: `${item.question_count || 0} 题 · 总分 ${formatScore(item.total_score)}`,
          quizType: 'PRACTICE',
          totalScore: Number(item.total_score || 0),
          isMissingSource: item.quiz == null,
        };
      });

    const examResources: SelectedResource[] = (task.quizzes || [])
      .filter((item) => !item.allow_retry)
      .map((item, idx) => {
        const sourceId = item.quiz ?? -item.task_quiz_id;
        return {
          uid: buildStableUid(`QUIZ:${sourceId}:${idx}:exam`, item.task_quiz_id + idx + 2000),
          id: sourceId,
          taskQuizId: item.task_quiz_id,
          title: item.source_title || item.quiz_title || `试卷 ${item.task_quiz_id}`,
          resourceType: 'QUIZ',
          category: `${item.question_count || 0} 题 · 总分 ${formatScore(item.total_score)}`,
          quizType: 'EXAM',
          totalScore: Number(item.total_score || 0),
          duration: item.duration != null ? String(item.duration) : '',
          passScore: item.pass_score != null ? formatScore(item.pass_score) : '',
          isMissingSource: item.quiz == null,
        };
      });

    return [...knowledgeResources, ...practiceResources, ...examResources];
  }

  if (!isEdit && initialResources && initialResources.length > 0) {
    return initialResources;
  }

  return [];
};

export const hasMissingTaskResourceSources = (resources: SelectedResource[]) =>
  resources.some((item) => item.isMissingSource);

export const TASK_RESOURCE_GROUP_ORDER: ResourceGroup[] = ['DOCUMENT', 'PRACTICE', 'EXAM'];

export const getTaskResourceGroup = (resource: Pick<SelectedResource, 'resourceType' | 'quizType'>): ResourceGroup => {
  if (resource.resourceType === 'DOCUMENT') {
    return 'DOCUMENT';
  }
  return resource.quizType === 'EXAM' ? 'EXAM' : 'PRACTICE';
};

export const sortSelectedResourcesByGroup = (resources: SelectedResource[]): SelectedResource[] => {
  return [...resources].sort((left, right) => {
    const leftOrder = TASK_RESOURCE_GROUP_ORDER.indexOf(getTaskResourceGroup(left));
    const rightOrder = TASK_RESOURCE_GROUP_ORDER.indexOf(getTaskResourceGroup(right));
    return leftOrder - rightOrder;
  });
};

export const reorderSelectedResourcesWithinGroup = (
  resources: SelectedResource[],
  activeUid: string,
  overUid: string,
): SelectedResource[] => {
  const oldIndex = resources.findIndex((item) => String(item.uid) === activeUid);
  const newIndex = resources.findIndex((item) => String(item.uid) === overUid);

  if (oldIndex === -1 || newIndex === -1) {
    return resources;
  }

  if (getTaskResourceGroup(resources[oldIndex]) !== getTaskResourceGroup(resources[newIndex])) {
    return resources;
  }

  const nextResources = [...resources];
  const [moved] = nextResources.splice(oldIndex, 1);
  nextResources.splice(newIndex, 0, moved);
  return nextResources;
};

export const getExamResourcesValidationError = (
  resources: SelectedResource[],
  options?: { isEdit?: boolean },
): string | null => {
  const isEdit = options?.isEdit ?? false;
  for (const item of resources) {
    if (item.resourceType !== 'QUIZ' || item.quizType !== 'EXAM') {
      continue;
    }
    if (!isEdit) {
      const parsedDuration = Number(item.duration);
      if (!item.duration?.trim() || !Number.isInteger(parsedDuration) || parsedDuration <= 0) {
        return `请为考试「${item.title}」设置有效的参考时间（分钟）`;
      }
    }
    const parsedPassScore = Number(item.passScore);
    if (!item.passScore?.trim() || !Number.isFinite(parsedPassScore) || parsedPassScore <= 0) {
      return `请为考试「${item.title}」设置大于 0 的及格分数`;
    }
    if (item.totalScore && item.totalScore > 0 && parsedPassScore > item.totalScore) {
      return `考试「${item.title}」的及格分数不能超过总分 ${formatScore(item.totalScore)}`;
    }
  }
  return null;
};

export const buildTaskSubmitPayload = ({
  title,
  description,
  deadline,
  selectedResources,
  selectedUserIds,
  resourcesDisabled,
}: {
  title: string;
  description: string;
  deadline: Date;
  selectedResources: SelectedResource[];
  selectedUserIds: number[];
  resourcesDisabled: boolean;
}): TaskCreateRequest | TaskUpdateRequest => {
  const orderedResources = sortSelectedResourcesByGroup(selectedResources);

  if (resourcesDisabled) {
    const quizPassScores = orderedResources
      .filter((item) => item.resourceType === 'QUIZ' && item.quizType === 'EXAM' && item.taskQuizId)
      .map((item) => ({
        task_quiz_id: item.taskQuizId!,
        pass_score: Number(item.passScore),
      }));

    return {
      title,
      description: description || undefined,
      deadline: deadline.toISOString(),
      ...(quizPassScores.length > 0 ? { quiz_pass_scores: quizPassScores } : {}),
      assignee_ids: selectedUserIds,
    };
  }

  return {
    title,
    description: description || undefined,
    deadline: deadline.toISOString(),
    knowledge_ids: orderedResources
      .filter((item) => item.resourceType === 'DOCUMENT' && item.id > 0)
      .map((item) => item.id),
    quizzes: orderedResources
      .filter((item) => item.resourceType === 'QUIZ' && item.id > 0)
      .map((item) => {
        const isExam = item.quizType === 'EXAM';
        return {
          id: item.id,
          allow_retry: !isExam,
          duration: isExam ? Number(item.duration) : null,
          pass_score: isExam ? Number(item.passScore) : null,
        };
      }),
    assignee_ids: selectedUserIds,
  };
};
