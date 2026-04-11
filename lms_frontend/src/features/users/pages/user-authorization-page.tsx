import * as React from 'react';
import { KeyRound, ShieldCheck, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { UserAvatar } from '@/components/common/user-avatar';
import { UserSelectList } from '@/components/common/user-select-list';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { PageFillShell, PageSplit, PageWorkbench } from '@/components/ui/page-shell';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/features/auth/stores/auth-context';
import { ASSIGNABLE_ROLES, getRoleColor } from '@/lib/role-config';
import { cn } from '@/lib/utils';
import { showApiError } from '@/utils/error-handler';
import type { RoleCode } from '@/types/common';

import { useDepartments, useRoles, useUserDetail, useUsers } from '../api/get-users';
import { useAssignRoles } from '../api/manage-users';
import { UserDirectoryFilters } from '../components/user-directory-filters';
import {
  UserPermissionSection,
} from '../components/user-permission-section';

export const UserAuthorizationPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = React.useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState<string>('all');
  const [pageContainerElement, setPageContainerElement] = React.useState<HTMLDivElement | null>(null);
  const [isAssigningRole, setIsAssigningRole] = React.useState(false);
  const { hasCapability } = useAuth();
  const assignRoles = useAssignRoles();

  const selectedUserIdParam = searchParams.get('user_id');
  const selectedUserId = selectedUserIdParam ? Number(selectedUserIdParam) : null;

  const { data: departments = [] } = useDepartments();
  const departmentSegmentOptions = React.useMemo(
    () => [
      { label: '全部', value: 'all' },
      ...departments.map((department) => ({
        label: department.name,
        value: department.id.toString(),
      })),
    ],
    [departments],
  );

  const departmentId = selectedDepartmentId !== 'all' ? Number(selectedDepartmentId) : undefined;
  const { data: users = [], isLoading: usersLoading } = useUsers({
    search: search.trim() || undefined,
    departmentId,
  });
  const { data: roles = [] } = useRoles();

  const authorizationUsers = React.useMemo(
    () => users.filter((user) => !user.is_superuser),
    [users],
  );
  const roleNameMap = React.useMemo(
    () => new Map(roles.map((role) => [role.code, role.name])),
    [roles],
  );

  const resolvedSelectedUserId = React.useMemo(() => {
    if (authorizationUsers.length === 0) {
      return null;
    }
    if (selectedUserId && authorizationUsers.some((user) => user.id === selectedUserId)) {
      return selectedUserId;
    }
    return authorizationUsers[0]?.id ?? null;
  }, [authorizationUsers, selectedUserId]);

  const { data: selectedUserDetail, isLoading: userDetailLoading } = useUserDetail(resolvedSelectedUserId ?? 0);
  const isLoading = resolvedSelectedUserId !== null && userDetailLoading;

  React.useEffect(() => {
    if (!resolvedSelectedUserId) {
      return;
    }
    if (String(resolvedSelectedUserId) === selectedUserIdParam) {
      return;
    }
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('user_id', String(resolvedSelectedUserId));
    setSearchParams(nextSearchParams, { replace: true });
  }, [resolvedSelectedUserId, searchParams, selectedUserIdParam, setSearchParams]);

  const handleSelectUser = (userId: number) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('user_id', String(userId));
    setSearchParams(nextSearchParams);
  };

  const selectedRoleCodes = React.useMemo<RoleCode[]>(
    () => selectedUserDetail?.roles
      .filter((role) => role.code !== 'STUDENT' && role.code !== 'SUPER_ADMIN')
      .map((role) => role.code as RoleCode) ?? [],
    [selectedUserDetail],
  );
  const selectedBusinessRoleCode = React.useMemo<RoleCode | null>(
    () => selectedRoleCodes[0] ?? null,
    [selectedRoleCodes],
  );
  const hasStudentRole = React.useMemo(
    () => selectedUserDetail?.roles.some((role) => role.code === 'STUDENT') ?? false,
    [selectedUserDetail],
  );
  const currentAssignedRoleTags = React.useMemo(
    () => {
      const tags: Array<{ code: RoleCode; name: string }> = [];
      if (hasStudentRole) {
        tags.push({
          code: 'STUDENT',
          name: roleNameMap.get('STUDENT') ?? '学员',
        });
      }
      if (selectedBusinessRoleCode) {
        tags.push({
          code: selectedBusinessRoleCode,
          name: roleNameMap.get(selectedBusinessRoleCode) ?? selectedBusinessRoleCode,
        });
      }
      return tags;
    },
    [hasStudentRole, roleNameMap, selectedBusinessRoleCode],
  );
  const remainingAssignableRoles = React.useMemo(
    () => ASSIGNABLE_ROLES.filter((roleCode) => roleCode !== selectedBusinessRoleCode),
    [selectedBusinessRoleCode],
  );
  const panelItems = React.useMemo(
    () => authorizationUsers.map((user) => ({
      id: user.id,
      name: user.username,
      avatarKey: user.avatar_key,
      meta: user.department?.name
        ? `${user.employee_id || '未填写工号'} · ${user.department.name}`
        : (user.employee_id || '未填写工号'),
    })),
    [authorizationUsers],
  );
  const handleRoleToggle = async (roleCode: RoleCode) => {
    if (!selectedUserDetail) {
      return;
    }
    const nextRoles = selectedBusinessRoleCode === roleCode ? [] : [roleCode];
    if (
      nextRoles.length === selectedRoleCodes.length
      && nextRoles.every((code) => selectedRoleCodes.includes(code))
    ) {
      return;
    }

    setIsAssigningRole(true);
    try {
      await assignRoles.mutateAsync({
        id: selectedUserDetail.id,
        roles: nextRoles,
      });
    } catch (error) {
      showApiError(error);
    } finally {
      setIsAssigningRole(false);
    }
  };

  return (
    <PageFillShell ref={setPageContainerElement} className="animate-fadeIn">
      <PageHeader
        title="用户授权"
        icon={<ShieldCheck className="h-5 w-5" />}
      />

      <PageWorkbench>
        <PageSplit className="min-h-0 flex-1 gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-white">
            <div className="border-b border-border/60 px-5 py-4">
              <div className="flex items-center gap-2 text-foreground">
                <Users className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">授权对象</h2>
              </div>
            </div>

            <UserDirectoryFilters
              departmentOptions={departmentSegmentOptions}
              selectedDepartmentId={selectedDepartmentId}
              onDepartmentChange={setSelectedDepartmentId}
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="检索姓名、工号"
              layout="stacked"
              className="space-y-0 px-4 py-4"
            />

            <UserSelectList
              items={panelItems}
              selectedIds={resolvedSelectedUserId ? [resolvedSelectedUserId] : []}
              onSelect={handleSelectUser}
              selectionMode="single"
              appearance="panel"
              emptyText="当前筛选下没有可授权用户。"
              isLoading={usersLoading}
              loadingText="加载用户中..."
              className="max-h-none"
              listClassName="space-y-2"
            />
          </section>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-white">
            <Spinner spinning={isLoading} className="min-h-0 flex-1">
              {!resolvedSelectedUserId || !selectedUserDetail ? (
                <div className="flex min-h-0 flex-1 items-center justify-center">
                  <EmptyState
                    icon={KeyRound}
                    description="请选择一个用户开始配置权限。"
                  />
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border/60 px-6 py-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar
                        avatarKey={selectedUserDetail.avatar_key}
                        name={selectedUserDetail.username}
                        size="md"
                        className="h-9 w-9 shrink-0"
                      />
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold text-foreground">{selectedUserDetail.username}</h2>
                        <p className="truncate text-xs text-text-muted">
                          {selectedUserDetail.employee_id || '未填写工号'}
                          {selectedUserDetail.department?.name ? ` · ${selectedUserDetail.department.name}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {currentAssignedRoleTags.map((role) => {
                        const color = getRoleColor(role.code);
                        return (
                          <span
                            key={role.code}
                            className={cn(
                              'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold',
                              color.bgClass,
                              color.textClass,
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
                            disabled={!hasCapability('user.authorize') || isAssigningRole}
                            onClick={() => { void handleRoleToggle(roleCode); }}
                            className={cn(
                              'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors',
                              active
                                ? `${color.bgClass} ${color.textClass}`
                                : mutuallyExclusive
                                  ? 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                                  : 'bg-white text-text-muted hover:bg-muted/35',
                              (!hasCapability('user.authorize') || isAssigningRole) && 'cursor-not-allowed opacity-55',
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
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-6">
                    <UserPermissionSection
                      key={selectedUserDetail.id}
                      userId={selectedUserDetail.id}
                      userDetail={selectedUserDetail}
                      departments={departments}
                      selectedRoleCodes={selectedRoleCodes}
                      departmentId={selectedUserDetail.department?.id}
                      isSuperuserAccount={Boolean(selectedUserDetail.is_superuser)}
                      dialogContentElement={pageContainerElement}
                    />
                  </div>
                </div>
              )}
            </Spinner>
          </section>
        </PageSplit>
      </PageWorkbench>
    </PageFillShell>
  );
};
