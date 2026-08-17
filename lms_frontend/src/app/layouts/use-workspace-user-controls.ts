import * as React from 'react';
import { toast } from 'sonner';

import { LEARNING_WORKSPACE_LABEL, ROLE_FULL_LABELS } from '@/config/role-constants';
import { useUpdateMyAvatar } from '@/entities/user/api/manage-users';
import { useAuth } from '@/session/auth/auth-context';
import { useSetWorkbench, useWorkbench } from '@/session/hooks/use-workbench';
import { showApiError } from '@/utils/error-handler';
import type { Workbench } from '@/types/common';

export const useWorkspaceUserControls = () => {
  const { user, canAccessManage, managementRole, refreshUser } = useAuth();
  const workbench = useWorkbench();
  const setWorkbench = useSetWorkbench();
  const updateMyAvatar = useUpdateMyAvatar();

  const handleWorkbenchChange = React.useCallback((nextWorkbench: Workbench) => {
    if (nextWorkbench === workbench) {
      return;
    }
    if (nextWorkbench === 'manage' && !canAccessManage) {
      return;
    }
    setWorkbench(nextWorkbench);
  }, [canAccessManage, setWorkbench, workbench]);

  const handleMyAvatarSelect = React.useCallback(async (avatarKey: string) => {
    try {
      await updateMyAvatar.mutateAsync({ avatar_key: avatarKey });
      await refreshUser();
      toast.success('头像已更新');
    } catch (error) {
      showApiError(error, '头像更新失败');
    }
  }, [refreshUser, updateMyAvatar]);

  const manageWorkbenchLabel = user?.is_superuser
    ? '超管'
    : (managementRole ? ROLE_FULL_LABELS[managementRole] : '管理员');
  const workbenchLabel = workbench === 'manage'
    ? manageWorkbenchLabel
    : LEARNING_WORKSPACE_LABEL;
  const userLabel = user?.username || '';
  const userInitials = React.useMemo(() => {
    const source = (user?.username || workbenchLabel || 'L').trim();
    return source.slice(0, 2).toUpperCase();
  }, [user?.username, workbenchLabel]);

  const workbenchOptions: Array<{ label: string; value: Workbench }> = [
    { label: LEARNING_WORKSPACE_LABEL, value: 'learn' },
    ...(canAccessManage ? [{ label: manageWorkbenchLabel, value: 'manage' as const }] : []),
  ];

  return {
    workbench,
    handleMyAvatarSelect,
    handleWorkbenchChange,
    isUpdatingAvatar: updateMyAvatar.isPending,
    workbenchLabel,
    workbenchOptions,
    user,
    userInitials,
    userLabel,
  };
};
