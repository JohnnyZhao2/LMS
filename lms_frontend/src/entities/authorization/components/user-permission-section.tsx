import { useMemo, useState } from 'react';
import { KeyRound } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';
import { AUTH_ROLES } from '@/config/role-constants';
import {
  useGrantUserPermission,
  usePermissionCatalog,
  useRevokeUserPermission,
  useUserPermissions,
} from '@/entities/authorization/api/authorization';
import {
  USER_PERMISSION_VIEW_PERMISSION,
  USER_PERMISSION_UPDATE_PERMISSION,
} from '@/entities/authorization/constants/access';
import { buildPermissionModuleSections } from '@/entities/authorization/utils/permission-sections';
import { useAuth } from '@/session/auth/auth-context';
import type { RoleCode } from '@/types/common';
import { showApiError } from '@/utils/error-handler';

import { PermissionModuleSections } from './permission-module-sections';
import { PermissionToggleCard } from './permission-toggle-card';

interface UserPermissionSectionProps {
  userId?: number;
  selectedRoleCodes: RoleCode[];
  isSuperuserAccount: boolean;
}

export function UserPermissionSection({
  userId,
  selectedRoleCodes,
  isSuperuserAccount,
}: UserPermissionSectionProps) {
  const { hasCapability, refreshUser, user } = useAuth();
  const [savingPermissionCode, setSavingPermissionCode] = useState<string | null>(null);
  const canView = hasCapability(USER_PERMISSION_VIEW_PERMISSION);
  const canManage = hasCapability(USER_PERMISSION_UPDATE_PERMISSION);
  const hasManagementRole = !isSuperuserAccount
    && selectedRoleCodes.some((roleCode) => AUTH_ROLES.includes(roleCode));
  const shouldLoad = Boolean(userId) && canView && hasManagementRole;

  const { data: permissionCatalog = [] } = usePermissionCatalog({}, canView);
  const { data: userPermissions } = useUserPermissions(userId ?? null, shouldLoad);
  const grantPermission = useGrantUserPermission();
  const revokePermission = useRevokeUserPermission();
  const checkedPermissionCodes = useMemo(
    () => new Set(userPermissions?.permission_codes ?? []),
    [userPermissions],
  );
  const moduleSections = useMemo(
    () => buildPermissionModuleSections(permissionCatalog),
    [permissionCatalog],
  );

  if (!canView) {
    return null;
  }

  if (!hasManagementRole) {
    return (
      <div className="flex h-full min-h-full items-center justify-center">
        <EmptyState
          icon={KeyRound}
          title={isSuperuserAccount ? '超级管理员无需配置权限' : '当前仅学员角色'}
          description={isSuperuserAccount ? '系统权限自动生效。' : '请先分配管理角色。'}
          className="py-0"
        />
      </div>
    );
  }

  const handleToggle = async (permissionCode: string, nextChecked: boolean) => {
    if (!userId || !canManage || savingPermissionCode) {
      return;
    }
    setSavingPermissionCode(permissionCode);
    try {
      const payload = { userId, permissionCode };
      if (nextChecked) {
        await grantPermission.mutateAsync(payload);
      } else {
        await revokePermission.mutateAsync(payload);
      }
      if (user?.id === userId) {
        await refreshUser();
      }
    } catch (error) {
      showApiError(error);
    } finally {
      setSavingPermissionCode(null);
    }
  };

  return (
    <div className="mt-6">
      <PermissionModuleSections
        sections={moduleSections}
        renderPermissionCard={(permission) => (
          <PermissionToggleCard
            key={permission.code}
            permission={permission}
            checked={checkedPermissionCodes.has(permission.code)}
            disabled={!canManage || savingPermissionCode !== null}
            isSaving={savingPermissionCode === permission.code}
            onToggle={(nextChecked) => handleToggle(permission.code, nextChecked)}
          />
        )}
      />
    </div>
  );
}
