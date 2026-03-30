import { useEffect, useMemo, useState } from 'react';
import { X, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { PermissionCatalogItem, RoleCode } from '@/types/api';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { showApiError } from '@/utils/error-handler';
import {
  usePermissionCatalog,
  useReplaceRolePermissionTemplate,
  useRolePermissionTemplate,
} from '../api/authorization';
import { isPermissionLockedForRole } from '../constants/permission-constraints';
import { getModulePresentation } from '../constants/permission-presentation';

const ROLE_ORDER: RoleCode[] = ['STUDENT', 'MENTOR', 'DEPT_MANAGER', 'TEAM_MANAGER', 'ADMIN'];
const ROLE_LABELS: Record<RoleCode, string> = {
  STUDENT: '学员',
  MENTOR: '导师',
  DEPT_MANAGER: '室经理',
  TEAM_MANAGER: '团队经理',
  ADMIN: '管理员',
  SUPER_ADMIN: '超管',
};

interface RolePermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RolePermissionDialog: React.FC<RolePermissionDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { hasPermission, refreshUser } = useAuth();
  const canViewRoleTemplate = hasPermission('authorization.role_template.view') || hasPermission('authorization.role_template.update');
  const canUpdateRoleTemplate = hasPermission('authorization.role_template.update');

  const [selectedRole, setSelectedRole] = useState<RoleCode>('STUDENT');
  const [selectedRolePermissionCodes, setSelectedRolePermissionCodes] = useState<string[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('');

  const { data: permissionCatalog = [] } = usePermissionCatalog(undefined, canViewRoleTemplate && open);
  const permissionByCode = useMemo(() => {
    const permissionMap = new Map<string, { module: string }>();
    permissionCatalog.forEach((permission) => {
      permissionMap.set(permission.code, { module: permission.module });
    });
    return permissionMap;
  }, [permissionCatalog]);

  const roleTemplateQuery = useRolePermissionTemplate(selectedRole, canViewRoleTemplate && open);
  const replaceRoleTemplateMutation = useReplaceRolePermissionTemplate();

  useEffect(() => {
    if (roleTemplateQuery.data?.permission_codes) {
      setSelectedRolePermissionCodes(roleTemplateQuery.data.permission_codes);
    }
  }, [roleTemplateQuery.data]);

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
        selectedCount: permissions.filter((p) => selectedRolePermissionCodes.includes(p.code)).length,
      }))
      .sort((a, b) => {
        if (a.modulePresentation.order !== b.modulePresentation.order) {
          return a.modulePresentation.order - b.modulePresentation.order;
        }
        return a.modulePresentation.label.localeCompare(b.modulePresentation.label, 'zh-Hans-CN');
      });
  }, [permissionCatalog, selectedRolePermissionCodes]);

  const totalSelected = useMemo(
    () => groupedPermissions.reduce((sum, g) => sum + g.selectedCount, 0),
    [groupedPermissions],
  );

  const totalPermissions = useMemo(
    () => groupedPermissions.reduce((sum, g) => sum + g.permissions.length, 0),
    [groupedPermissions],
  );

  // 活动模块
  const activeModule = useMemo(() => {
    const modules = groupedPermissions.map((g) => g.module);
    if (selectedModule && modules.includes(selectedModule)) {
      return selectedModule;
    }
    return modules[0] ?? '';
  }, [groupedPermissions, selectedModule]);

  // 当前模块的权限列表
  const activeModulePermissions = useMemo(
    () => permissionCatalog.filter((p) => p.module === activeModule),
    [permissionCatalog, activeModule],
  );

  // 模块统计
  const moduleCounts = useMemo(() => {
    const counts: Record<string, { enabled: number; total: number }> = {};
    groupedPermissions.forEach((group) => {
      counts[group.module] = {
        enabled: group.selectedCount,
        total: group.permissions.length,
      };
    });
    return counts;
  }, [groupedPermissions]);

  const handleToggleRolePermission = (permissionCode: string, checked: boolean) => {
    const permission = permissionByCode.get(permissionCode);
    if (permission && isPermissionLockedForRole(selectedRole, permission)) {
      return;
    }

    setSelectedRolePermissionCodes((previousCodes) => {
      const codeSet = new Set(previousCodes);
      if (checked) {
        codeSet.add(permissionCode);
      } else {
        codeSet.delete(permissionCode);
      }
      return Array.from(codeSet).sort();
    });
  };

  const handleSaveRoleTemplate = async () => {
    if (!canUpdateRoleTemplate) return;
    try {
      await replaceRoleTemplateMutation.mutateAsync({
        roleCode: selectedRole,
        permissionCodes: selectedRolePermissionCodes,
      });
      toast.success(`${ROLE_LABELS[selectedRole]} 权限模板已更新`);
      await refreshUser();
      onOpenChange(false);
    } catch (error) {
      showApiError(error);
    }
  };

  if (!open) return null;

  if (!canViewRoleTemplate) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="relative w-full max-w-md rounded-3xl border border-border bg-background p-10 shadow-2xl">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-5 top-5 rounded-lg p-2 text-text-muted transition-all hover:bg-muted hover:text-foreground hover:rotate-90"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="rounded-full bg-rose-500/10 p-5 border border-rose-500/20">
              <Shield className="h-10 w-10 text-rose-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground tracking-tight">权限不足</h3>
              <p className="mt-2 text-sm text-text-muted font-medium">
                当前账号没有角色模板配置权限，请联系管理员开通。
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
      <div className="relative w-full max-w-6xl max-h-[90vh] rounded-3xl border border-slate-200/60 bg-white shadow-[0_20px_60px_rgb(0,0,0,0.15)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-slate-100 px-8 py-4 bg-gradient-to-b from-slate-50/50 to-transparent">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.15)]">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground tracking-tight">角色权限配置</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">ROLE TEMPLATE</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl p-2.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 hover:rotate-90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Role Selector */}
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-4">
          <div className="inline-flex items-center gap-3 rounded-xl bg-white p-1.5 shadow-sm border border-slate-200/60">
            {ROLE_ORDER.map((roleCode) => (
              <button
                key={roleCode}
                type="button"
                onClick={() => setSelectedRole(roleCode)}
                className={cn(
                  'relative rounded-lg px-5 py-2 text-[13px] font-bold whitespace-nowrap transition-all duration-500',
                  selectedRole === roleCode
                    ? 'bg-primary text-white shadow-[0_4px_12px_rgba(var(--primary),0.3)]'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50',
                )}
              >
                {ROLE_LABELS[roleCode]}
                {selectedRole === roleCode && (
                  <div className="absolute inset-0 rounded-lg bg-primary/20 blur-md scale-110 pointer-events-none animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {roleTemplateQuery.isLoading ? (
            <div className="flex flex-1 items-center justify-center gap-3 text-slate-400">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
              <span className="text-sm font-bold">正在同步权限架构...</span>
            </div>
          ) : (
            <>
              {/* Sidebar */}
              <aside className="w-52 border-r border-slate-100 bg-slate-50 p-4 overflow-y-auto">
                <div className="space-y-0.5">
                  {groupedPermissions.map((group) => {
                    const isActive = activeModule === group.module;
                    const count = moduleCounts[group.module];
                    const hasEnabled = count && count.enabled > 0;

                    return (
                      <button
                        key={group.module}
                        type="button"
                        onClick={() => setSelectedModule(group.module)}
                        className={cn(
                          'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-all duration-200',
                          isActive
                            ? 'bg-primary text-white'
                            : 'text-text-muted hover:bg-white hover:text-foreground',
                        )}
                      >
                        <span className="truncate">{group.modulePresentation.label}</span>
                        <span
                          className={cn(
                            'shrink-0 text-[11px] tabular-nums',
                            isActive
                              ? 'text-white/80'
                              : hasEnabled
                                ? 'font-semibold text-primary'
                                : 'text-text-muted',
                          )}
                        >
                          {count?.enabled ?? 0}/{count?.total ?? 0}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              {/* Main Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeModulePermissions.length === 0 ? (
                  <div className="py-12 text-center text-sm font-medium text-slate-400">
                    当前模块暂无可配置权限
                  </div>
                ) : (
                  <>
                    {/* Module locked warning */}
                    {activeModulePermissions.every((p) => isPermissionLockedForRole(selectedRole, p)) && (
                      <div className="mb-4 rounded-2xl border border-amber-200/60 bg-amber-50/30 px-5 py-3">
                        <p className="text-xs font-bold text-amber-600">
                          配置管理模块仅支持在管理员角色下配置，当前角色已锁定为只读。
                        </p>
                      </div>
                    )}

                    {/* Permission Cards Grid */}
                    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                      {activeModulePermissions.map((permission) => {
                        const isChecked = selectedRolePermissionCodes.includes(permission.code);
                        const isDisabled = !canUpdateRoleTemplate || isPermissionLockedForRole(selectedRole, permission);

                        return (
                          <label
                            key={permission.code}
                            className={cn(
                              "group flex items-center justify-between gap-4 rounded-2xl border border-slate-200/60 bg-white px-5 py-4 cursor-pointer transition-all duration-300",
                              "hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-slate-300/60",
                              !isChecked && "opacity-60",
                              isDisabled && "cursor-not-allowed opacity-40"
                            )}
                          >
                            <div className="flex-1 space-y-1.5">
                              <div className={cn(
                                "text-[13px] font-bold tracking-tight transition-colors",
                                isChecked ? "text-slate-700" : "text-slate-400"
                              )}>
                                {permission.name}
                              </div>
                              <div className="text-[11px] text-slate-400 line-clamp-1">
                                {permission.description || permission.code}
                              </div>
                            </div>

                            {/* iOS-style Switch */}
                            <div
                              onClick={(e) => {
                                e.preventDefault();
                                if (!isDisabled) handleToggleRolePermission(permission.code, !isChecked);
                              }}
                              className={cn(
                                "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-all duration-500 ease-in-out",
                                isChecked ? "bg-primary" : "bg-slate-200",
                                isDisabled && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <span
                                className={cn(
                                  "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform duration-500 ease-in-out",
                                  isChecked ? "translate-x-[1.15rem]" : "translate-x-0.5"
                                )}
                              />
                              {isChecked && (
                                <div className="absolute inset-0 rounded-full bg-primary/20 blur-md scale-110 pointer-events-none animate-pulse" />
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer with Stats & Save Button */}
        <div className="border-t border-slate-100 bg-slate-50 px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-left">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">已选权限</div>
              <div className="text-lg font-black tabular-nums">
                <span className="text-primary">{totalSelected}</span>
                <span className="text-slate-300 text-sm">/{totalPermissions}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveRoleTemplate}
              disabled={!canUpdateRoleTemplate || roleTemplateQuery.isLoading || replaceRoleTemplateMutation.isPending}
              className={cn(
                "rounded-xl px-6 py-2.5 text-sm font-bold transition-all duration-300",
                "bg-primary text-white shadow-[0_4px_12px_rgba(var(--primary),0.3)] hover:shadow-[0_6px_16px_rgba(var(--primary),0.4)] hover:scale-105",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              )}
            >
              {replaceRoleTemplateMutation.isPending ? '保存中' : '保存模板'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
