import { Check } from 'lucide-react';
import { ROLE_FULL_LABELS } from '@/config/role-constants';
import {
  getScopeGroupPresentation,
  getScopeTypeLabel,
} from '@/features/authorization/constants/permission-presentation';
import { UserPermissionModuleSidebar } from '@/features/users/components/user-permission-module-sidebar';
import { cn } from '@/lib/utils';
import type {
  PermissionCatalogItem,
  PermissionOverrideScope,
  RolePermissionTemplate,
} from '@/types/authorization';
import type { RoleCode } from '@/types/common';
import { applyPermissionSelectionChange } from '../utils/permission-dependencies';

interface PermissionGroup {
  module: string;
  permissions: PermissionCatalogItem[];
  modulePresentation: {
    label: string;
  };
}

interface RoleTemplateWorkbenchProps {
  permissionModules: string[];
  roleCodes: RoleCode[];
  permissionCatalog: PermissionCatalogItem[];
  roleTemplatesByRole: Partial<Record<RoleCode, RolePermissionTemplate | undefined>>;
  permissionCodesByRole: Partial<Record<RoleCode, string[]>>;
  activeGroup: PermissionGroup;
  canUpdateRoleTemplate: boolean;
  savingRoleCodes: RoleCode[];
  onSelectModule: (moduleName: string) => void;
  onToggleCode: (roleCode: RoleCode, nextCodes: string[]) => void;
}

interface ActiveScopeGroupSummary {
  key: string;
  label: string;
  defaultScopeTypesByRole: Record<RoleCode, PermissionOverrideScope[]>;
}

const RolePermissionCell: React.FC<{
  checked: boolean;
  disabled: boolean;
  onClick: () => void;
}> = ({ checked, disabled, onClick }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={cn(
      'inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-colors duration-200',
      checked
        ? 'border-primary-200 bg-primary-50 text-primary shadow-[inset_0_0_0_1px_rgba(59,130,246,0.08)]'
        : 'border-border/80 bg-white text-transparent',
      disabled
        ? 'cursor-not-allowed opacity-45'
        : 'hover:border-primary-200 hover:bg-primary-50/65',
    )}
  >
    <Check className="h-3.5 w-3.5" strokeWidth={3} />
  </button>
);

const formatScopeTypes = (scopeTypes: PermissionOverrideScope[]) => {
  if (scopeTypes.length === 0) {
    return '未配置';
  }
  return scopeTypes.map((scopeType) => getScopeTypeLabel(scopeType)).join(' / ');
};

