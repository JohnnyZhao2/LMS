import { useMemo } from 'react';
import { Shield } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PermissionCatalogItem, RoleCode } from '@/types/api';
import {
  getModulePresentation,
  getPermissionPresentation,
} from '../constants/permission-presentation';

const ROLE_ORDER: RoleCode[] = ['STUDENT', 'MENTOR', 'DEPT_MANAGER', 'TEAM_MANAGER', 'ADMIN'];
const ROLE_LABELS: Record<RoleCode, string> = {
  STUDENT: '学员',
  MENTOR: '导师',
  DEPT_MANAGER: '室经理',
  TEAM_MANAGER: '团队经理',
  ADMIN: '管理员',
};

interface RolePermissionTemplatePanelProps {
  canViewRoleTemplate: boolean;
  canUpdateRoleTemplate: boolean;
  selectedRole: RoleCode;
  onRoleChange: (roleCode: RoleCode) => void;
  permissionCatalog: PermissionCatalogItem[];
  selectedCodes: string[];
  onToggleCode: (permissionCode: string, checked: boolean) => void;
  onSave: () => void;
  isLoadingTemplate: boolean;
  isSaving: boolean;
}

export const RolePermissionTemplatePanel: React.FC<RolePermissionTemplatePanelProps> = ({
  canViewRoleTemplate,
  canUpdateRoleTemplate,
  selectedRole,
  onRoleChange,
  permissionCatalog,
  selectedCodes,
  onToggleCode,
  onSave,
  isLoadingTemplate,
  isSaving,
}) => {
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, PermissionCatalogItem[]> = {};
    permissionCatalog.forEach((permission) => {
      if (!groups[permission.module]) {
        groups[permission.module] = [];
      }
      groups[permission.module].push(permission);
    });
    return Object.entries(groups)
      .map(([module, permissions]) => {
        const pageGroups: Record<string, Array<{
          permission: PermissionCatalogItem;
          detail: string;
        }>> = {};

        permissions.forEach((permission) => {
          const presentation = getPermissionPresentation(permission);
          if (!pageGroups[presentation.pageLabel]) {
            pageGroups[presentation.pageLabel] = [];
          }
          pageGroups[presentation.pageLabel].push({
            permission,
            detail: presentation.detail,
          });
        });

        return {
          module,
          permissions,
          modulePresentation: getModulePresentation(module),
          selectedCount: permissions.filter((permission) => selectedCodes.includes(permission.code)).length,
          pageGroups: Object.entries(pageGroups),
        };
      })
      .sort((a, b) => {
        if (a.modulePresentation.order !== b.modulePresentation.order) {
          return a.modulePresentation.order - b.modulePresentation.order;
        }
        return a.modulePresentation.label.localeCompare(b.modulePresentation.label, 'zh-Hans-CN');
      });
  }, [permissionCatalog, selectedCodes]);

  const toggleModulePermissions = (permissions: PermissionCatalogItem[], checked: boolean) => {
    permissions.forEach((permission) => {
      const isChecked = selectedCodes.includes(permission.code);
      if (isChecked !== checked) {
        onToggleCode(permission.code, checked);
      }
    });
  };

  if (!canViewRoleTemplate) {
    return (
      <div className="rounded-xl border border-border bg-muted p-6">
        <p className="text-sm text-text-muted">当前角色没有“角色权限模板管理”权限。</p>
      </div>
    );
  }

  return (
    <section className="space-y-5 rounded-2xl border border-border bg-background p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-foreground">
            <Shield className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">角色权限模板</h2>
          </div>
          <p className="text-xs text-text-muted">按“模块 / 页面层级 / 权限点”配置角色模板，避免只看权限码硬猜。</p>
        </div>
        <Button
          type="button"
          onClick={onSave}
          disabled={!canUpdateRoleTemplate || isLoadingTemplate || isSaving}
          className="bg-primary text-white hover:bg-primary-hover"
        >
          {isSaving ? '保存中...' : '保存模板'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-2 md:grid-cols-5">
        {ROLE_ORDER.map((roleCode) => (
          <button
            key={roleCode}
            type="button"
            onClick={() => onRoleChange(roleCode)}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-semibold transition-colors',
              selectedRole === roleCode
                ? 'bg-primary text-white'
                : 'bg-background text-text-muted hover:text-foreground',
            )}
          >
            {ROLE_LABELS[roleCode]}
          </button>
        ))}
      </div>

      {isLoadingTemplate ? (
        <div className="rounded-xl border border-border bg-muted px-4 py-6 text-sm text-text-muted">
          正在加载当前角色权限模板...
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groupedPermissions.map(({ module, permissions, modulePresentation, selectedCount, pageGroups }) => {
            const allSelected = selectedCount === permissions.length;

            return (
              <div key={module} className="rounded-2xl border border-border bg-muted/50 p-4">
                <div className="flex flex-col gap-4 border-b border-border pb-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-foreground">{modulePresentation.label}</h3>
                      <p className="text-xs leading-relaxed text-text-muted">{modulePresentation.summary}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-background px-3 py-1 text-[11px] font-bold text-text-muted">
                        {selectedCount}/{permissions.length} 已选
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs"
                        disabled={!canUpdateRoleTemplate}
                        onClick={() => toggleModulePermissions(permissions, true)}
                      >
                        全选
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs"
                        disabled={!canUpdateRoleTemplate || !selectedCount}
                        onClick={() => toggleModulePermissions(permissions, false)}
                      >
                        清空
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-dashed border-border bg-background px-3 py-2 text-[11px] text-text-muted">
                    当前模块状态：{allSelected ? '已全选' : selectedCount === 0 ? '未配置' : '部分配置'}
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  {pageGroups.map(([pageLabel, items]) => (
                    <div key={pageLabel} className="rounded-xl border border-border bg-background p-3">
                      <div className="mb-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">{pageLabel}</p>
                      </div>
                      <div className="space-y-2">
                        {items.map(({ permission, detail }) => (
                          <label
                            key={permission.code}
                            className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent bg-muted/40 px-3 py-3 hover:border-border"
                          >
                            <Checkbox
                              checked={selectedCodes.includes(permission.code)}
                              disabled={!canUpdateRoleTemplate}
                              onCheckedChange={(checked) => onToggleCode(permission.code, checked === true)}
                            />
                            <span className="space-y-1">
                              <span className="block text-sm font-medium text-foreground">{permission.name}</span>
                              <span className="block text-xs leading-relaxed text-text-muted">{detail}</span>
                              <span className="block text-[11px] font-mono text-text-muted">{permission.code}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
