import type {
  PermissionCatalogItem,
  ScopeType,
} from '@/types/authorization';
import type { UserList } from '@/types/common';
import { PermissionModuleSections } from '@/features/user-management/components/authorization/permission-module-sections';
import { PermissionToggleCard } from '@/features/user-management/components/authorization/permission-toggle-card';
import { UserPermissionScopePopover } from '@/features/user-management/components/authorization/user-permission-scope-popover';
import { sameScopeType } from '@/features/user-management/components/authorization/user-form.utils';
import type { PermissionState } from '@/features/user-management/components/authorization/user-form.utils';
import type { ScopeFilterOption } from '@/features/user-management/components/authorization/user-permission-scope.utils';

interface UserPermissionModuleSectionItem {
  module: string;
  permissions: PermissionCatalogItem[];
  scopeGroups: UserPermissionScopeGroupItem[];
}

interface UserPermissionScopeGroupItem {
  key: string;
  defaultScopeType: ScopeType | null;
  availableScopeTypes: ScopeType[];
  scopeSummary: string;
  scopeSelection: {
    scopeType: ScopeType | null;
    targetUserIds: number[];
  };
}

interface UserPermissionModuleListProps {
  filteredScopeUsers: UserList[];
  formatScopeSummaryForDisplay: (
    scopeType: ScopeType | null,
    targetUserIds?: number[],
  ) => string;
  getPermissionState: (permissionCode: string) => PermissionState;
  handlePermissionToggle: (
    permissionCode: string,
    nextChecked: boolean,
  ) => void;
  handleScopeFilterChange: (filterValue: string) => void;
  isPermissionSaving: (permissionCode: string) => boolean;
  isScopeUsersLoading: boolean;
  moduleSections: UserPermissionModuleSectionItem[];
  onApplyDefaultScopePreset: () => void;
  onOpenScopeGroupChange: (scopeGroupKey: string | null) => void;
  onScopeUserSearchChange: (value: string) => void;
  onSelectPresetScope: (scopeType: ScopeType) => void;
  onSetScopeUserFilter: (value: string) => void;
  onSetShowScopeAdjustPanel: (open: boolean) => void;
  onToggleScopeUser: (scopeUserId: number) => void;
  onToggleSelectAllFilteredScopeUsers: () => void;
  openScopeGroupKey: string | null;
  scopeFilterOptions: ScopeFilterOption[];
  scopeUserFilter: string;
  scopeUserSearch: string;
  selectedScopeType: ScopeType | null;
  selectedScopeUserIds: number[];
  showScopeAdjustPanel: boolean;
  dialogContentElement: HTMLDivElement | null;
}

/**
 * 用户权限模块列表与范围弹窗。
 */
export function UserPermissionModuleList({
  filteredScopeUsers,
  formatScopeSummaryForDisplay,
  getPermissionState,
  handlePermissionToggle,
  handleScopeFilterChange,
  isPermissionSaving,
  isScopeUsersLoading,
  moduleSections,
  onApplyDefaultScopePreset,
  onOpenScopeGroupChange,
  onScopeUserSearchChange,
  onSelectPresetScope,
  onSetScopeUserFilter,
  onSetShowScopeAdjustPanel,
  onToggleScopeUser,
  onToggleSelectAllFilteredScopeUsers,
  openScopeGroupKey,
  scopeFilterOptions,
  scopeUserFilter,
  scopeUserSearch,
  selectedScopeType,
  selectedScopeUserIds,
  showScopeAdjustPanel,
  dialogContentElement,
}: UserPermissionModuleListProps) {
  const getScopeGroupLabel = (scopeGroupKey: string) =>
    scopeGroupKey.endsWith('_resource_scope') ? '数据范围' : '作用范围';

  return (
    <PermissionModuleSections
      sections={moduleSections.map((section) => ({
        module: section.module,
        permissions: section.permissions,
        sectionAction:
          section.scopeGroups.length > 0 ? (
            <div className="flex w-full flex-wrap items-center justify-start gap-2 lg:justify-end">
              {section.scopeGroups.map((scopeGroup) => {
                const isOpen =
                  showScopeAdjustPanel
                  && openScopeGroupKey === scopeGroup.key;

                return (
                <div
                  key={scopeGroup.key}
                  className="flex min-w-[210px] items-center gap-2"
                >
                  <span className="shrink-0 text-[11px] font-bold text-slate-500">
                    {getScopeGroupLabel(scopeGroup.key)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <UserPermissionScopePopover
                      open={isOpen}
                      onOpenChange={(open) => {
                        onOpenScopeGroupChange(open ? scopeGroup.key : null);
                        onSetShowScopeAdjustPanel(open);
                      }}
                      summary={
                        isOpen
                          ? formatScopeSummaryForDisplay(
                            selectedScopeType,
                            selectedScopeUserIds,
                          )
                          : scopeGroup.scopeSummary
                      }
                      scopeFilterOptions={scopeFilterOptions}
                      availableScopeTypes={scopeGroup.availableScopeTypes}
                      selectedScopeType={
                        isOpen
                          ? selectedScopeType
                          : scopeGroup.scopeSelection.scopeType
                      }
                      onSelectPresetScope={onSelectPresetScope}
                      scopeUserFilter={scopeUserFilter}
                      onScopeFilterChange={handleScopeFilterChange}
                      showReset={
                        isOpen
                        && !sameScopeType(
                          selectedScopeType,
                          scopeGroup.defaultScopeType,
                        )
                      }
                      onReset={() => {
                        onApplyDefaultScopePreset();
                        onSetScopeUserFilter('all');
                      }}
                      scopeUserSearch={scopeUserSearch}
                      onScopeUserSearchChange={onScopeUserSearchChange}
                      onToggleSelectAllFilteredScopeUsers={
                        onToggleSelectAllFilteredScopeUsers
                      }
                      filteredScopeUsers={isOpen ? filteredScopeUsers : []}
                      selectedScopeUserIds={
                        isOpen
                          ? selectedScopeUserIds
                          : scopeGroup.scopeSelection.targetUserIds
                      }
                      onToggleScopeUser={onToggleScopeUser}
                      isScopeUsersLoading={isScopeUsersLoading}
                      dialogContentElement={dialogContentElement}
                    />
                  </div>
                </div>
                );
              })}
            </div>
          ) : null,
      }))}
      renderPermissionCard={(permission) => {
        const permissionState = getPermissionState(permission.code);
        const disabled = Boolean(
          permissionState.locked
          || isPermissionSaving(permission.code)
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
            onToggle={(nextChecked) => {
              handlePermissionToggle(permission.code, nextChecked);
            }}
          />
        );
      }}
    />
  );
}
