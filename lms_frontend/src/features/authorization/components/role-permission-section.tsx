import { useMemo } from 'react';
import { getModulePresentation, getPermissionLabel } from '@/features/authorization/lib/permission-presentation';
import { applyPermissionSelectionChange } from '@/features/authorization/lib/permission-dependencies';
import { cn } from '@/lib/utils';
import type { PermissionCatalogItem, UpdateRolePayload } from '@/features/authorization/types';
import type { RoleCode } from '@/types/common';

interface RolePermissionSectionProps {
  roleCode: RoleCode;
  permissionCodes: string[];
  permissionCatalog: PermissionCatalogItem[];
  isUpdatingRole: boolean;
  onUpdateRole: (payload: UpdateRolePayload) => Promise<boolean | void>;
}

export function RolePermissionSection({
  roleCode,
  permissionCodes,
  permissionCatalog,
  isUpdatingRole,
  onUpdateRole,
}: RolePermissionSectionProps) {
  const isSaving = isUpdatingRole;

  const permissionCodeSet = useMemo(() => new Set(permissionCodes), [permissionCodes]);
  const permissionSections = useMemo(() => {
    const grouped = new Map<string, PermissionCatalogItem[]>();
    for (const permission of permissionCatalog) {
      const bucket = grouped.get(permission.module) ?? [];
      bucket.push(permission);
      grouped.set(permission.module, bucket);
    }
    return Array.from(grouped.entries())
      .map(([module, permissions]) => ({ module, permissions }))
      .sort((left, right) => {
        const leftMeta = getModulePresentation(left.module);
        const rightMeta = getModulePresentation(right.module);
        if (leftMeta.order !== rightMeta.order) {
          return leftMeta.order - rightMeta.order;
        }
        return leftMeta.label.localeCompare(rightMeta.label, 'zh-Hans-CN');
      });
  }, [permissionCatalog]);

  const handlePermissionToggle = async (permissionCode: string, nextChecked: boolean) => {
    if (isSaving) {
      return;
    }

    const nextCodes = applyPermissionSelectionChange({
      currentEnabledCodes: permissionCodes,
      nextChecked,
      permissionCatalog,
      permissionCode,
    });
    if (
      permissionCodes.length === nextCodes.length
      && permissionCodes.every((code) => nextCodes.includes(code))
    ) {
      return;
    }

    await onUpdateRole({
      roleCode,
      permission_codes: nextCodes,
    });
  };

  if (permissionSections.length === 0) {
    return (
      <div className="py-12 text-center text-sm font-medium text-slate-400">
        暂无模块数据
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {permissionSections.map((section) => {
        const modulePresentation = getModulePresentation(section.module);

        return (
          <section
            key={section.module}
            className="border-b border-border/60 pb-8 last:border-b-0 last:pb-0"
          >
            <div className="mb-4">
              <h3 className="text-[15px] font-semibold text-foreground">
                {modulePresentation.label}
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {section.permissions.map((permission) => {
                const checked = permissionCodeSet.has(permission.code);
                const disabled = isSaving;

                return (
                  <button
                    key={permission.code}
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    disabled={disabled}
                    onClick={() => {
                      void handlePermissionToggle(permission.code, !checked);
                    }}
                    className={cn(
                      'flex min-h-[56px] w-full items-center justify-between gap-3 rounded-[16px] px-4 py-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
                      checked
                        ? 'bg-white shadow-[0_2px_10px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.11),0_1px_3px_rgba(15,23,42,0.06)]'
                        : 'bg-slate-50/80 hover:bg-slate-100/90',
                      disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
                    )}
                  >
                    <span
                      className={cn(
                        'line-clamp-1 min-w-0 flex-1 text-sm leading-6 transition-colors',
                        checked
                          ? 'font-semibold text-slate-800'
                          : 'font-medium text-slate-400',
                      )}
                    >
                      {getPermissionLabel(permission.code, permission.name)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
