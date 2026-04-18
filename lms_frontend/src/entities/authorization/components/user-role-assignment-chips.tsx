import { X } from 'lucide-react';
import { ASSIGNABLE_ROLES, getRoleColor } from '@/lib/role-config';
import { cn } from '@/lib/utils';
import type { RoleCode } from '@/types/common';
import { getSelectedBusinessRoleCode } from '@/entities/authorization/utils/user-role-assignment';

type RoleLike = {
  code: string;
};

interface UserRoleAssignmentChipsProps {
  roles: RoleLike[];
  roleNameMap: Map<string, string>;
  canManageRoles: boolean;
  isBusy: boolean;
  onToggleRole: (roleCode: RoleCode) => void;
  className?: string;
}

export function UserRoleAssignmentChips({
  roles,
  roleNameMap,
  canManageRoles,
  isBusy,
  onToggleRole,
  className,
}: UserRoleAssignmentChipsProps) {
  const selectedBusinessRoleCode = getSelectedBusinessRoleCode(roles);
  const hasStudentRole = roles.some((role) => role.code === 'STUDENT');
  const currentAssignedRoleTags: Array<{ code: RoleCode; name: string }> = [];

  if (hasStudentRole) {
    currentAssignedRoleTags.push({
      code: 'STUDENT',
      name: roleNameMap.get('STUDENT') ?? '学员',
    });
  }
  if (selectedBusinessRoleCode) {
    currentAssignedRoleTags.push({
      code: selectedBusinessRoleCode,
      name: roleNameMap.get(selectedBusinessRoleCode) ?? selectedBusinessRoleCode,
    });
  }

  const remainingAssignableRoles = ASSIGNABLE_ROLES.filter((roleCode) => roleCode !== selectedBusinessRoleCode);

  return (
    <div className={cn('flex shrink-0 flex-wrap items-center gap-1.5', className)}>
      {currentAssignedRoleTags.map((role) => {
        const color = getRoleColor(role.code);
        const canClearRole = role.code === selectedBusinessRoleCode;
        if (canClearRole) {
          return (
            <button
              key={role.code}
              type="button"
              disabled={!canManageRoles || isBusy}
              onClick={() => { onToggleRole(role.code); }}
              aria-label={`取消${role.name}角色`}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors',
                color.bgClass,
                color.mutedTextClass,
                canManageRoles && !isBusy
                  ? 'cursor-pointer hover:brightness-95'
                  : 'cursor-not-allowed opacity-55',
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', color.iconBgClass ?? 'bg-current')} />
              {role.name}
              <X className="h-3 w-3 opacity-70" />
            </button>
          );
        }
        return (
          <span
            key={role.code}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold',
              color.bgClass,
              color.mutedTextClass,
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', color.iconBgClass ?? 'bg-current')} />
            {role.name}
          </span>
        );
      })}
      {currentAssignedRoleTags.length > 0 && remainingAssignableRoles.length > 0 ? (
        <span className="mx-1 h-4 w-px bg-border/80" />
      ) : null}
      {remainingAssignableRoles.map((roleCode) => {
        const active = selectedBusinessRoleCode === roleCode;
        const color = getRoleColor(roleCode);
        const roleName = roleNameMap.get(roleCode) ?? roleCode;
        const mutuallyExclusive = selectedBusinessRoleCode !== null && !active;
        return (
          <button
            key={roleCode}
            type="button"
            disabled={!canManageRoles || isBusy}
            onClick={() => { onToggleRole(roleCode); }}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors',
              active
                ? `${color.bgClass} ${color.mutedTextClass}`
                : mutuallyExclusive
                  ? 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                  : 'bg-white text-text-muted hover:bg-muted/35',
              (!canManageRoles || isBusy) && 'cursor-not-allowed opacity-55',
            )}
          >
            {active ? (
              <span className={cn('h-1.5 w-1.5 rounded-full', color.iconBgClass ?? 'bg-current')} />
            ) : null}
            {roleName}
          </button>
        );
      })}
    </div>
  );
}
