import { Loader2 } from 'lucide-react';

import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { cn } from '@/lib/utils';
import type { PermissionCatalogItem, PermissionOverrideScope } from '@/types/api';

import type { PermissionState } from './user-permission-section.types';

interface UserPermissionCardProps {
  permission: PermissionCatalogItem;
  permissionState: PermissionState;
  loading: boolean;
  forcedDisabled?: boolean;
  canCreateOverride: boolean;
  canRevokeOverride: boolean;
  hasValidScopeSelection: boolean;
  selectedPermissionScopes: PermissionOverrideScope[];
  selectedScopeUserIds: number[];
  onToggle: (nextChecked: boolean) => void;
}

export const UserPermissionCard: React.FC<UserPermissionCardProps> = ({
  permission,
  permissionState,
  loading,
  forcedDisabled = false,
  canCreateOverride,
  canRevokeOverride,
  hasValidScopeSelection,
  selectedPermissionScopes,
  selectedScopeUserIds,
  onToggle,
}) => {
  const checked = permissionState.checked;
  const needsCreateToEnable = permissionState.missingSelectedAllowScopeTypes.length > 0
    || (
      permissionState.isSelfOnlySelection
      && !permissionState.fromTemplate
      && !permissionState.hasSelfAllow
      && !permissionState.hasNonSelfAllow
    )
    || (
      selectedPermissionScopes.includes('EXPLICIT_USERS')
      && selectedScopeUserIds.length > 0
      && !permissionState.hasExactExplicitAllow
    );
  const needsCreateToDisable = (
    permissionState.isSelfOnlySelection
    && (permissionState.fromTemplate || permissionState.hasNonSelfAllow)
  ) || (
    permissionState.fromTemplate
    && permissionState.inheritedSelectedScopeTypes.length > 0
  );
  const needsRevokeToEnable = permissionState.selectedDenyOverrides.length > 0;
  const needsRevokeToDisable = permissionState.selectedAllowOverrides.length > 0;
  const disabled = (
    forcedDisabled
    || loading
    || !hasValidScopeSelection
    || (
      checked
        ? (
          (needsRevokeToDisable && !canRevokeOverride)
          || (needsCreateToDisable && !canCreateOverride)
        )
        : (
          (needsRevokeToEnable && !canRevokeOverride)
          || (needsCreateToEnable && !canCreateOverride)
        )
    )
  );
  const handleToggle = () => {
    if (disabled) return;
    onToggle(!checked);
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={checked}
      onClick={handleToggle}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggle(!checked);
        }
      }}
      className={cn(
        'group relative flex flex-col gap-3 rounded-[18px] border p-4 transition-colors duration-200',
        disabled && 'cursor-not-allowed opacity-55 hover:translate-y-0 hover:shadow-none',
        checked
          ? 'border-primary-200 bg-primary-50/45'
          : 'border-border/70 bg-white hover:bg-muted/35',
      )}
    >
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-semibold leading-6 text-slate-800 line-clamp-1">{permission.name}</p>
          {permission.description ? (
            <p className="text-[12px] leading-5 text-slate-500 line-clamp-2">{permission.description}</p>
          ) : null}
          {permission.constraint_summary ? (
            <p className="text-[11px] leading-5 text-warning-800/90">
              生效约束: {permission.constraint_summary}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          {loading && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
          <ToggleSwitch
            checked={checked}
            disabled={disabled}
            onCheckedChange={onToggle}
          />
        </div>
      </div>
      {forcedDisabled && (
        <p className="text-[11px] font-medium text-slate-400">仅管理员角色可配置此权限</p>
      )}
    </div>
  );
};
