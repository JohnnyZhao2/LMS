import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PermissionOverrideScope } from '@/types/authorization';
import type { Department, RoleCode, UserList } from '@/types/common';

import { useUserPermissionScopeState } from './use-user-permission-scope-state';
import { useUserScopeGroupOverrideState } from './use-user-scope-group-override-state';
import { UserPermissionScopePopover } from './user-permission-scope-popover';
import type { RoleScopeSelection } from './user-permission-scope.utils';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

const department: Department = {
  id: 10,
  name: '测试部门',
  code: 'TEST_DEPT',
};

const buildUser = ({
  id,
  roleCode,
  mentorId,
}: {
  id: number;
  roleCode: RoleCode;
  mentorId?: number;
}): UserList => ({
  id,
  employee_id: `EMP_${id}`,
  username: `用户${id}`,
  avatar_key: '',
  department,
  mentor: mentorId
    ? {
        id: mentorId,
        username: `导师${mentorId}`,
        employee_id: `EMP_${mentorId}`,
        avatar_key: '',
      }
    : undefined,
  is_active: true,
  is_superuser: false,
  roles: [{ code: roleCode, name: roleCode }],
  created_at: '2026-04-24T00:00:00.000Z',
  updated_at: '2026-04-24T00:00:00.000Z',
});

const scopeUsers = [
  buildUser({ id: 1, roleCode: 'ADMIN' }),
  buildUser({ id: 2, roleCode: 'MENTOR' }),
  buildUser({ id: 3, roleCode: 'STUDENT', mentorId: 1 }),
  buildUser({ id: 4, roleCode: 'DEPT_MANAGER', mentorId: 1 }),
];

const renderPermissionScopeHook = ({
  availableScopeTypes = ['SELF', 'ALL', 'EXPLICIT_USERS'],
  selectedRoleDefaultScopeTypes = ['ALL'],
  scopePermissionCode = 'user.view',
}: {
  availableScopeTypes?: PermissionOverrideScope[];
  selectedRoleDefaultScopeTypes?: PermissionOverrideScope[];
  scopePermissionCode?: string;
} = {}) => {
  const onSelectionChange = vi.fn();
  const hook = renderHook(() => useUserPermissionScopeState({
    userId: 1,
    userDetail: scopeUsers[0],
    departments: [department],
    departmentId: department.id,
    selectedDepartmentName: department.name,
    hasConfigurablePermissionRoles: true,
    normalizedSelectedPermissionRole: 'ADMIN',
    selectedRoleDefaultScopeTypes,
    availableScopeTypes,
    scopeGroupKey: 'user_scope',
    scopePermissionCode,
    scopeUsers,
    scopeGroupOverrides: [],
    onSelectionChange,
  }));

  return { ...hook, onSelectionChange };
};

describe('useUserPermissionScopeState', () => {
  it('管理员选择“本人”时会选中管理员自己', () => {
    const { result } = renderPermissionScopeHook();

    act(() => {
      result.current.selectPresetScope('SELF');
    });

    expect(result.current.selectedPermissionScopes).toEqual(['SELF']);
    expect(result.current.selectedScopeUserIds).toEqual([1]);
  });

  it('允许从默认“全部”改成指定用户勾选范围', async () => {
    const { result, onSelectionChange } = renderPermissionScopeHook();

    expect(result.current.selectedPermissionScopes).toEqual(['ALL']);
    expect(result.current.selectedScopeUserIds).toEqual([1, 2, 3, 4]);

    act(() => {
      result.current.toggleScopeUser(3);
    });

    expect(result.current.selectedPermissionScopes).toEqual(['EXPLICIT_USERS']);
    expect(result.current.selectedScopeUserIds).toEqual([1, 2, 4]);
    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith({
        scopeTypes: ['EXPLICIT_USERS'],
        scopeUserIds: [1, 2, 4],
      });
    });
  });

  it('任务执行人范围允许勾选学员和室经理，不会把管理员本人混入任务分配范围', () => {
    const { result } = renderPermissionScopeHook({
      availableScopeTypes: ['MENTEES', 'EXPLICIT_USERS'],
      selectedRoleDefaultScopeTypes: ['MENTEES'],
      scopePermissionCode: 'task.assign',
    });

    expect(result.current.filteredScopeUsers.map((user) => user.id)).toEqual([3, 4]);
    expect(result.current.selectedScopeUserIds).toEqual([3, 4]);
  });

  it('抽查范围仍只允许勾选学员', () => {
    const { result } = renderPermissionScopeHook({
      availableScopeTypes: ['MENTEES', 'EXPLICIT_USERS'],
      selectedRoleDefaultScopeTypes: ['MENTEES'],
      scopePermissionCode: 'spot_check.create',
    });

    expect(result.current.filteredScopeUsers.map((user) => user.id)).toEqual([3]);
    expect(result.current.selectedScopeUserIds).toEqual([3]);
  });
});

