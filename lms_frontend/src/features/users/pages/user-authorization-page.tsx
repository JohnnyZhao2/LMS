import * as React from 'react';
import { ShieldCheck, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { UserSelectList } from '@/components/common/user-select-list';
import { PageHeader } from '@/components/ui/page-header';
import { PageFillShell, PageSplit, PageWorkbench } from '@/components/ui/page-shell';
import { useAuth } from '@/session/auth/auth-context';
import { showApiError } from '@/utils/error-handler';
import type { RoleCode } from '@/types/common';

import { useDepartments, useRoles, useUserDetail, useUsers } from '@/entities/user/api/get-users';
import { useAssignRoles } from '@/entities/user/api/manage-users';
import { UserPermissionWorkbench } from '@/entities/authorization/components/user-permission-workbench';
import { getSelectedBusinessRoleCode } from '@/entities/authorization/utils/user-role-assignment';
import { UserDirectoryFilters } from '../components/user-directory-filters';

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
    () => getSelectedBusinessRoleCode(selectedUserDetail?.roles ?? []),
    [selectedUserDetail],
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
    <PageFillShell ref={setPageContainerElement}>
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
            <UserPermissionWorkbench
              userDetail={selectedUserDetail}
              departments={departments}
              selectedRoleCodes={selectedRoleCodes}
              dialogContentElement={pageContainerElement}
              roleNameMap={roleNameMap}
              canManageRoles={hasCapability('user.authorize')}
              isRoleBusy={isAssigningRole}
              onToggleRole={(roleCode) => { void handleRoleToggle(roleCode); }}
              isLoading={isLoading}
              emptyDescription="请选择一个用户开始配置权限。"
            />
          </section>
        </PageSplit>
      </PageWorkbench>
    </PageFillShell>
  );
};
