import { useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';

import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { showApiError } from '@/utils/error-handler';
import type { KnowledgeListItem, PaginatedResponse, QuizListItem } from '@/types/api';
import { useCreateTask, type TaskCreateRequest } from '../../api/create-task';
import { useAssignableUsers } from '../../api/get-assignable-users';
import { useTaskDetail } from '../../api/get-task-detail';
import { useTaskKnowledgeOptions, useTaskQuizOptions } from '../../api/get-task-resources';
import { useUpdateTask } from '../../api/update-task';
import { useQuizDetail } from '@/features/quiz-center/quizzes/api/get-quizzes';
import type { ResourceItem, SelectedResource, ResourceType } from './task-form.types';
import { mapKnowledgeToResource, mapQuizToResource } from './task-form.types';

const PAGE_SIZE = 7;

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

export const useTaskForm = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { roleNavigate } = useRoleNavigate();

  const isEdit = !!id;
  const taskId = isEdit ? Number(id) : 0;
  const paramQuizId = Number(searchParams.get('quiz_id'));

  // Form state
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState<string | null>(null);
  const [deadlineDraft, setDeadlineDraft] = useState<Date | undefined | null>(null);
  const [selectedResourcesDraft, setSelectedResourcesDraft] = useState<SelectedResource[] | null>(null);
  const [resourceSearch, setResourceSearch] = useState('');
  const [resourceType, setResourceType] = useState<'ALL' | ResourceType>('ALL');
  const [selectedUserIdsDraft, setSelectedUserIdsDraft] = useState<number[] | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userModalSearch, setUserModalSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // API hooks
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { data: task, isLoading: taskLoading, isError: taskError } = useTaskDetail(taskId, {
    enabled: isEdit && Number.isFinite(taskId) && taskId > 0,
  });
  const { data: quizDetail } = useQuizDetail(paramQuizId);
  const knowledgeQuery = useTaskKnowledgeOptions({
    search: resourceSearch,
    page: 1,
    page_size: 100,
    enabled: resourceType === 'ALL' || resourceType === 'DOCUMENT'
  });
  const quizQuery = useTaskQuizOptions({
    search: resourceSearch,
    page: 1,
    page_size: 100,
    enabled: resourceType === 'ALL' || resourceType === 'QUIZ'
  });
  const { data: users } = useAssignableUsers();

  // Disabled state logic
  const hasProgress = task?.has_progress || false;
  const resourcesDisabled = isEdit && hasProgress;
  const canRemoveAssignee = !(isEdit && hasProgress);

  const initialTitle = isEdit && task ? task.title : '';
  const initialDescription = isEdit && task ? (task.description || '') : '';
  const initialDeadline = isEdit && task?.deadline ? new Date(task.deadline) : undefined;
  const initialSelectedResources = useMemo<SelectedResource[]>(() => {
    if (isEdit && task) {
      const knowledgeResources: SelectedResource[] = (task.knowledge_items || []).map((item, idx) => ({
        uid: buildStableUid(`DOCUMENT:${item.resource_uuid}:${idx}`, item.knowledge + idx),
        id: item.knowledge,
        resource_uuid: item.resource_uuid,
        is_current: item.is_current,
        title: item.knowledge_title || `文档 ${item.knowledge}`,
        resourceType: 'DOCUMENT' as ResourceType,
        category: (item as { knowledge_type_display?: string }).knowledge_type_display || '文档',
      }));

      const quizResources: SelectedResource[] = (task.quizzes || []).map((item, idx) => ({
        uid: buildStableUid(`QUIZ:${item.resource_uuid}:${idx}`, item.quiz + idx + 1000),
        id: item.quiz,
        resource_uuid: item.resource_uuid,
        is_current: item.is_current,
        title: item.quiz_title || `试卷 ${item.quiz}`,
        resourceType: 'QUIZ' as ResourceType,
        category: `${(item as { question_count?: number }).question_count || 0} 个题目`,
      }));

      return [...knowledgeResources, ...quizResources];
    }

    if (!isEdit && quizDetail && paramQuizId) {
      return [{
        uid: buildStableUid(`QUIZ:${quizDetail.resource_uuid}:prefill`, quizDetail.id),
        id: quizDetail.id,
        resource_uuid: quizDetail.resource_uuid,
        is_current: quizDetail.is_current,
        title: quizDetail.title,
        resourceType: 'QUIZ',
        category: `${quizDetail.question_count || 0} 个题目`,
      }];
    }

    return [];
  }, [isEdit, task, quizDetail, paramQuizId]);
  const initialSelectedUserIds = useMemo<number[]>(
    () => (isEdit && task ? (task.assignments?.map((item) => item.assignee) || []) : []),
    [isEdit, task]
  );
  const originalAssigneeIds = initialSelectedUserIds;

  const title = titleDraft ?? initialTitle;
  const description = descriptionDraft ?? initialDescription;
  const deadline = deadlineDraft === null ? initialDeadline : deadlineDraft;
  const selectedResources = selectedResourcesDraft ?? initialSelectedResources;
  const selectedUserIds = selectedUserIdsDraft ?? initialSelectedUserIds;

  const setTitle = (nextTitle: string) => {
    setTitleDraft(nextTitle);
  };
  const setDescription = (nextDescription: string) => {
    setDescriptionDraft(nextDescription);
  };
  const setDeadline = (nextDeadline: Date | undefined) => {
    setDeadlineDraft(nextDeadline);
  };
  const setSelectedResources = (updater: Updater<SelectedResource[]>) => {
    setSelectedResourcesDraft((prev) => applyUpdater(updater, prev ?? initialSelectedResources));
  };
  const setSelectedUserIds = (updater: Updater<number[]>) => {
    setSelectedUserIdsDraft((prev) => applyUpdater(updater, prev ?? initialSelectedUserIds));
  };

  // Computed values for resources
  const filteredResources = useMemo(() => {
    const kItems = getPaginatedResults<KnowledgeListItem>(knowledgeQuery.data);
    const qItems = getPaginatedResults<QuizListItem>(quizQuery.data);

    const mappedK: ResourceItem[] = kItems.map(mapKnowledgeToResource);
    const mappedQ: ResourceItem[] = qItems.map(mapQuizToResource);

    const combined = resourceType === 'DOCUMENT'
      ? mappedK
      : resourceType === 'QUIZ'
        ? mappedQ
        : [...mappedK, ...mappedQ];

    const selectedUuids = selectedResources.map(s => `${s.resourceType}-${s.resource_uuid}`);
    return combined.filter(r => !selectedUuids.includes(`${r.resourceType}-${r.resource_uuid}`));
  }, [knowledgeQuery.data, quizQuery.data, resourceType, selectedResources]);

  const totalCount = filteredResources.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const availableResources = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredResources.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredResources, safeCurrentPage]);

  const modalFilteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u =>
      u.username.toLowerCase().includes(userModalSearch.toLowerCase()) ||
      (u.employee_id && u.employee_id.toLowerCase().includes(userModalSearch.toLowerCase()))
    );
  }, [users, userModalSearch]);

  const selectedUserDetails = useMemo(() => {
    if (!users) return [];
    return users.filter(u => selectedUserIds.includes(u.id));
  }, [users, selectedUserIds]);

  // Handlers
  const addResource = (res: ResourceItem) => {
    if (resourcesDisabled) return;
    setSelectedResources((prev) => [
      ...prev,
      {
        ...res,
        uid: buildStableUid(
          `${res.resourceType}:${res.resource_uuid}:${prev.length}`,
          res.id + prev.length
        ),
      },
    ]);
  };

  const moveResource = (idx: number, direction: 'up' | 'down') => {
    const newResources = [...selectedResources];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newResources.length) return;
    [newResources[idx], newResources[targetIdx]] = [newResources[targetIdx], newResources[idx]];
    setSelectedResources(newResources);
  };

  const removeResource = (idx: number) => {
    if (resourcesDisabled) return;
    setSelectedResources(selectedResources.filter((_, i) => i !== idx));
  };

  const upgradeResource = (idx: number) => {
    if (resourcesDisabled) return;
    const item = selectedResources[idx];
    if (!item) return;

    const kItems = getPaginatedResults<KnowledgeListItem>(knowledgeQuery.data);
    const qItems = getPaginatedResults<QuizListItem>(quizQuery.data);

    if (item.resourceType === 'DOCUMENT') {
      const latestResource = kItems.find((k) => k.resource_uuid === item.resource_uuid);
      if (!latestResource) {
        toast.error('未找到最新版本');
        return;
      }
      setSelectedResources(prev => prev.map((r, i) => {
        if (i !== idx) return r;
        return {
          ...r,
          id: latestResource.id,
          is_current: latestResource.is_current,
          title: latestResource.title,
          category: latestResource.line_tag?.name || '未分类',
        };
      }));
    } else {
      const latestResource = qItems.find((q) => q.resource_uuid === item.resource_uuid);
      if (!latestResource) {
        toast.error('未找到最新版本');
        return;
      }
      setSelectedResources(prev => prev.map((r, i) => {
        if (i !== idx) return r;
        return {
          ...r,
          id: latestResource.id,
          is_current: latestResource.is_current,
          title: latestResource.title,
          category: `${latestResource.question_count} 个题目`,
          quizType: latestResource.quiz_type,
        };
      }));
    }
    toast.success('已升级到最新版本');
  };

  const toggleUser = (userId: number) => {
    const isRemoving = selectedUserIds.includes(userId);
    const canRemove = canRemoveAssignee || !originalAssigneeIds.includes(userId);
    if (isRemoving && !canRemove) return;
    setSelectedUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const toggleAllUsers = (checked: boolean) => {
    if (checked) {
      const allIds = modalFilteredUsers.map(u => u.id);
      setSelectedUserIds(prev => Array.from(new Set([...prev, ...allIds])));
    } else {
      const currentIds = modalFilteredUsers.map(u => u.id);
      if (canRemoveAssignee) {
        setSelectedUserIds(prev => prev.filter(id => !currentIds.includes(id)));
      } else {
        setSelectedUserIds(prev => prev.filter(id => !currentIds.includes(id) || originalAssigneeIds.includes(id)));
      }
    }
  };

  const clearUsers = () => {
    setSelectedUserIds(canRemoveAssignee ? [] : originalAssigneeIds);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSelectedResources((items) => {
        const oldIndex = items.findIndex((item) => item.uid === active.id);
        const newIndex = items.findIndex((item) => item.uid === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

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
    try {
      const payload: TaskCreateRequest = {
        title,
        description: description || undefined,
        deadline: deadline.toISOString(),
        ...(resourcesDisabled ? {} : {
          knowledge_ids: selectedResources.filter(s => s.resourceType === 'DOCUMENT').map(s => s.id),
          quiz_ids: selectedResources.filter(s => s.resourceType === 'QUIZ').map(s => s.id),
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

  // Computed values
  const isLoading = knowledgeQuery.isLoading || quizQuery.isLoading || taskLoading;
  const isSubmitting = createTask.isPending || updateTask.isPending;
  const canSubmit = title.trim() && deadline && selectedResources.length > 0 && selectedUserIds.length > 0;

  return {
    // State
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
    isUserModalOpen,
    setIsUserModalOpen,
    userModalSearch,
    setUserModalSearch,
    currentPage,
    setCurrentPage,

    // Computed
    availableResources,
    totalPages,
    safeCurrentPage,
    modalFilteredUsers,
    selectedUserDetails,
    isLoading,
    isSubmitting,
    canSubmit,
    resourcesDisabled,
    canRemoveAssignee,

    // Handlers
    addResource,
    moveResource,
    removeResource,
    upgradeResource,
    toggleUser,
    toggleAllUsers,
    clearUsers,
    handleDragEnd,
    handleSubmit,
    roleNavigate,
  };
};
