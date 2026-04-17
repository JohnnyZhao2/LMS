import type { QuizDetail } from '@/types/quiz';
import type { TaskCreateRequest } from '@/features/tasks/api/create-task';
import type { TaskDetail } from '@/types/task';

import type { ResourceType, SelectedResource } from './task-form.types';

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
  quizDetail,
  paramQuizId,
}: {
  isEdit: boolean;
  task?: TaskDetail;
  quizDetail?: QuizDetail;
  paramQuizId?: number;
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

    const quizResources: SelectedResource[] = (task.quizzes || []).map((item, idx) => {
      const sourceId = item.quiz ?? -item.quiz_revision_id;
      return {
        uid: buildStableUid(`QUIZ:${sourceId}:${idx}`, item.quiz_revision_id + idx + 1000),
        id: sourceId,
        title: item.source_title || item.quiz_title || `试卷 ${item.quiz_revision_id}`,
        resourceType: 'QUIZ',
        category: `${item.question_count || 0} 个题目`,
        quizType: item.quiz_type,
        isMissingSource: item.quiz == null,
      };
    });

    return [...knowledgeResources, ...quizResources];
  }

  if (!isEdit && quizDetail && paramQuizId) {
    return [{
      uid: buildStableUid(`QUIZ:${quizDetail.id}:prefill`, quizDetail.id),
      id: quizDetail.id,
      title: quizDetail.title,
      resourceType: 'QUIZ',
      category: `${quizDetail.question_count || 0} 个题目`,
      quizType: quizDetail.quiz_type,
    }];
  }

  return [];
};

export const hasMissingTaskResourceSources = (resources: SelectedResource[]) =>
  resources.some((item) => item.isMissingSource);

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
}): TaskCreateRequest => ({
  title,
  description: description || undefined,
  deadline: deadline.toISOString(),
  ...(resourcesDisabled ? {} : {
    knowledge_ids: selectedResources
      .filter((item) => item.resourceType === 'DOCUMENT' && item.id > 0)
      .map((item) => item.id),
    quiz_ids: selectedResources
      .filter((item) => item.resourceType === 'QUIZ' && item.id > 0)
      .map((item) => item.id),
  }),
  assignee_ids: selectedUserIds,
});

export const buildResourceKey = (resourceType: ResourceType, id: number) => `${resourceType}:${id}`;
