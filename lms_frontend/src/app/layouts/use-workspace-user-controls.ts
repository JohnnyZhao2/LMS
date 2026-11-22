import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { getFirstAccessibleRoutePath, getMenuItemsBySection } from '@/app/menu-builder';
import { BUSINESS_ROUTE_META, canAccessBusinessRoute } from '@/app/route-registry';
import {
  LEARNING_WORKSPACE_LABEL,
  MANAGE_WORKSPACE_LABEL,
} from '@/lib/role-config';
import { useUpdateMyAvatar } from '@/api/users/manage-users';
import { useAuth } from '@/lib/auth';
import { useSetWorkbench, useWorkbench } from '@/hooks/use-workbench';
import { showApiError } from '@/utils/error-handler';
import type { Workbench } from '@/types/common';

const isPathnameAllowedInWorkbench = (
  pathname: string,
  targetWorkbench: Workbench,
  hasCapability: (code: string) => boolean,
  hasManageDashboard: boolean,
): boolean => {
  if (pathname === '/dashboard' || pathname === '/') {
    return targetWorkbench === 'learn' || hasManageDashboard;
  }
  const normalized = pathname.replace(/^\//, '');
  const matched = BUSINESS_ROUTE_META.find((route) => {
    const pattern = new RegExp(`^${route.path.replace(/:[^/]+/g, '[^/]+')}$`);
    return pattern.test(normalized);
  });
  return matched ? canAccessBusinessRoute(matched, targetWorkbench, hasCapability) : false;
};

export const useWorkspaceUserControls = () => {
  const { user, roles, canAccessManage, managementRole, hasCapability, refreshUser } = useAuth();
  const workbench = useWorkbench();
  const setWorkbench = useSetWorkbench();
  const updateMyAvatar = useUpdateMyAvatar();
  const navigate = useNavigate();
  const location = useLocation();
  const hasManageDashboard = hasCapability('tasks.view_task_analytics');

  const handleWorkbenchChange = React.useCallback((nextWorkbench: Workbench) => {
    if (nextWorkbench === workbench) {
      return;
    }
    if (nextWorkbench === 'manage' && !canAccessManage) {
      return;
    }
    setWorkbench(nextWorkbench);

    if (!isPathnameAllowedInWorkbench(location.pathname, nextWorkbench, hasCapability, hasManageDashboard)) {
      if (nextWorkbench === 'learn' || hasManageDashboard) {
        navigate('/dashboard', { replace: true });
      } else {
        const nextMenu = getMenuItemsBySection('manage', hasCapability, hasManageDashboard);
        const fallback = getFirstAccessibleRoutePath(nextMenu) ?? '/dashboard';
        navigate(fallback, { replace: true });
      }
    }
  }, [canAccessManage, hasCapability, hasManageDashboard, location.pathname, navigate, setWorkbench, workbench]);

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
    : roles.length === 1
      ? roles[0].name
      : MANAGE_WORKSPACE_LABEL;

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
    managementRole,
    user,
    userInitials,
    userLabel,
  };
};
