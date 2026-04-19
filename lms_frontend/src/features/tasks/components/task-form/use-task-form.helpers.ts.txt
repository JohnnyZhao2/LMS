import type { QuizDetail } from '@/types/quiz';
import type { TaskCreateRequest } from '@/features/tasks/api/create-task';
import type { TaskDetail } from '@/types/task';

import type { ResourceGroup, ResourceType, SelectedResource } from './task-form.types';

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

    const practiceResources: SelectedResource[] = (task.quizzes || [])
      .filter((item) => item.quiz_type !== 'EXAM')
      .map((item, idx) => {
        const sourceId = item.quiz ?? -item.quiz_revision_id;
        return {
          uid: buildStableUid(`QUIZ:${sourceId}:${idx}:practice`, item.quiz_revision_id + idx + 1000),
          id: sourceId,
          title: item.source_title || item.quiz_title || `试卷 ${item.quiz_revision_id}`,
          resourceType: 'QUIZ',
          category: `${item.question_count || 0} 个题目`,
          quizType: item.quiz_type,
          isMissingSource: item.quiz == null,
        };
      });

    const examResources: SelectedResource[] = (task.quizzes || [])
      .filter((item) => item.quiz_type === 'EXAM')
      .map((item, idx) => {
        const sourceId = item.quiz ?? -item.quiz_revision_id;
        return {
          uid: buildStableUid(`QUIZ:${sourceId}:${idx}:exam`, item.quiz_revision_id + idx + 2000),
          id: sourceId,
          title: item.source_title || item.quiz_title || `试卷 ${item.quiz_revision_id}`,
          resourceType: 'QUIZ',
          category: `${item.question_count || 0} 个题目`,
          quizType: item.quiz_type,
          isMissingSource: item.quiz == null,
        };
      });

    return [...knowledgeResources, ...practiceResources, ...examResources];
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

export const TASK_RESOURCE_GROUP_ORDER: ResourceGroup[] = ['DOCUMENT', 'PRACTICE', 'EXAM'];

export const getTaskResourceGroup = (resource: Pick<SelectedResource, 'resourceType' | 'quizType'>): ResourceGroup => {
  if (resource.resourceType === 'DOCUMENT') {
    return 'DOCUMENT';
  }
  return resource.quizType === 'EXAM' ? 'EXAM' : 'PRACTICE';
};

export const isTaskResourceCompatibleWithGroup = (
  resource: Pick<SelectedResource, 'resourceType' | 'quizType'>,
  group: ResourceGroup,
) => getTaskResourceGroup(resource) === group;

export const insertSelectedResourceByGroup = (resources: SelectedResource[], resource: SelectedResource): SelectedResource[] => {
  const targetGroup = getTaskResourceGroup(resource);

  for (let index = resources.length - 1; index >= 0; index -= 1) {
    if (getTaskResourceGroup(resources[index]) === targetGroup) {
      return [
        ...resources.slice(0, index + 1),
        resource,
        ...resources.slice(index + 1),
      ];
    }
  }

  const targetGroupOrder = TASK_RESOURCE_GROUP_ORDER.indexOf(targetGroup);
  const insertIndex = resources.findIndex((item) => TASK_RESOURCE_GROUP_ORDER.indexOf(getTaskResourceGroup(item)) > targetGroupOrder);

  if (insertIndex === -1) {
    return [...resources, resource];
  }

  return [
    ...resources.slice(0, insertIndex),
    resource,
    ...resources.slice(insertIndex),
  ];
};

export const sortSelectedResourcesByGroup = (resources: SelectedResource[]): SelectedResource[] => {
  return [...resources].sort((left, right) => {
    const leftOrder = TASK_RESOURCE_GROUP_ORDER.indexOf(getTaskResourceGroup(left));
    const rightOrder = TASK_RESOURCE_GROUP_ORDER.indexOf(getTaskResourceGroup(right));
    return leftOrder - rightOrder;
  });
};

export const moveSelectedResourceWithinGroup = (
  resources: SelectedResource[],
  uid: number,
  direction: 'up' | 'down',
): SelectedResource[] => {
  const currentIndex = resources.findIndex((item) => item.uid === uid);
  if (currentIndex === -1) {
    return resources;
  }

  const currentItem = resources[currentIndex];
  const currentGroup = getTaskResourceGroup(currentItem);
  const groupIndexes = resources
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => getTaskResourceGroup(item) === currentGroup)
    .map(({ index }) => index);

  const groupPosition = groupIndexes.indexOf(currentIndex);
  if (groupPosition === -1) {
    return resources;
  }

  const targetPosition = direction === 'up' ? groupPosition - 1 : groupPosition + 1;
  if (targetPosition < 0 || targetPosition >= groupIndexes.length) {
    return resources;
  }

  const targetIndex = groupIndexes[targetPosition];
  const nextResources = [...resources];
  [nextResources[currentIndex], nextResources[targetIndex]] = [nextResources[targetIndex], nextResources[currentIndex]];
  return nextResources;
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
}): TaskCreateRequest => {
  const orderedResources = sortSelectedResourcesByGroup(selectedResources);

  return {
    title,
    description: description || undefined,
    deadline: deadline.toISOString(),
    ...(resourcesDisabled ? {} : {
      knowledge_ids: orderedResources
        .filter((item) => item.resourceType === 'DOCUMENT' && item.id > 0)
        .map((item) => item.id),
      quiz_ids: orderedResources
        .filter((item) => item.resourceType === 'QUIZ' && item.id > 0)
        .map((item) => item.id),
    }),
    assignee_ids: selectedUserIds,
  };
};

export const buildResourceKey = (resourceType: ResourceType, id: number) => `${resourceType}:${id}`;
