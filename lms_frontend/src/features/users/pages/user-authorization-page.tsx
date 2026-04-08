import * as React from 'react';
import { KeyRound, ShieldCheck, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { UserAvatar } from '@/components/common/user-avatar';
import { UserSelectList } from '@/components/common/user-select-list';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { PageFillShell, PageSplit, PageWorkbench } from '@/components/ui/page-shell';
import { SearchInput, DESKTOP_SEARCH_INPUT_CLASSNAME } from '@/components/ui/search-input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { cn } from '@/lib/utils';
import { showApiError } from '@/utils/error-handler';
import type { RoleCode } from '@/types/api';

import { useDepartments, useUserDetail, useUsers } from '../api/get-users';
import {
  UserPermissionSection,
  type UserPermissionSectionHandle,
} from '../components/user-permission-section';

export const UserAuthorizationPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = React.useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState<string>('all');
  const [pageContainerElement, setPageContainerElement] = React.useState<HTMLDivElement | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = React.useState(false);
  const permissionSectionRef = React.useRef<UserPermissionSectionHandle | null>(null);
  const { hasCapability } = useAuth();

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

  const resolvedSelectedUserId = React.useMemo(() => {
    if (users.length === 0) {
      return null;
    }
    if (selectedUserId && users.some((user) => user.id === selectedUserId)) {
      return selectedUserId;
    }
    return users[0]?.id ?? null;
  }, [selectedUserId, users]);

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

  React.useEffect(() => {
    setHasPendingChanges(false);
  }, [resolvedSelectedUserId]);

  const handleSelectUser = (userId: number) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('user_id', String(userId));
    setSearchParams(nextSearchParams);
  };

  const handleSave = async () => {
    if (!selectedUserDetail || !hasPendingChanges) {
      return;
    }
    try {
      await permissionSectionRef.current?.submitChanges(selectedUserDetail.id);
    } catch (error) {
      showApiError(error);
    }
  };

  const selectedRoleCodes = React.useMemo<RoleCode[]>(
    () => selectedUserDetail?.roles
      .filter((role) => role.code !== 'STUDENT')
      .map((role) => role.code as RoleCode) ?? [],
    [selectedUserDetail],
  );
  const panelItems = React.useMemo(
    () => users.map((user) => ({
      id: user.id,
      name: user.username,
      avatarKey: user.avatar_key,
      meta: user.department?.name
        ? `${user.employee_id || '未填写工号'} · ${user.department.name}`
        : (user.employee_id || '未填写工号'),
    })),
    [users],
  );

  return (
    <PageFillShell ref={setPageContainerElement} className="animate-fadeIn">
      <PageHeader
        title="用户授权"
        icon={<ShieldCheck className="h-5 w-5" />}
        extra={(
          <Button
            onClick={handleSave}
            disabled={!selectedUserDetail || !hasPendingChanges || !hasCapability('user.authorize')}
            className="h-10 rounded-full px-5"
          >
            保存权限
          </Button>
        )}
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

            <div className="space-y-3 px-4 py-4">
              <SegmentedControl
                options={departmentSegmentOptions}
                value={selectedDepartmentId}
                onChange={setSelectedDepartmentId}
                fill
                className="w-full"
              />
              <SearchInput
                className={cn(DESKTOP_SEARCH_INPUT_CLASSNAME, 'w-full')}
                placeholder="检索姓名、工号"
                value={search}
                onChange={setSearch}
              />
            </div>

            <UserSelectList
              items={panelItems}
              selectedIds={resolvedSelectedUserId ? [resolvedSelectedUserId] : []}
              onSelect={handleSelectUser}
              selectionMode="single"
              appearance="panel"
              emptyText="当前筛选下没有可配置权限的用户。"
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
                  <div className="flex h-[52px] shrink-0 items-center border-b border-border/60 px-6">
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
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-6">
                    <UserPermissionSection
                      key={selectedUserDetail.id}
                      ref={permissionSectionRef}
                      userId={selectedUserDetail.id}
                      userDetail={selectedUserDetail}
                      departments={departments}
                      selectedRoleCodes={selectedRoleCodes}
                      departmentId={selectedUserDetail.department?.id}
                      isSuperuserAccount={Boolean(selectedUserDetail.is_superuser)}
                      dialogContentElement={pageContainerElement}
                      onPendingChangesChange={setHasPendingChanges}
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

export default UserAuthorizationPage;
