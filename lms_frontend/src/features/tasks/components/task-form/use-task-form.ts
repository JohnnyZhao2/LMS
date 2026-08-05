import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import type { DragEndEvent } from '@dnd-kit/core';

import { useRoleNavigate } from '@/session/hooks/use-role-navigate';
import { showApiError } from '@/utils/error-handler';
import { useQuizDetail } from '@/entities/quiz/api/get-quizzes';
import { useTaskDetail } from '@/entities/task/api/get-task-detail';

import { useCreateTask, type TaskCreateRequest } from '../../api/create-task';
import { useAssignableUsers } from '@/entities/user/api/get-assignable-users';
import { useUpdateTask } from '../../api/update-task';
import type { ResourceItem, SelectedResource } from './task-form.types';
import {
  buildStableUid,
  buildTaskFormInitialSelectedResources,
  buildTaskSubmitPayload,
  hasMissingTaskResourceSources,
  insertSelectedResourceByGroup,
  reorderSelectedResourcesWithinGroup,
} from './use-task-form.helpers';

const DEFAULT_DEADLINE_DAYS = 7;

type Updater<T> = T | ((prev: T) => T);

const applyUpdater = <T,>(updater: Updater<T>, current: T): T => {
  if (typeof updater === 'function') {
    return (updater as (prev: T) => T)(current);
  }
  return updater;
};

/** 将绝对截止时间换算为距今天数（至少 1 天） */
const toDeadlineDays = (deadline: string | Date): number => {
  const days = Math.ceil(dayjs(deadline).diff(dayjs(), 'day', true));
  return Math.max(1, days);
};

export const useTaskForm = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { roleNavigate } = useRoleNavigate();

  const isEdit = !!id;
  const taskId = isEdit ? Number(id) : 0;
  const paramQuizId = Number(searchParams.get('quiz_id'));

  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState<string | null>(null);
  const [deadlineDaysDraft, setDeadlineDaysDraft] = useState<number | null>(null);
  const [selectedResourcesDraft, setSelectedResourcesDraft] = useState<SelectedResource[] | null>(null);
  const [selectedUserIdsDraft, setSelectedUserIdsDraft] = useState<number[] | null>(null);
  const [userSearch, setUserSearch] = useState('');

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { data: task, isLoading: taskLoading, isError: taskError } = useTaskDetail(taskId, {
    enabled: isEdit && Number.isFinite(taskId) && taskId > 0,
  });
  const { data: quizDetail } = useQuizDetail(paramQuizId);
  const { data: users, isLoading: isUsersLoading } = useAssignableUsers();

  const hasProgress = task?.has_progress || false;
  const resourcesDisabled = isEdit && hasProgress;
  const canRemoveAssignee = !(isEdit && hasProgress);

  const initialTitle = isEdit && task ? task.title : '';
  const initialDescription = isEdit && task ? (task.description || '') : '';
  const initialDeadlineDays = isEdit && task?.deadline
    ? toDeadlineDays(task.deadline)
    : DEFAULT_DEADLINE_DAYS;

  const initialSelectedResources = useMemo<SelectedResource[]>(() => {
    return buildTaskFormInitialSelectedResources({
      isEdit,
      task,
      quizDetail,
      paramQuizId,
    });
  }, [isEdit, task, quizDetail, paramQuizId]);

  const initialSelectedUserIds = useMemo<number[]>(
    () => (isEdit && task ? (task.assignments?.map((item) => item.assignee) || []) : []),
    [isEdit, task],
  );
  const originalAssigneeIds = initialSelectedUserIds;

  const title = titleDraft ?? initialTitle;
  const description = descriptionDraft ?? initialDescription;
  const deadlineDays = deadlineDaysDraft ?? initialDeadlineDays;
  const selectedResources = selectedResourcesDraft ?? initialSelectedResources;
  const selectedUserIds = selectedUserIdsDraft ?? initialSelectedUserIds;

  const setTitle = (nextTitle: string) => setTitleDraft(nextTitle);
  const setDescription = (nextDescription: string) => setDescriptionDraft(nextDescription);
  const setDeadlineDays = (nextDeadlineDays: number) => setDeadlineDaysDraft(nextDeadlineDays);
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
      return insertSelectedResourceByGroup(prev, {
        ...resource,
        uid: buildStableUid(`${resource.resourceType}:${resource.id}:${prev.length}`, resource.id + prev.length),
      });
    });
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
    if (!Number.isFinite(deadlineDays) || deadlineDays < 1) {
      toast.error('请填写有效的截止天数');
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
      const payload: TaskCreateRequest = buildTaskSubmitPayload({
        title,
        description,
        deadline: dayjs().add(deadlineDays, 'day').endOf('day').toDate(),
        selectedResources,
        selectedUserIds,
        resourcesDisabled,
      });

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

  const isSubmitting = createTask.isPending || updateTask.isPending;
  const canSubmit = Boolean(
    title.trim()
    && deadlineDays >= 1
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
    deadlineDays,
    setDeadlineDays,
    selectedResources,
    selectedUserIds,
    userSearch,
    setUserSearch,
    excludedDocumentIds,
    excludedQuizIds,
    filteredUsers,
    isUsersLoading,
    isLoading: taskLoading,
    isSubmitting,
    canSubmit,
    resourcesDisabled,
    canRemoveAssignee,
    addResource,
    removeResource,
    toggleUser,
    toggleUsers,
    clearUsers,
    handleDragEnd,
    handleSubmit,
    roleNavigate,
  };
};
