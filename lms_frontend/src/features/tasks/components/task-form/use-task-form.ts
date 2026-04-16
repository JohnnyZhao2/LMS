import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';

import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { showApiError } from '@/utils/error-handler';
import type { PaginatedResponse } from '@/types/common';
import type { TaskResourceOption } from '@/types/task';
import { useQuizDetail } from '@/features/quiz-center/quizzes/api/get-quizzes';

import { useCreateTask, type TaskCreateRequest } from '../../api/create-task';
import { useAssignableUsers } from '../../api/get-assignable-users';
import { useTaskDetail } from '../../api/get-task-detail';
import { useTaskResourceOptions } from '../../api/get-task-resources';
import { useUpdateTask } from '../../api/update-task';
import type { ResourceItem, SelectedResource, ResourceType } from './task-form.types';
import { mapTaskResourceOptionToResource } from './task-form.types';

const PAGE_SIZE = 8;

const getPaginatedResults = <T,>(data?: PaginatedResponse<T> | T[]): T[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.results;
};

type Updater<T> = T | ((prev: T) => T);

const applyUpdater = <T,>(updater: Updater<T>, current: T): T => {
  if (typeof updater === 'function') {
    return (updater as (prev: T) => T)(current);
  }
  return updater;
};

const buildStableUid = (seed: string, fallback: number): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 2147483647;
  }
  return hash || fallback;
};

const buildResourceKey = (resourceType: ResourceType, id: number) => `${resourceType}:${id}`;

