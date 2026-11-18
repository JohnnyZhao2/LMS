import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import type { DragEndEvent } from '@dnd-kit/core';

import { ROUTES } from '@/config/routes';
import { showApiError } from '@/utils/error-handler';
import { useTaskDetail } from '@/features/tasks/api/get-task-detail';

import { useCreateTask, type TaskCreateRequest } from '../../api/create-task';
import { useAssignableUsers } from '@/api/users/get-assignable-users';
import { useTaskResourceOptions } from '../../api/get-task-resources';
import { useUpdateTask, type TaskUpdateRequest } from '../../api/update-task';
import { formatScore } from '@/lib/score';
import type { ResourceFilterType, ResourceItem, SelectedResource } from './task-form.types';
import { mapTaskResourceOptionToResource } from './task-form.types';
import {
  buildStableUid,
  buildTaskFormInitialSelectedResources,
  buildTaskSubmitPayload,
  getExamResourcesValidationError,
  hasMissingTaskResourceSources,
  reorderSelectedResourcesWithinGroup,
  sortSelectedResourcesByGroup,
} from './use-task-form.helpers';

const PAGE_SIZE = 9;
const DEFAULT_DEADLINE_DAYS = '7';
const MS_PER_DAY = 86_400_000;

const parsePositiveDays = (value: string): number | null => {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const buildDeadlineFromDays = (days: number): Date => {
  const target = new Date();
  target.setDate(target.getDate() + days);
  target.setHours(23, 59, 59, 0);
  return target;
};

const computeRemainingDays = (deadlineDate: Date): string => {
  const diffDays = Math.ceil((deadlineDate.getTime() - Date.now()) / MS_PER_DAY);
  return String(Math.max(1, diffDays));
};

type Updater<T> = T | ((prev: T) => T);

const applyUpdater = <T,>(updater: Updater<T>, current: T): T => {
  if (typeof updater === 'function') {
    return (updater as (prev: T) => T)(current);
  }
  return updater;
};

export const useTaskForm = (options?: { initialResources?: SelectedResource[] }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const initialResources = options?.initialResources;

  const isEdit = !!id;
  const taskId = isEdit ? Number(id) : 0;

  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState<string | null>(null);
  const [deadlineDaysDraft, setDeadlineDaysDraft] = useState<string | null>(null);
  const [selectedResourcesDraft, setSelectedResourcesDraft] = useState<SelectedResource[] | null>(null);
  const [resourceSearch, setResourceSearch] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<ResourceFilterType>('ALL');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedUserIdsDraft, setSelectedUserIdsDraft] = useState<number[] | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pendingInsertIndexRef = useRef<number | null>(null);

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { data: task, isLoading: taskLoading, isError: taskError } = useTaskDetail(taskId, {
    enabled: isEdit && Number.isFinite(taskId) && taskId > 0,
  });
  const { data: users, isLoading: isUsersLoading } = useAssignableUsers();

  const hasProgress = task?.has_progress || false;
  const resourcesDisabled = isEdit;
  const canRemoveAssignee = !(isEdit && hasProgress);

  const initialTitle = isEdit && task ? task.title : '';
  const initialDescription = isEdit && task ? (task.description || '') : '';
  const initialDeadline = useMemo(
    () => (isEdit && task?.deadline ? new Date(task.deadline) : undefined),
    [isEdit, task],
  );
  const initialDeadlineDays = initialDeadline ? computeRemainingDays(initialDeadline) : DEFAULT_DEADLINE_DAYS;

  const initialSelectedResources = useMemo<SelectedResource[]>(() => {
    return buildTaskFormInitialSelectedResources({
      isEdit,
      task,
      initialResources,
    });
  }, [isEdit, initialResources, task]);

  const initialSelectedUserIds = useMemo<number[]>(
    () => (isEdit && task ? (task.assignments?.map((item) => item.assignee) || []) : []),
    [isEdit, task],
  );
  const originalAssigneeIds = initialSelectedUserIds;

  const title = titleDraft ?? initialTitle;
  const description = descriptionDraft ?? initialDescription;
  const deadlineDays = deadlineDaysDraft ?? initialDeadlineDays;
  const parsedDeadlineDays = parsePositiveDays(deadlineDays);
  const deadline = useMemo(() => {
    if (deadlineDaysDraft === null && isEdit && initialDeadline) {
      return initialDeadline;
    }
    return parsedDeadlineDays ? buildDeadlineFromDays(parsedDeadlineDays) : undefined;
  }, [deadlineDaysDraft, initialDeadline, isEdit, parsedDeadlineDays]);
  const selectedResources = selectedResourcesDraft ?? initialSelectedResources;
  const selectedUserIds = selectedUserIdsDraft ?? initialSelectedUserIds;

  const setTitle = (nextTitle: string) => setTitleDraft(nextTitle);
  const setDescription = (nextDescription: string) => setDescriptionDraft(nextDescription);
  const setDeadlineDays = (nextValue: string) => {
    setDeadlineDaysDraft(nextValue.replace(/[^\d]/g, ''));
  };
  const setSelectedResources = (updater: Updater<SelectedResource[]>) => {
    setSelectedResourcesDraft((prev) => applyUpdater(updater, prev ?? initialSelectedResources));
  };
  const setSelectedUserIds = (updater: Updater<number[]>) => {
    setSelectedUserIdsDraft((prev) => applyUpdater(updater, prev ?? initialSelectedUserIds));
  };

  const excludedDocumentIds = useMemo(() => {
    return Array.from(new Set(
      selectedResources
        .filter((item) => item.resourceType === 'DOCUMENT' && item.id > 0)
        .map((item) => item.id),
    )).sort((left, right) => left - right);
  }, [selectedResources]);

  const excludedQuizIds = useMemo(() => {
    return Array.from(new Set(
      selectedResources
        .filter((item) => item.resourceType === 'QUIZ' && item.id > 0)
        .map((item) => item.id),
    )).sort((left, right) => left - right);
  }, [selectedResources]);

  const resourceQuery = useTaskResourceOptions({
    search: resourceSearch,
    page: currentPage,
    page_size: PAGE_SIZE,
    resource_type: resourceTypeFilter,
    exclude_document_ids: excludedDocumentIds,
    exclude_quiz_ids: excludedQuizIds,
    enabled: isPickerOpen,
  });

  const availableResources = useMemo(
    () => (resourceQuery.data?.results ?? []).map(mapTaskResourceOptionToResource),
    [resourceQuery.data],
  );

  const totalCount = resourceQuery.data?.count ?? availableResources.length;
  const totalPages = resourceQuery.data?.total_pages ?? Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safeCurrentPage = resourceQuery.data?.current_page ?? Math.min(currentPage, totalPages);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((user) => (
      user.username.toLowerCase().includes(userSearch.toLowerCase())
      || (user.employee_id && user.employee_id.toLowerCase().includes(userSearch.toLowerCase()))
    ));
  }, [users, userSearch]);

  const openPicker = (initialType: ResourceFilterType = 'ALL', insertIndex?: number) => {
    if (resourcesDisabled) return;
    pendingInsertIndexRef.current = insertIndex ?? null;
    setResourceSearch('');
    setResourceTypeFilter(initialType);
    setCurrentPage(1);
    setIsPickerOpen(true);
  };

  const closePicker = () => {
    pendingInsertIndexRef.current = null;
    setIsPickerOpen(false);
  };

  const addResource = (resource: ResourceItem) => {
    if (resourcesDisabled) return;
    const quizType = resource.resourceType === 'QUIZ' ? 'PRACTICE' : undefined;
    const insertAt = pendingInsertIndexRef.current;
    const alreadyExists = selectedResources.some(
      (item) => item.resourceType === resource.resourceType && item.id === resource.id,
    );
    if (alreadyExists) {
      return;
    }
    if (insertAt !== null) {
      pendingInsertIndexRef.current = insertAt + 1;
    }
    setSelectedResources((prev) => {
      if (prev.some((item) => item.resourceType === resource.resourceType && item.id === resource.id)) {
        return prev;
      }
      const nextItem: SelectedResource = {
        ...resource,
        quizType,
        uid: buildStableUid(`${resource.resourceType}:${resource.id}:${prev.length}`, resource.id + prev.length),
      };
      const nextList = [...prev];
      const clampedIndex = insertAt === null ? nextList.length : Math.max(0, Math.min(insertAt, nextList.length));
      nextList.splice(clampedIndex, 0, nextItem);
      return sortSelectedResourcesByGroup(nextList);
    });
  };

  const toggleQuizType = (uid: number, nextQuizType: 'PRACTICE' | 'EXAM') => {
    if (resourcesDisabled) return;
    setSelectedResources((prev) => sortSelectedResourcesByGroup(prev.map((item) => {
      if (item.uid !== uid || item.resourceType !== 'QUIZ') {
        return item;
      }
      if (nextQuizType === 'PRACTICE') {
        return {
          ...item,
          quizType: 'PRACTICE',
        };
      }
      const defaultPassScore =
        item.totalScore && item.totalScore > 0
          ? formatScore(Math.round(item.totalScore * 0.6 * 10) / 10)
          : '';
      return {
        ...item,
        quizType: 'EXAM',
        duration: item.duration || '60',
        passScore: item.passScore || defaultPassScore,
      };
    })));
  };

  const updateResourceExamConfig = (
    uid: number,
    patch: { duration?: string; passScore?: string },
  ) => {
    setSelectedResources((prev) => prev.map((item) => (
      item.uid === uid && item.quizType === 'EXAM'
        ? {
          ...item,
          ...(patch.duration !== undefined && !isEdit ? { duration: patch.duration } : {}),
          ...(patch.passScore !== undefined ? { passScore: patch.passScore } : {}),
        }
        : item
    )));
  };

  const removeResource = (uid: number) => {
    if (resourcesDisabled) return;
    setSelectedResources((prev) => prev.filter((item) => item.uid !== uid));
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
    if (resourcesDisabled) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSelectedResources((currentItems) => {
        return reorderSelectedResourcesWithinGroup(currentItems, String(active.id), String(over.id));
      });
    }
  };

  const hasMissingSources = hasMissingTaskResourceSources(selectedResources);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('请输入任务标题');
      return;
    }
    if (!deadline) {
      toast.error('请输入有效的截止天数');
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
    const examConfigError = getExamResourcesValidationError(selectedResources, { isEdit });
    if (examConfigError) {
      toast.error(examConfigError);
      return;
    }

    try {
      const payload = buildTaskSubmitPayload({
        title,
        description,
        deadline,
        selectedResources,
        selectedUserIds,
        resourcesDisabled,
      });

      if (isEdit) {
        await updateTask.mutateAsync({ taskId, data: payload as TaskUpdateRequest });
        toast.success('任务更新成功');
      } else {
        await createTask.mutateAsync(payload as TaskCreateRequest);
        toast.success('任务发布成功');
      }
      navigate(ROUTES.TASKS);
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
    deadlineDays,
    setDeadlineDays,
    selectedResources,
    resourceSearch,
    setResourceSearch,
    resourceTypeFilter,
    setResourceTypeFilter,
    isPickerOpen,
    openPicker,
    closePicker,
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
    toggleQuizType,
    updateResourceExamConfig,
    removeResource,
    toggleUser,
    toggleUsers,
    clearUsers,
    handleDragEnd,
    handleSubmit,
    navigate,
  };
};
