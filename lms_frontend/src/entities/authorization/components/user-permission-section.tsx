import { useMemo, useState } from 'react';
import {
  useGroupPermissions,
  useReplaceGroupPermissions,
  useReplaceUserPermissions,
  useUserPermissions,
} from '@/entities/authorization/api/authorization';
import { PermissionModuleSections } from '@/entities/authorization/components/permission-module-sections';
import { PermissionToggleCard } from '@/entities/authorization/components/permission-toggle-card';
import { applyPermissionSelectionChange } from '@/entities/authorization/utils/permission-dependencies';
import { buildPermissionModuleSections } from '@/entities/authorization/utils/permission-sections';
import { showApiError } from '@/utils/error-handler';
import type { PermissionCatalogItem } from '@/types/authorization';
import type { RoleCode } from '@/types/common';

interface UserPermissionSectionProps {
  userId?: number;
  roleCode?: RoleCode;
  permissionCatalog: PermissionCatalogItem[];
  canUpdate: boolean;
}

export function UserPermissionSection({
  userId,
  roleCode,
  permissionCatalog,
  canUpdate,
}: UserPermissionSectionProps) {
  const isGroupMode = Boolean(roleCode);
  const userPermissionsQuery = useUserPermissions(userId ?? null, !isGroupMode);
  const groupPermissionsQuery = useGroupPermissions(roleCode ?? null, isGroupMode);
  const replaceUserPermissions = useReplaceUserPermissions();
  const replaceGroupPermissions = useReplaceGroupPermissions();
  const [savingPermissionCodes, setSavingPermissionCodes] = useState<string[]>([]);

  const permissionData = isGroupMode ? groupPermissionsQuery.data : userPermissionsQuery.data;
  const permissionCodes = permissionData?.permission_codes ?? [];
  const inheritedPermissionCodeSet = useMemo(
    () => new Set(userPermissionsQuery.data?.inherited_permission_codes ?? []),
    [userPermissionsQuery.data?.inherited_permission_codes],
  );
  const permissionCodeSet = useMemo(() => new Set(permissionCodes), [permissionCodes]);
  const permissionSections = useMemo(
    () => buildPermissionModuleSections(permissionCatalog),
    [permissionCatalog],
  );
  const isSaving = savingPermissionCodes.length > 0;

  const handlePermissionToggle = async (permissionCode: string, nextChecked: boolean) => {
    if (!canUpdate || isSaving) {
      return;
    }

    const nextCodes = applyPermissionSelectionChange({
      currentEnabledCodes: permissionCodes,
      nextChecked,
      permissionCatalog,
      permissionCode,
    });
    const normalizedNextCodes = Array.from(new Set(nextCodes)).sort();
    if (permissionCodes.join('|') === normalizedNextCodes.join('|')) {
      return;
    }

    setSavingPermissionCodes((previous) => (
      previous.includes(permissionCode) ? previous : [...previous, permissionCode]
    ));

    try {
      if (roleCode) {
        await replaceGroupPermissions.mutateAsync({
          roleCode,
          permissionCodes: normalizedNextCodes,
        });
      } else if (userId) {
        await replaceUserPermissions.mutateAsync({
          userId,
          permissionCodes: normalizedNextCodes,
        });
      }
    } catch (error) {
      showApiError(error);
    } finally {
      setSavingPermissionCodes((previous) => previous.filter((code) => code !== permissionCode));
    }
  };

  if (userPermissionsQuery.isLoading || groupPermissionsQuery.isLoading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center text-sm text-text-muted">
        正在加载权限...
      </div>
    );
  }

  return (
    <PermissionModuleSections
      sections={permissionSections}
      renderPermissionCard={(permission) => {
        const checked = permissionCodeSet.has(permission.code);
        const disabled = !canUpdate || isSaving || inheritedPermissionCodeSet.has(permission.code);

        return (
          <PermissionToggleCard
            key={permission.code}
            permission={permission}
            checked={checked}
            disabled={disabled}
            isSaving={savingPermissionCodes.includes(permission.code)}
            onToggle={(nextChecked) => { void handlePermissionToggle(permission.code, nextChecked); }}
          />
        );
      }}
    />
  );
}
