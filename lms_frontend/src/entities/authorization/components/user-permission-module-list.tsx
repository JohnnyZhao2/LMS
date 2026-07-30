import type { PermissionCatalogItem } from '@/types/authorization';
import { PermissionModuleSections } from './permission-module-sections';
import { PermissionToggleCard } from './permission-toggle-card';

interface UserPermissionModuleSectionItem {
  module: string;
  permissions: PermissionCatalogItem[];
}

interface UserPermissionModuleListProps {
  checkedPermissionCodes: Set<string>;
  canManage: boolean;
  savingPermissionCode: string | null;
  moduleSections: UserPermissionModuleSectionItem[];
  onToggle: (permissionCode: string, nextChecked: boolean) => void;
}

export function UserPermissionModuleList({
  checkedPermissionCodes,
  canManage,
  savingPermissionCode,
  moduleSections,
  onToggle,
}: UserPermissionModuleListProps) {
  return (
    <PermissionModuleSections
      sections={moduleSections}
      renderPermissionCard={(permission) => (
        <PermissionToggleCard
          key={permission.code}
          permission={permission}
          checked={checkedPermissionCodes.has(permission.code)}
          disabled={!canManage || savingPermissionCode !== null}
          isSaving={savingPermissionCode === permission.code}
          onToggle={(nextChecked) => onToggle(permission.code, nextChecked)}
        />
      )}
    />
  );
}
