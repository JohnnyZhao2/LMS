import { Check } from 'lucide-react';
import { UserPermissionModuleSidebar } from '@/features/users/components/user-permission-module-sidebar';
import { isPermissionLockedForRole } from '@/features/authorization/constants/permission-constraints';
import { cn } from '@/lib/utils';
import type { PermissionCatalogItem, RoleCode } from '@/types/api';
import { ROLE_TEMPLATE_LABELS } from '@/features/authorization/constants/role-template';

interface PermissionGroup {
  module: string;
  permissions: PermissionCatalogItem[];
  modulePresentation: {
    label: string;
    summary: string;
  };
}

interface RoleTemplateWorkbenchProps {
  permissionModules: string[];
  roleCodes: RoleCode[];
  permissionCodesByRole: Partial<Record<RoleCode, string[]>>;
  activeGroup: PermissionGroup;
  canUpdateRoleTemplate: boolean;
  savingRoleCodes: RoleCode[];
  onSelectModule: (moduleName: string) => void;
  onToggleCode: (roleCode: RoleCode, nextCodes: string[]) => void;
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
      'inline-flex h-8 w-8 items-center justify-center rounded-xl border transition-colors duration-200',
      checked
        ? 'border-primary-200 bg-primary-50 text-primary'
        : 'border-border/80 bg-white text-transparent',
      disabled
        ? 'cursor-not-allowed opacity-45'
        : 'hover:border-primary-200 hover:bg-primary-50/65',
    )}
  >
    <Check className="h-3.5 w-3.5" strokeWidth={3} />
  </button>
);

export const RoleTemplateWorkbench: React.FC<RoleTemplateWorkbenchProps> = ({
  permissionModules,
  roleCodes,
  permissionCodesByRole,
  activeGroup,
  canUpdateRoleTemplate,
  savingRoleCodes,
  onSelectModule,
  onToggleCode,
}) => {
  const activeRoleCounts = Object.fromEntries(
    roleCodes.map((roleCode) => [
      roleCode,
      activeGroup.permissions.filter((permission) => (
        permissionCodesByRole[roleCode]?.includes(permission.code)
      )).length,
    ]),
  ) as Record<RoleCode, number>;

  return (
    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
      <section className="rounded-2xl border border-border/70 bg-white p-3">
        <UserPermissionModuleSidebar
          permissionModules={permissionModules}
          activePermissionModule={activeGroup.module}
          onSelectModule={onSelectModule}
          showCounts={false}
        />
      </section>

      <section className="rounded-2xl border border-border/70 bg-white">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <h3 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
            {activeGroup.modulePresentation.label}
          </h3>
        </div>

        <div className="border-t border-border/60">
          <div className="overflow-x-auto">
            <div
              className="min-w-[760px]"
              style={{ gridTemplateColumns: `minmax(220px,1.8fr) repeat(${roleCodes.length}, minmax(92px,1fr))` }}
            >
              <div
                className="grid"
                style={{ gridTemplateColumns: `minmax(220px,1.8fr) repeat(${roleCodes.length}, minmax(92px,1fr))` }}
              >
                <div className="sticky left-0 z-10 border-b border-border/60 bg-white px-5 py-3">
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted">
                    权限
                  </div>
                </div>

                {roleCodes.map((roleCode) => (
                  <div
                    key={roleCode}
                    className="border-b border-l border-border/60 bg-white px-3 py-3 text-center"
                  >
                    <div className="text-sm font-semibold text-foreground">
                      {ROLE_TEMPLATE_LABELS[roleCode] ?? roleCode}
                    </div>
                    <div className="mt-1 text-[11px] text-text-muted">
                      {activeRoleCounts[roleCode]}/{activeGroup.permissions.length}
                    </div>
                  </div>
                ))}
              </div>

              {activeGroup.permissions.map((permission, index) => (
                <div
                  key={permission.code}
                  className="grid"
                  style={{ gridTemplateColumns: `minmax(220px,1.8fr) repeat(${roleCodes.length}, minmax(92px,1fr))` }}
                >
                  <div
                    className={cn(
                      'sticky left-0 z-10 bg-white px-5 py-4',
                      index > 0 && 'border-t border-border/60',
                    )}
                  >
                    <div className="text-sm font-medium text-foreground">{permission.name}</div>
                    {permission.constraint_summary ? (
                      <div className="mt-1 text-[11px] leading-5 text-warning-800/90">
                        {permission.constraint_summary}
                      </div>
                    ) : null}
                  </div>

                  {roleCodes.map((roleCode) => {
                    const checked = permissionCodesByRole[roleCode]?.includes(permission.code) ?? false;
                    const locked = isPermissionLockedForRole(roleCode, permission);
                    const disabled = !canUpdateRoleTemplate || locked || savingRoleCodes.includes(roleCode);
                    const nextCodes = checked
                      ? (permissionCodesByRole[roleCode] ?? []).filter((code) => code !== permission.code)
                      : [...(permissionCodesByRole[roleCode] ?? []), permission.code];

                    return (
                      <div
                        key={`${permission.code}-${roleCode}`}
                        className={cn(
                          'flex items-center justify-center px-3 py-3',
                          'border-l border-border/60',
                          index > 0 && 'border-t border-border/60',
                          disabled ? 'bg-muted/[0.18]' : 'bg-white',
                        )}
                      >
                        <RolePermissionCell
                          checked={checked}
                          disabled={disabled}
                          onClick={() => onToggleCode(roleCode, nextCodes)}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
