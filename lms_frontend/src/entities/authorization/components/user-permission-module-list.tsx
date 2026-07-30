import type { PermissionCatalogItem } from '@/types/authorization';
import { PermissionModuleSections } from '@/entities/authorization/components/permission-module-sections';
import { PermissionToggleCard } from '@/entities/authorization/components/permission-toggle-card';
import type { PermissionState } from './user-permission-section.types';

interface UserPermissionModuleSectionItem {
  module: string;
  permissions: PermissionCatalogItem[];
}

interface UserPermissionModuleListProps {
  getPermissionState: (permissionCode: string) => PermissionState;
  handlePermissionToggle: (permissionCode: string, nextChecked: boolean) => void;
  isPermissionSaving: (permissionCode: string) => boolean;
  moduleSections: UserPermissionModuleSectionItem[];
}

/**
 * 按模块展示权限开关。
 */
export function UserPermissionModuleList({
  getPermissionState,
  handlePermissionToggle,
  isPermissionSaving,
  moduleSections,
}: UserPermissionModuleListProps) {
  return (
    <PermissionModuleSections
      sections={moduleSections}
      renderPermissionCard={(permission) => {
        const permissionState = getPermissionState(permission.code);
        const disabled = Boolean(
          isPermissionSaving(permission.code)
          || (permissionState.checked
            ? permissionState.disableBlockedReason
            : permissionState.enableBlockedReason),
        );

        return (
          <PermissionToggleCard
            key={permission.code}
            permission={permission}
            checked={permissionState.checked}
            disabled={disabled}
            isSaving={isPermissionSaving(permission.code)}
            onToggle={(nextChecked) => { handlePermissionToggle(permission.code, nextChecked); }}
          />
        );
      }}
    />
  );
}