export const RoleTemplateWorkbench: React.FC<RoleTemplateWorkbenchProps> = ({
  permissionModules,
  roleCodes,
  permissionCatalog,
  roleTemplatesByRole,
  permissionCodesByRole,
  activeGroup,
  canUpdateRoleTemplate,
  savingRoleCodes,
  onSelectModule,
  onToggleCode,
}) => {
  const matrixTemplateColumns = `minmax(280px,1.8fr) repeat(${roleCodes.length}, minmax(104px,1fr))`;
  const activeScopeGroups = Array.from(new Set(
    activeGroup.permissions
      .map((permission) => permission.scope_group_key)
      .filter((scopeGroupKey): scopeGroupKey is string => Boolean(scopeGroupKey)),
  ))
    .map((scopeGroupKey) => {
      const presentation = getScopeGroupPresentation(scopeGroupKey);
      return {
        key: scopeGroupKey,
        label: presentation.label,
        defaultScopeTypesByRole: Object.fromEntries(
          roleCodes.map((roleCode) => [
            roleCode,
            roleTemplatesByRole[roleCode]?.scope_groups.find((scopeGroup) => scopeGroup.key === scopeGroupKey)?.default_scope_types ?? [],
          ]),
        ) as Record<RoleCode, PermissionOverrideScope[]>,
      } satisfies ActiveScopeGroupSummary;
    });

  const toggleRolePermission = (roleCode: RoleCode, permissionCode: string, nextChecked: boolean) => {
    const nextCodes = applyPermissionSelectionChange({
      currentEnabledCodes: permissionCodesByRole[roleCode] ?? [],
      nextChecked,
      permissionCatalog,
      permissionCode,
    });
    onToggleCode(roleCode, nextCodes);
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-border/70 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.03)]">
      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[216px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-border/60 bg-[linear-gradient(180deg,rgba(248,250,252,0.85),rgba(255,255,255,0.92))] xl:border-b-0 xl:border-r">
          <div className="px-4 pt-4 pb-2">
            <div className="text-sm font-semibold text-foreground">模块</div>
            <div className="mt-1 text-[11px] text-text-muted">切换要编辑的权限分组</div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-2 pb-3">
            <UserPermissionModuleSidebar
              permissionModules={permissionModules}
              activePermissionModule={activeGroup.module}
              onSelectModule={onSelectModule}
              showCounts={false}
            />
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col bg-[linear-gradient(180deg,rgba(248,250,252,0.45),rgba(255,255,255,0))]">
          <div className="px-5 py-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
                  {activeGroup.modulePresentation.label}
                </h3>
                <div className="mt-1 text-xs leading-5 text-text-muted">
                  勾选表示该角色默认拥有此权限。
                </div>
              </div>

              {!canUpdateRoleTemplate ? (
                <div className="text-[11px] text-text-muted">
                  当前为只读模式
                </div>
              ) : null}
            </div>

            {activeScopeGroups.length > 0 ? (
              <div className="mt-3 flex flex-col gap-1.5 text-[11px] leading-5 text-text-muted">
                {activeScopeGroups.map((scopeGroup) => (
                  <div key={scopeGroup.key} className="flex flex-wrap gap-x-3 gap-y-1">
                    <span className="font-medium text-foreground">{scopeGroup.label}</span>
                    {roleCodes.map((roleCode) => (
                      <span key={`${scopeGroup.key}-${roleCode}`}>
                        {ROLE_FULL_LABELS[roleCode] ?? roleCode}
                        {` ${formatScopeTypes(scopeGroup.defaultScopeTypesByRole[roleCode])}`}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 px-4 pb-4">
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-white">
              <div className="min-h-0 flex-1 overflow-auto">
                <div className="min-h-full min-w-[860px]">
              <div
                className="grid border-b border-border/60 bg-muted/[0.22]"
                style={{ gridTemplateColumns: matrixTemplateColumns }}
              >
                <div className="sticky top-0 left-0 z-20 bg-muted/[0.22] px-4 py-3 text-xs font-medium text-text-muted">
                  权限项
                </div>

                {roleCodes.map((roleCode) => (
                  <div
                    key={roleCode}
                    className="sticky top-0 z-10 border-l border-border/60 bg-muted/[0.22] px-3 py-3 text-center"
                  >
                    <div className="text-sm font-semibold text-foreground">
                      {ROLE_FULL_LABELS[roleCode] ?? roleCode}
                    </div>
                  </div>
                ))}
              </div>

              {activeGroup.permissions.map((permission, index) => {
                const isLastRow = index === activeGroup.permissions.length - 1;
                const scopeGroupPresentation = permission.scope_group_key
                  ? getScopeGroupPresentation(permission.scope_group_key)
                  : null;
                const helperText = permission.constraint_summary || permission.description;
                const rowSurface = index % 2 === 0 ? 'bg-white' : 'bg-muted/[0.14]';

                return (
                  <div
                    key={permission.code}
                    className="grid"
                    style={{ gridTemplateColumns: matrixTemplateColumns }}
                  >
                    <div
                      className={cn(
                        'sticky left-0 z-10 px-4 py-3',
                        rowSurface,
                        index > 0 && 'border-t border-border/60',
                        isLastRow && 'border-b border-border/60',
                      )}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">{permission.name}</div>
                        {helperText ? (
                          <div className="mt-1 text-[11px] leading-5 text-text-muted">
                            {scopeGroupPresentation ? `${scopeGroupPresentation.label}：` : ''}
                            {helperText}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {roleCodes.map((roleCode) => {
                      const checked = permissionCodesByRole[roleCode]?.includes(permission.code) ?? false;
                      const disabled = !canUpdateRoleTemplate || savingRoleCodes.includes(roleCode);

                      return (
                        <div
                          key={`${permission.code}-${roleCode}`}
                          className={cn(
                            'flex items-center justify-center px-3 py-3',
                            rowSurface,
                            'border-l border-border/60',
                            index > 0 && 'border-t border-border/60',
                            isLastRow && 'border-b border-border/60',
                            disabled && 'opacity-60',
                          )}
                        >
                          <RolePermissionCell
                            checked={checked}
                            disabled={disabled}
                            onClick={() => toggleRolePermission(roleCode, permission.code, !checked)}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/[0.18] px-4 py-2.5 text-[11px] text-text-muted">
                <span>{activeGroup.permissions.length} 项权限</span>
                <span>{activeScopeGroups.length > 0 ? `${activeScopeGroups.length} 个范围策略` : '无范围策略'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