export const useTaskForm = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { roleNavigate } = useRoleNavigate();

  const isEdit = !!id;
  const taskId = isEdit ? Number(id) : 0;
  const paramQuizId = Number(searchParams.get('quiz_id'));

  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState<string | null>(null);
  const [deadlineDraft, setDeadlineDraft] = useState<Date | undefined | null>(null);
  const [selectedResourcesDraft, setSelectedResourcesDraft] = useState<SelectedResource[] | null>(null);
  const [resourceSearch, setResourceSearch] = useState('');
  const [resourceType, setResourceType] = useState<'ALL' | ResourceType>('ALL');
  const [selectedUserIdsDraft, setSelectedUserIdsDraft] = useState<number[] | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { data: task, isLoading: taskLoading, isError: taskError } = useTaskDetail(taskId, {
    enabled: isEdit && Number.isFinite(taskId) && taskId > 0,
  });
  const { data: quizDetail } = useQuizDetail(paramQuizId);
  const resourceQuery = useTaskResourceOptions({
    search: resourceSearch,
    page: currentPage,
    page_size: PAGE_SIZE,
    resource_type: resourceType,
  });
  const { data: users, isLoading: isUsersLoading } = useAssignableUsers();

  const hasProgress = task?.has_progress || false;
  const resourcesDisabled = isEdit && hasProgress;
  const canRemoveAssignee = !(isEdit && hasProgress);

  const initialTitle = isEdit && task ? task.title : '';
  const initialDescription = isEdit && task ? (task.description || '') : '';
  const initialDeadline = isEdit && task?.deadline ? new Date(task.deadline) : undefined;

  const initialSelectedResources = useMemo<SelectedResource[]>(() => {
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
  }, [isEdit, task, quizDetail, paramQuizId]);

  const initialSelectedUserIds = useMemo<number[]>(
    () => (isEdit && task ? (task.assignments?.map((item) => item.assignee) || []) : []),
    [isEdit, task],
  );
  const originalAssigneeIds = initialSelectedUserIds;

  const title = titleDraft ?? initialTitle;
  const description = descriptionDraft ?? initialDescription;
  const deadline = deadlineDraft === null ? initialDeadline : deadlineDraft;
  const selectedResources = selectedResourcesDraft ?? initialSelectedResources;
  const selectedUserIds = selectedUserIdsDraft ?? initialSelectedUserIds;

  const setTitle = (nextTitle: string) => setTitleDraft(nextTitle);
  const setDescription = (nextDescription: string) => setDescriptionDraft(nextDescription);
  const setDeadline = (nextDeadline: Date | undefined) => setDeadlineDraft(nextDeadline);
  const setSelectedResources = (updater: Updater<SelectedResource[]>) => {
    setSelectedResourcesDraft((prev) => applyUpdater(updater, prev ?? initialSelectedResources));
  };
  const setSelectedUserIds = (updater: Updater<number[]>) => {
    setSelectedUserIdsDraft((prev) => applyUpdater(updater, prev ?? initialSelectedUserIds));
  };

  const filteredResources = useMemo(() => {
    const combined = getPaginatedResults<TaskResourceOption>(resourceQuery.data).map(mapTaskResourceOptionToResource);
    const selectedKeys = new Set(
      selectedResources
        .filter((item) => item.id > 0)
        .map((item) => buildResourceKey(item.resourceType, item.id)),
    );
    return combined.filter((item) => !selectedKeys.has(buildResourceKey(item.resourceType, item.id)));
  }, [resourceQuery.data, selectedResources]);

  const totalCount = resourceQuery.data?.count ?? filteredResources.length;
  const totalPages = resourceQuery.data?.total_pages ?? Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safeCurrentPage = resourceQuery.data?.current_page ?? Math.min(currentPage, totalPages);
  const availableResources = filteredResources;

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((user) => (
      user.username.toLowerCase().includes(userSearch.toLowerCase())
      || (user.employee_id && user.employee_id.toLowerCase().includes(userSearch.toLowerCase()))
    ));
  }, [users, userSearch]);

  const addResource = (resource: ResourceItem) => {
    if (resourcesDisabled) return;
    setSelectedResources((prev) => {
      if (prev.some((item) => item.resourceType === resource.resourceType && item.id === resource.id)) {
        return prev;
      }
      return [
        ...prev,
        {
          ...resource,
          uid: buildStableUid(`${resource.resourceType}:${resource.id}:${prev.length}`, resource.id + prev.length),
        },
      ];
    });
  };

  const moveResource = (idx: number, direction: 'up' | 'down') => {
    const next = [...selectedResources];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= next.length) return;
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    setSelectedResources(next);
  };

  const removeResource = (idx: number) => {
    if (resourcesDisabled) return;
    setSelectedResources(selectedResources.filter((_, index) => index !== idx));
  };

  const toggleUser = (userId: number) => {
    const isRemoving = selectedUserIds.includes(userId);
    const canRemove = canRemoveAssignee || !originalAssigneeIds.includes(userId);
    if (isRemoving && !canRemove) return;
    setSelectedUserIds((prev) => (
      prev.includes(userId) ? prev.filter((idValue) => idValue !== userId) : [...prev, userId]
    ));
  };

  const toggleUsers = (userIds: number[], checked: boolean) => {
    if (checked) {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...userIds])));
      return;
    }

    if (canRemoveAssignee) {
      setSelectedUserIds((prev) => prev.filter((idValue) => !userIds.includes(idValue)));
      return;
    }

    setSelectedUserIds((prev) => prev.filter((idValue) => !userIds.includes(idValue) || originalAssigneeIds.includes(idValue)));
  };

  const clearUsers = () => {
    setSelectedUserIds(canRemoveAssignee ? [] : originalAssigneeIds);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSelectedResources((currentItems) => {
        const oldIndex = currentItems.findIndex((item) => item.uid === active.id);
        const newIndex = currentItems.findIndex((item) => item.uid === over.id);
        return arrayMove(currentItems, oldIndex, newIndex);
      });
    }
  };

  const hasMissingSources = selectedResources.some((item) => item.isMissingSource);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('请输入任务标题');
      return;
    }
    if (!deadline) {
      toast.error('请选择截止时间');
      return;
    }
    if (selectedResources.length === 0 || selectedUserIds.length === 0) {
      toast.error('请选择资源和指派人员');
      return;
    }
    if (!resourcesDisabled && hasMissingSources) {
      toast.error('存在已删除的原始资源，请先移除或替换');
      return;
    }

    try {
      const payload: TaskCreateRequest = {
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
      };

      if (isEdit) {
        await updateTask.mutateAsync({ taskId, data: payload });
        toast.success('任务更新成功');
      } else {
        await createTask.mutateAsync(payload);
        toast.success('任务发布成功');
      }
      roleNavigate('tasks');
    } catch (error) {
      showApiError(error, '操作失败');
    }
  };

  const isLoading = resourceQuery.isLoading || taskLoading;
  const isSubmitting = createTask.isPending || updateTask.isPending;
  const canSubmit = Boolean(
    title.trim()
    && deadline
    && selectedResources.length > 0
    && selectedUserIds.length > 0
    && (resourcesDisabled || !hasMissingSources)
  );

  return {
    isEdit,
    task,
    taskError,
    title,
    setTitle,
    description,
    setDescription,
    deadline,
    setDeadline,
    selectedResources,
    resourceSearch,
    setResourceSearch,
    resourceType,
    setResourceType,
    selectedUserIds,
    userSearch,
    setUserSearch,
    currentPage,
    setCurrentPage,
    availableResources,
    totalResourceCount: totalCount,
    resourcePageSize: PAGE_SIZE,
    totalPages,
    safeCurrentPage,
    shouldPaginateResources: totalPages > 1,
    filteredUsers,
    isUsersLoading,
    isLoading,
    isSubmitting,
    canSubmit,
    resourcesDisabled,
    canRemoveAssignee,
    addResource,
    moveResource,
    removeResource,
    toggleUser,
    toggleUsers,
    clearUsers,
    handleDragEnd,
    handleSubmit,
    roleNavigate,
  };
};
