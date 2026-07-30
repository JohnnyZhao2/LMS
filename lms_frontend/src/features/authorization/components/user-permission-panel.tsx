import { useMemo, useState, type ReactNode } from 'react';
import { KeyRound } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import {
  USER_PERMISSION_UPDATE_PERMISSION,
  USER_PERMISSION_VIEW_PERMISSION,
} from '@/config/permission-constants';
import { AUTH_ROLES } from '@/config/role-constants';
import { UserAvatar } from '@/entities/user/components/user-avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/session/auth/auth-context';
import type { RoleCode, UserList } from '@/types/common';
import { showApiError } from '@/utils/error-handler';
import type { PermissionCatalogItem } from '../api/authorization-api';
import {
  useGrantUserPermission,
  usePermissionCatalog,
  useRevokeUserPermission,
  useUserPermissions,
} from '../api/authorization-queries';

interface ModulePresentationMeta {
  label: string;
  order: number;
}

const MODULE_PRESENTATION: Record<string, ModulePresentationMeta> = {
  task: { label: '任务管理', order: 10 },
  knowledge: { label: '知识管理', order: 20 },
  tag: { label: '标签管理', order: 25 },
  quiz: { label: '试卷管理', order: 30 },
  question: { label: '题库管理', order: 40 },
  grading: { label: '阅卷中心', order: 50 },
  spot_check: { label: '抽查管理', order: 60 },
  user: { label: '用户管理', order: 70 },
  config: { label: '系统配置', order: 80 },
  log_management: { label: '日志管理', order: 85 },
};

const getModulePresentation = (moduleCode: string): ModulePresentationMeta => (
  MODULE_PRESENTATION[moduleCode] ?? {
    label: moduleCode,
    order: 999,
  }
);

interface PermissionModuleSection {
  module: string;
  permissions: PermissionCatalogItem[];
}

const buildPermissionModuleSections = (
  permissionCatalog: PermissionCatalogItem[],
): PermissionModuleSection[] => {
  const groupedPermissions = new Map<string, PermissionCatalogItem[]>();

  permissionCatalog.forEach((permission) => {
    const currentPermissions = groupedPermissions.get(permission.module) ?? [];
    groupedPermissions.set(permission.module, [...currentPermissions, permission]);
  });

  return Array.from(groupedPermissions.entries())
    .map(([module, permissions]) => ({ module, permissions }))
    .sort((left, right) => {
      const leftPresentation = getModulePresentation(left.module);
      const rightPresentation = getModulePresentation(right.module);
      if (leftPresentation.order !== rightPresentation.order) {
        return leftPresentation.order - rightPresentation.order;
      }
      return leftPresentation.label.localeCompare(rightPresentation.label, 'zh-Hans-CN');
    });
};

interface PermissionToggleCardProps {
  permission: PermissionCatalogItem;
  checked: boolean;
  disabled?: boolean;
  isSaving?: boolean;
  onToggle: (nextChecked: boolean) => void | Promise<void>;
}

