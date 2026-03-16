import { useMemo, useState } from 'react';
import { CheckCheck, XCircle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PermissionCatalogItem, RoleCode } from '@/types/api';
import { UserPermissionModuleSidebar } from '@/features/users/components/user-permission-module-sidebar';

import {
  getModulePresentation,
  getPermissionPresentation,
} from '../constants/permission-presentation';
import { RolePermissionCard } from './role-permission-card';

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
      .map(([module, permissions]) => ({
        module,
        permissions,
        modulePresentation: getModulePresentation(module),
        selectedCount: permissions.filter((p) => selectedCodes.includes(p.code)).length,
      }))
      .sort((a, b) => {
        if (a.modulePresentation.order !== b.modulePresentation.order) {
          return a.modulePresentation.order - b.modulePresentation.order;
        }
        return a.modulePresentation.label.localeCompare(b.modulePresentation.label, 'zh-Hans-CN');
      });
  }, [permissionCatalog, selectedCodes]);

  const totalSelected = useMemo(
    () => groupedPermissions.reduce((sum, g) => sum + g.selectedCount, 0),
    [groupedPermissions],
  );

  const totalPermissions = useMemo(
    () => groupedPermissions.reduce((sum, g) => sum + g.permissions.length, 0),
    [groupedPermissions],
  );

  const permissionModules = useMemo(
    () => groupedPermissions.map((g) => g.module),
    [groupedPermissions],
  );

  const moduleCounts = useMemo(
    () => Object.fromEntries(
      groupedPermissions.map((g) => [
        g.module,
        { enabled: g.selectedCount, total: g.permissions.length },
      ]),
    ),
    [groupedPermissions],
  );

  const [activeModule, setActiveModule] = useState<string | null>(null);

  const activeGroup = useMemo(
    () => groupedPermissions.find((g) => g.module === activeModule) || groupedPermissions[0],
    [groupedPermissions, activeModule],
  );

  const activeItems = useMemo(() => {
    if (!activeGroup) return [];
    return activeGroup.permissions.map((permission) => ({
      permission,
      detail: getPermissionPresentation(permission).detail,
    }));
  }, [activeGroup]);

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
      <div className="rounded-lg border border-border bg-muted p-6">
        <p className="text-sm text-text-muted">当前角色没有"角色权限模板管理"权限。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 顶部控制栏：角色切换 + 操作 */}
      <section className="sticky top-0 z-10 rounded-lg border border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          {/* 角色切换 */}
          <div className="flex items-center gap-1 overflow-x-auto rounded-md bg-muted p-0.5">
            {ROLE_ORDER.map((roleCode) => (
              <button
                key={roleCode}
                type="button"
                onClick={() => onRoleChange(roleCode)}
                className={cn(
                  'relative rounded-md px-4 py-1.5 text-[13px] font-medium whitespace-nowrap transition-all duration-200',
                  selectedRole === roleCode
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-text-muted hover:text-foreground',
                )}
              >
                {ROLE_LABELS[roleCode]}
              </button>
            ))}
          </div>

          {/* 统计 + 保存 */}
          <div className="flex items-center gap-3">
            <span className="text-xs tabular-nums text-text-muted">
              已选 <span className="font-semibold text-foreground">{totalSelected}</span>
              <span className="text-text-muted">/{totalPermissions}</span> 项权限
            </span>
            <Button
              type="button"
              onClick={onSave}
              disabled={!canUpdateRoleTemplate || isLoadingTemplate || isSaving}
              size="sm"
              className="bg-primary text-white hover:bg-primary-hover"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  保存中
                </>
              ) : (
                '保存模板'
              )}
            </Button>
          </div>
        </div>
      </section>

      {isLoadingTemplate ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 px-6 py-16 text-sm text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在加载角色配置...
        </div>
      ) : activeGroup ? (
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[180px_1fr]">
          {/* 左侧模块侧边栏 */}
          <UserPermissionModuleSidebar
            permissionModules={permissionModules}
            activePermissionModule={activeGroup.module}
            moduleCounts={moduleCounts}
            onSelectModule={setActiveModule}
          />

          {/* 右侧权限区域 */}
          <div className="space-y-4">
            {/* 模块标题 + 批量操作 */}
            <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {activeGroup.modulePresentation.label}
                </h3>
                <p className="mt-0.5 text-[12px] text-text-muted">
                  {activeGroup.modulePresentation.summary}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium text-text-muted transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                  disabled={!canUpdateRoleTemplate || activeGroup.selectedCount === activeGroup.permissions.length}
                  onClick={() => toggleModulePermissions(activeGroup.permissions, true)}
                >
                  <CheckCheck className="h-3 w-3" />
                  全选
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium text-text-muted transition-colors hover:bg-destructive-50 hover:text-destructive disabled:opacity-40"
                  disabled={!canUpdateRoleTemplate || activeGroup.selectedCount === 0}
                  onClick={() => toggleModulePermissions(activeGroup.permissions, false)}
                >
                  <XCircle className="h-3 w-3" />
                  清空
                </button>
              </div>
            </div>

            {/* 权限卡片网格 */}
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 2xl:grid-cols-3">
              {activeItems.map(({ permission, detail }) => (
                <RolePermissionCard
                  key={permission.code}
                  permission={permission}
                  detail={detail}
                  checked={selectedCodes.includes(permission.code)}
                  disabled={!canUpdateRoleTemplate}
                  onToggle={(checked) => onToggleCode(permission.code, checked)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
