import { Loader2 } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { PermissionOverrideScope } from '@/types/api';

import type {
  PermissionCatalogEntry,
  PermissionState,
} from './user-permission-section.types';

interface UserPermissionCardProps {
  permission: PermissionCatalogEntry;
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

  return (
    <label
      className={cn(
        'group relative flex cursor-pointer flex-col gap-3 rounded-2xl border p-4 transition-all duration-300',
        forcedDisabled && 'cursor-not-allowed opacity-55 hover:translate-y-0 hover:shadow-none',
        checked
          ? 'border-primary/20 bg-primary/[0.03] shadow-[0_2px_10px_-4px_rgba(var(--primary),0.05)] hover:border-primary/30'
          : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:-translate-y-0.5',
      )}
    >
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-primary transition-colors">{permission.name}</p>
          <p className="text-[11px] text-slate-500 line-clamp-1">{permission.description || permission.code}</p>
          {permission.constraint_summary ? (
            <p className="text-[11px] text-amber-700/90 line-clamp-2">
              生效约束：{permission.constraint_summary}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          {loading && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
          <Checkbox
            checked={checked}
            disabled={
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
            }
            onCheckedChange={(value) => onToggle(value === true)}
            className={cn('transition-all duration-300 rounded', checked ? 'scale-110' : '')}
          />
        </div>
      </div>
      {forcedDisabled && (
        <p className="text-[11px] font-medium text-slate-400">仅管理员角色可配置此权限</p>
      )}
    </label>
  );
};
