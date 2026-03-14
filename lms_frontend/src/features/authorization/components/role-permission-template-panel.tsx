import { useMemo, useState } from 'react';
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
          const groupName = presentation.pageLabel.split(' / ')[0] || presentation.pageLabel;

          if (!pageGroups[groupName]) {
            pageGroups[groupName] = [];
          }
          pageGroups[groupName].push({
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

  const [selectedModuleKey, setSelectedModuleKey] = useState<string | null>(null);

  const activeGroup = useMemo(() => {
    return groupedPermissions.find((g) => g.module === selectedModuleKey) || groupedPermissions[0];
  }, [groupedPermissions, selectedModuleKey]);

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
    <div className="flex flex-col gap-6">
      {/* 顶部控制栏：合并角色切换与保存按钮 */}
      <section className="sticky top-0 z-10 flex flex-col gap-4 rounded-xl border border-border bg-background/95 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full overflow-x-auto sm:w-auto">
          <div className="flex w-full min-w-max rounded-lg bg-muted/50 p-1">
            {ROLE_ORDER.map((roleCode) => (
              <button
                key={roleCode}
                type="button"
                onClick={() => onRoleChange(roleCode)}
                className={cn(
                  'flex-1 rounded-md px-5 py-2 text-sm font-medium transition-all sm:flex-none',
                  selectedRole === roleCode
                    ? 'bg-background text-primary shadow-sm'
                    : 'text-text-muted hover:text-foreground',
                )}
              >
                {ROLE_LABELS[roleCode]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-xs text-text-muted md:block">
            按模块与页面配置该角色的默认权限点
          </div>
          <Button
            type="button"
            onClick={onSave}
            disabled={!canUpdateRoleTemplate || isLoadingTemplate || isSaving}
            className="w-full bg-primary text-white shadow-sm hover:bg-primary-hover sm:w-auto"
          >
            {isSaving ? '保存中...' : '保存模板'}
          </Button>
        </div>
      </section>

      {isLoadingTemplate ? (
        <div className="rounded-xl border border-border bg-muted/30 px-6 py-12 text-center text-sm text-text-muted">
          正在加载角色配置...
        </div>
      ) : activeGroup ? (
        <section className="flex flex-col md:flex-row gap-6">
          {/* 左侧模块菜单 */}
          <div className="w-full md:w-56 lg:w-64 shrink-0 flex flex-col gap-1.5 p-3 bg-muted/30 rounded-2xl border border-border/60">
            <div className="px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              功能模块
            </div>
            {groupedPermissions.map((g) => {
              const isActive = activeGroup.module === g.module;
              return (
                <button
                  key={g.module}
                  type="button"
                  onClick={() => setSelectedModuleKey(g.module)}
                  className={cn(
                    "flex items-center justify-between px-3.5 py-3 rounded-xl text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isActive
                      ? "bg-background text-primary shadow-sm font-semibold ring-1 ring-border"
                      : "text-foreground hover:bg-muted/60"
                  )}
                >
                  <span>{g.modulePresentation.label}</span>
                  {g.selectedCount > 0 ? (
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-bold ml-2",
                      isActive ? "bg-primary/10 text-primary" : "bg-muted-foreground/10 text-muted-foreground"
                    )}>
                      {g.selectedCount}/{g.permissions.length}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/40 ml-2 font-medium">0/{g.permissions.length}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 右侧选定模块权限明细 */}
          <div className="flex-1 min-w-0 flex flex-col bg-background rounded-2xl border border-border overflow-hidden shadow-sm">
            {/* 右侧头部 */}
            <div className="flex flex-col gap-3 border-b border-border bg-muted/10 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {activeGroup.modulePresentation.label}配置
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {activeGroup.modulePresentation.summary}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-border px-4 text-xs font-semibold"
                  disabled={!canUpdateRoleTemplate || activeGroup.selectedCount === activeGroup.permissions.length}
                  onClick={() => toggleModulePermissions(activeGroup.permissions, true)}
                >
                  全选
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-border px-4 text-xs font-semibold"
                  disabled={!canUpdateRoleTemplate || activeGroup.selectedCount === 0}
                  onClick={() => toggleModulePermissions(activeGroup.permissions, false)}
                >
                  清空
                </Button>
              </div>
            </div>

            {/* 右侧权限列表 */}
            <div className="flex-1 p-6">
              <div className="flex flex-col gap-7">
                {activeGroup.pageGroups.map(([groupName, items]) => (
                  <div key={groupName} className="space-y-3.5">
                    {activeGroup.pageGroups.length > 1 && (
                      <div className="flex items-center gap-2.5">
                        <div className="h-4 w-1.5 rounded-full bg-primary/40" />
                        <h4 className="text-[14px] font-bold tracking-wide text-foreground/90">
                          {groupName}
                        </h4>
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {items.map(({ permission, detail }) => {
                        const isSelected = selectedCodes.includes(permission.code);
                        return (
                          <label
                            key={permission.code}
                            className={cn(
                              'group flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all duration-200',
                              isSelected
                                ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/20 hover:bg-primary/10'
                                : 'border-border/60 bg-background hover:border-border hover:bg-muted/30 hover:shadow-sm',
                            )}
                          >
                            <Checkbox
                              checked={isSelected}
                              disabled={!canUpdateRoleTemplate}
                              onCheckedChange={(checked) => onToggleCode(permission.code, checked === true)}
                              className={cn(
                                "mt-0.5 shadow-none transition-colors",
                                !isSelected && "border-muted-foreground/40 group-hover:border-primary/50"
                              )}
                            />
                            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                              <span
                                className={cn(
                                  'text-[13px] font-semibold leading-none tracking-tight transition-colors',
                                  isSelected ? 'text-primary' : 'text-foreground group-hover:text-primary/90',
                                )}
                              >
                                {permission.name}
                              </span>
                              <span className="line-clamp-2 text-[12px] leading-relaxed text-muted-foreground/90">
                                {detail}
                              </span>
                              <span className="mt-1 text-[10px] font-mono leading-none text-muted-foreground/40">
                                {permission.code}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
};
