import type { PermissionCatalogItem } from '@/types/authorization';
import { PermissionModuleSections } from '@/entities/authorization/components/permission-module-sections';
import { PermissionToggleCard } from '@/entities/authorization/components/permission-toggle-card';
import type { PermissionState } from './user-permission-section.types';

interface UserPermissionModuleSectionItem {
  module: string;
  permissions: PermissionCatalogItem[];
  scopeGroups: UserPermissionScopeGroupItem[];
}

interface UserPermissionScopeGroupItem {
  key: string;
  scopeSummary: string;
}

interface UserPermissionModuleListProps {
  getPermissionState: (permissionCode: string) => PermissionState;
  handlePermissionToggle: (permissionCode: string, nextChecked: boolean) => void;
  isPermissionSaving: (permissionCode: string) => boolean;
  moduleSections: UserPermissionModuleSectionItem[];
}

/**
 * 按模块展示权限开关，旁侧只读展示角色绑定的作用范围/数据范围。
 */
export function UserPermissionModuleList({
  getPermissionState,
  handlePermissionToggle,
  isPermissionSaving,
  moduleSections,
}: UserPermissionModuleListProps) {
  const getScopeGroupLabel = (scopeGroupKey: string) => (
    scopeGroupKey.endsWith('_resource_scope') ? '数据范围' : '作用范围'
  );

  return (
    <PermissionModuleSections
      sections={moduleSections.map((section) => ({
        module: section.module,
        permissions: section.permissions,
        sectionAction: section.scopeGroups.length > 0 ? (
          <div className="flex w-full flex-wrap items-center justify-start gap-2 lg:justify-end">
            {section.scopeGroups.map((scopeGroup) => (
              <div key={scopeGroup.key} className="flex min-w-[160px] items-center gap-2">
                <span className="shrink-0 text-[11px] font-bold text-slate-500">
                  {getScopeGroupLabel(scopeGroup.key)}
                </span>
                <span className="min-w-0 truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600">
                  {scopeGroup.scopeSummary}
                </span>
              </div>
            ))}
          </div>
        ) : null,
      }))}
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