describe('useUserScopeGroupOverrideState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderScopeGroupOverrideHook = () => {
    const createOverride = vi.fn().mockResolvedValue(undefined);
    const revokeOverride = vi.fn().mockResolvedValue(undefined);
    const refreshUser = vi.fn().mockResolvedValue(undefined);
    const refetchScopeGroupOverrides = vi.fn().mockResolvedValue(undefined);
    const hook = renderHook(() => useUserScopeGroupOverrideState({
      userId: 1,
      scopeGroupKey: 'task_resource_scope',
      normalizedSelectedPermissionRole: 'ADMIN',
      selectedRoleDefaultScopeTypes: ['ALL'],
      scopeGroupOverrides: [],
      createOverride,
      revokeOverride,
      refreshUser,
      refetchScopeGroupOverrides,
    }));

    return {
      ...hook,
      createOverride,
      revokeOverride,
      refreshUser,
      refetchScopeGroupOverrides,
    };
  };

  it('默认 ALL 改为 SELF 时会保存拒绝全部和允许本人', async () => {
    const { result, createOverride, revokeOverride, refreshUser, refetchScopeGroupOverrides } = renderScopeGroupOverrideHook();

    await act(async () => {
      await result.current.persistSelection({
        scopeTypes: ['SELF'],
        scopeUserIds: [1],
      });
    });

    expect(revokeOverride).not.toHaveBeenCalled();
    expect(createOverride).toHaveBeenCalledTimes(2);
    expect(createOverride).toHaveBeenCalledWith({
      userId: 1,
      data: {
        scope_group_key: 'task_resource_scope',
        effect: 'DENY',
        applies_to_role: 'ADMIN',
        scope_type: 'ALL',
        scope_user_ids: [],
      },
    });
    expect(createOverride).toHaveBeenCalledWith({
      userId: 1,
      data: {
        scope_group_key: 'task_resource_scope',
        effect: 'ALLOW',
        applies_to_role: 'ADMIN',
        scope_type: 'SELF',
        scope_user_ids: [],
      },
    });
    expect(refreshUser).toHaveBeenCalledTimes(1);
    expect(refetchScopeGroupOverrides).toHaveBeenCalledTimes(1);
  });

  it('指定用户范围会保存排序后的 EXPLICIT_USERS payload', async () => {
    const { result, createOverride } = renderScopeGroupOverrideHook();
    const selection: RoleScopeSelection = {
      scopeTypes: ['EXPLICIT_USERS'],
      scopeUserIds: [3, 1, 3],
    };

    await act(async () => {
      await result.current.persistSelection(selection);
    });

    expect(createOverride).toHaveBeenCalledWith({
      userId: 1,
      data: {
        scope_group_key: 'task_resource_scope',
        effect: 'DENY',
        applies_to_role: 'ADMIN',
        scope_type: 'ALL',
        scope_user_ids: [],
      },
    });
    expect(createOverride).toHaveBeenCalledWith({
      userId: 1,
      data: {
        scope_group_key: 'task_resource_scope',
        effect: 'ALLOW',
        applies_to_role: 'ADMIN',
        scope_type: 'EXPLICIT_USERS',
        scope_user_ids: [1, 3],
      },
    });
  });
});

describe('UserPermissionScopePopover', () => {
  it('指定用户范围弹窗会把用户行和全选勾选事件传出去', async () => {
    const user = userEvent.setup();
    const onToggleScopeUser = vi.fn();
    const onToggleSelectAllFilteredScopeUsers = vi.fn();

    render(
      <UserPermissionScopePopover
        open
        onOpenChange={vi.fn()}
        summary="指定2人"
        scopeFilterOptions={[{ value: 'all', label: '全部' }]}
        availableScopeTypes={['ALL', 'SELF', 'EXPLICIT_USERS']}
        selectedPermissionScopes={['EXPLICIT_USERS']}
        onSelectPresetScope={vi.fn()}
        scopeUserFilter="all"
        onScopeFilterChange={vi.fn()}
        showReset={false}
        onReset={vi.fn()}
        scopeUserSearch=""
        onScopeUserSearchChange={vi.fn()}
        isAllFilteredScopeUsersSelected={false}
        hasPartialFilteredScopeSelection
        onToggleSelectAllFilteredScopeUsers={onToggleSelectAllFilteredScopeUsers}
        selectedFilteredScopeCount={1}
        filteredScopeUsers={scopeUsers}
        selectedScopeUserIds={[1]}
        onToggleScopeUser={onToggleScopeUser}
        isScopeUsersLoading={false}
        dialogContentElement={null}
      />,
    );

    await user.click(screen.getByRole('button', { name: /用户2/ }));
    expect(onToggleScopeUser).toHaveBeenCalledWith(2);

    await user.click(screen.getByText('1/4'));
    expect(onToggleSelectAllFilteredScopeUsers).toHaveBeenCalledTimes(1);
  });

  it('无指定用户范围时会渲染本人预设按钮', async () => {
    const user = userEvent.setup();
    const onSelectPresetScope = vi.fn();

    render(
      <UserPermissionScopePopover
        open
        onOpenChange={vi.fn()}
        summary="全部"
        scopeFilterOptions={[]}
        availableScopeTypes={['SELF', 'ALL']}
        selectedPermissionScopes={['ALL']}
        onSelectPresetScope={onSelectPresetScope}
        scopeUserFilter="all"
        onScopeFilterChange={vi.fn()}
        showReset={false}
        onReset={vi.fn()}
        scopeUserSearch=""
        onScopeUserSearchChange={vi.fn()}
        isAllFilteredScopeUsersSelected={false}
        hasPartialFilteredScopeSelection={false}
        onToggleSelectAllFilteredScopeUsers={vi.fn()}
        selectedFilteredScopeCount={0}
        filteredScopeUsers={[]}
        selectedScopeUserIds={[]}
        onToggleScopeUser={vi.fn()}
        isScopeUsersLoading={false}
        dialogContentElement={null}
      />,
    );

    await user.click(screen.getByRole('button', { name: '本人' }));
    expect(onSelectPresetScope).toHaveBeenCalledWith('SELF');
  });
});
