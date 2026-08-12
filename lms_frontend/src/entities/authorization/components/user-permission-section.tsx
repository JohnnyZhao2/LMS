import { useMemo } from 'react';
import {
  useGroupPermissions,
  useReplaceGroupPermissions,
  useReplaceUserPermissions,
  useUserPermissions,
} from '@/entities/authorization/api/authorization';
import { getModulePresentation } from '@/entities/authorization/constants/permission-presentation';
import { applyPermissionSelectionChange } from '@/entities/authorization/utils/permission-dependencies';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { cn } from '@/lib/utils';
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
  const isSaving = replaceUserPermissions.isPending || replaceGroupPermissions.isPending;

  const permissionData = isGroupMode ? groupPermissionsQuery.data : userPermissionsQuery.data;
  const permissionCodes = permissionData?.permission_codes ?? [];
  const basePermissionCodeSet = useMemo(
    () => new Set(userPermissionsQuery.data?.base_permission_codes ?? []),
    [userPermissionsQuery.data?.base_permission_codes],
  );
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
    if (!canUpdate || isSaving) {
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

    try {
      if (roleCode) {
        await replaceGroupPermissions.mutateAsync({
          roleCode,
          permissionCodes: nextCodes,
        });
      } else if (userId) {
        await replaceUserPermissions.mutateAsync({
          userId,
          permissionCodes: nextCodes,
        });
      }
    } catch (error) {
      showApiError(error);
    }
  };

  if (userPermissionsQuery.isLoading || groupPermissionsQuery.isLoading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center text-sm text-text-muted">
        正在加载权限...
      </div>
    );
  }

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
              <h3 className="text-sm font-semibold text-foreground">
                {modulePresentation.label}
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {section.permissions.map((permission) => {
                const checked = permissionCodeSet.has(permission.code);
                // 角色基础权限是下限，用户页不可关闭
                const disabled = !canUpdate || isSaving || basePermissionCodeSet.has(permission.code);

                return (
                  <div
                    key={permission.code}
                    className={cn(
                      'flex min-h-[72px] items-center justify-between gap-3 rounded-[18px] border border-border/70 bg-white p-4',
                      disabled && 'opacity-55',
                    )}
                  >
                    <p className="line-clamp-1 min-w-0 flex-1 text-sm font-semibold leading-6 text-slate-800">
                      {permission.name}
                    </p>
                    <ToggleSwitch
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={(nextChecked) => {
                        void handlePermissionToggle(permission.code, nextChecked);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
