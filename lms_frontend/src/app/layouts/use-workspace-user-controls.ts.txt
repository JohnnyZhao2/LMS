import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useUpdateMyAvatar } from '@/entities/user/api/manage-users';
import { useAuth } from '@/session/auth/auth-context';
import { useCurrentRole } from '@/session/hooks/use-current-role';
import { getWorkspacePath, stripWorkspacePathPrefix } from '@/session/workspace/role-paths';
import { ROLE_FULL_LABELS, ROLE_ORDER } from '@/config/role-constants';
import type { RoleCode } from '@/types/common';
import { showApiError } from '@/utils/error-handler';

export const useWorkspaceUserControls = () => {
  const { user, availableRoles, switchRole, refreshUser } = useAuth();
  const currentRole = useCurrentRole();
  const updateMyAvatar = useUpdateMyAvatar();
  const navigate = useNavigate();
  const location = useLocation();

  const handleRoleChange = React.useCallback(async (roleCode: RoleCode) => {
    if (roleCode === currentRole) {
      return;
    }

    try {
      await switchRole(roleCode);
      const currentPath = stripWorkspacePathPrefix(location.pathname);
      const suffix = `${location.search}${location.hash}`;
      navigate(`${getWorkspacePath(roleCode, currentPath) ?? '/'}${suffix}`);
    } catch (error) {
      showApiError(error, '角色切换失败');
    }
  }, [
    currentRole,
    location.hash,
    location.pathname,
    location.search,
    navigate,
    switchRole,
  ]);

  const handleMyAvatarSelect = React.useCallback(async (avatarKey: string) => {
    try {
      await updateMyAvatar.mutateAsync({ avatar_key: avatarKey });
      await refreshUser();
      toast.success('头像已更新');
    } catch (error) {
      showApiError(error, '头像更新失败');
    }
  }, [refreshUser, updateMyAvatar]);

  const roleLabel = currentRole ? (ROLE_FULL_LABELS[currentRole] ?? '未知角色') : '未登录';
  const userLabel = user?.username || '';
  const userInitials = React.useMemo(() => {
    const source = (user?.username || roleLabel || 'L').trim();
    return source.slice(0, 2).toUpperCase();
  }, [roleLabel, user?.username]);

  const roleOptions = React.useMemo(() => (
    [...availableRoles]
      .sort((a, b) => ROLE_ORDER.indexOf(a.code) - ROLE_ORDER.indexOf(b.code))
      .map((role) => ({
        label: ROLE_FULL_LABELS[role.code] ?? role.name,
        value: role.code,
      }))
  ), [availableRoles]);

  return {
    currentRole,
    handleMyAvatarSelect,
    handleRoleChange,
    isUpdatingAvatar: updateMyAvatar.isPending,
    roleLabel,
    roleOptions,
    user,
    userInitials,
    userLabel,
  };
};