const PermissionToggleCard = ({
  permission,
  checked,
  disabled = false,
  isSaving = false,
  onToggle,
}: PermissionToggleCardProps) => {
  const helperText = permission.constraint_summary || (
    permission.description && permission.description !== permission.name
      ? permission.description
      : ''
  );

  const handleToggle = () => {
    if (disabled) {
      return;
    }
    onToggle(!checked);
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={checked}
      onClick={handleToggle}
      onKeyDown={(event) => {
        if (disabled) {
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggle(!checked);
        }
      }}
      className={cn(
        'group relative flex min-h-[92px] flex-col gap-3 rounded-[18px] border border-border/70 bg-white p-4 transition-colors duration-200',
        disabled && 'cursor-not-allowed opacity-55 hover:translate-y-0 hover:shadow-none',
        !disabled && 'hover:bg-muted/25',
      )}
    >
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="min-w-0">
            <p className="line-clamp-1 text-sm font-semibold leading-6 text-slate-800">
              {permission.name}
            </p>
          </div>
          <div className="h-5 min-w-0">
            {helperText ? (
              <p className="line-clamp-1 text-[12px] leading-5 text-slate-400">
                {helperText}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          <ToggleSwitch
            checked={checked}
            disabled={disabled || isSaving}
            onCheckedChange={(nextChecked) => { void onToggle(nextChecked); }}
          />
        </div>
      </div>
    </div>
  );
};

interface PermissionModuleSectionsProps {
  sections: PermissionModuleSection[];
  renderPermissionCard: (permission: PermissionCatalogItem) => ReactNode;
  emptyText?: string;
}

const PermissionModuleSections = ({
  sections,
  renderPermissionCard,
  emptyText = '当前模块暂无可配置权限',
}: PermissionModuleSectionsProps) => {
  if (sections.length === 0) {
    return (
      <div className="py-12 text-center text-sm font-medium text-slate-400">
        暂无模块数据
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {sections.map((section) => {
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

            {section.permissions.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {section.permissions.map((permission) => renderPermissionCard(permission))}
              </div>
            ) : (
              <div className="py-12 text-center text-sm font-medium text-slate-400">
                {emptyText}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

const PermissionEmptyState = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="flex h-full min-h-full items-center justify-center">
    <EmptyState
      icon={KeyRound}
      title={title}
      description={description}
      className="py-0"
    />
  </div>
);

interface UserPermissionPanelProps {
  userDetail?: UserList;
  selectedRoleCodes: RoleCode[];
  isLoading?: boolean;
}

/**
 * 用户权限配置面板：人员信息 + 模块权限开关。
 */
export function UserPermissionPanel({
  userDetail,
  selectedRoleCodes,
  isLoading = false,
}: UserPermissionPanelProps) {
  const { hasCapability, refreshUser, user } = useAuth();
  const [savingPermissionCode, setSavingPermissionCode] = useState<string | null>(null);
  const canView = hasCapability(USER_PERMISSION_VIEW_PERMISSION);
  const canManage = hasCapability(USER_PERMISSION_UPDATE_PERMISSION);
  const hasManagementRole = !userDetail?.is_superuser
    && selectedRoleCodes.some((roleCode) => AUTH_ROLES.includes(roleCode));
  const shouldLoad = Boolean(userDetail?.id) && canView && hasManagementRole;

  const { data: permissionCatalog = [] } = usePermissionCatalog({}, canView);
  const { data: userPermissions } = useUserPermissions(userDetail?.id ?? null, shouldLoad);
  const grantPermission = useGrantUserPermission();
  const revokePermission = useRevokeUserPermission();
  const checkedPermissionCodes = useMemo(
    () => new Set(userPermissions?.permission_codes ?? []),
    [userPermissions],
  );
  const moduleSections = useMemo(
    () => buildPermissionModuleSections(permissionCatalog),
    [permissionCatalog],
  );

  const headerMeta = [
    userDetail?.employee_id || '未填写工号',
    userDetail?.department?.name,
  ].filter(Boolean).join(' · ');

  const handleToggle = async (permissionCode: string, nextChecked: boolean) => {
    if (!userDetail?.id || !canManage || savingPermissionCode) {
      return;
    }
    setSavingPermissionCode(permissionCode);
    try {
      const payload = { userId: userDetail.id, permissionCode };
      if (nextChecked) {
        await grantPermission.mutateAsync(payload);
      } else {
        await revokePermission.mutateAsync(payload);
      }
      if (user?.id === userDetail.id) {
        await refreshUser();
      }
    } catch (error) {
      showApiError(error);
    } finally {
      setSavingPermissionCode(null);
    }
  };

  return (
    <Spinner spinning={isLoading} className="min-h-0 flex-1">
      {!userDetail ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <EmptyState
            icon={KeyRound}
            description="请选择一个角色成员开始配置权限。"
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-4 border-b-0 px-0 py-0 pb-4">
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar
                avatarKey={userDetail.avatar_key}
                name={userDetail.username}
                size="md"
                className="h-9 w-9 shrink-0"
              />
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-foreground">{userDetail.username}</h2>
                <p className="truncate text-xs text-text-muted">{headerMeta}</p>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-0 pt-0 pb-0">
            {!canView ? null : !hasManagementRole ? (
              <PermissionEmptyState
                title={userDetail.is_superuser ? '超级管理员无需配置权限' : '当前仅学员角色'}
                description={userDetail.is_superuser ? '系统权限自动生效。' : '请先分配管理角色。'}
              />
            ) : (
              <div className="mt-6">
                <PermissionModuleSections
                  sections={moduleSections}
                  renderPermissionCard={(permission) => (
                    <PermissionToggleCard
                      key={permission.code}
                      permission={permission}
                      checked={checkedPermissionCodes.has(permission.code)}
                      disabled={!canManage || savingPermissionCode !== null}
                      isSaving={savingPermissionCode === permission.code}
                      onToggle={(nextChecked) => handleToggle(permission.code, nextChecked)}
                    />
                  )}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </Spinner>
  );
}
