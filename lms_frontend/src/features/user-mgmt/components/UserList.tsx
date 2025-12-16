/**
 * UserList Component
 * Displays user list with search, filter, and actions
 * Requirements: 18.1, 18.4, 18.5, 18.6 - User list with deactivate/activate/reset password
 */

import * as React from 'react';
import { Table, type TableColumn } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Select, type SelectOption } from '@/components/ui/Select';
import { 
  Search, 
  Plus, 
  Edit2, 
  UserX, 
  UserCheck, 
  KeyRound,
  Settings,
  Copy,
  Check
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { ROLE_NAMES, type RoleCode } from '@/config/roles';
import { 
  useUserList, 
  useDeactivateUser, 
  useActivateUser, 
  useResetPassword,
  useAssignRoles,
  type UserListItem,
  type UserListParams,
} from '../api/users';
import { RoleSelector } from './RoleSelector';

export interface Department {
  id: number;
  name: string;
}

export interface UserListProps {
  /** Available departments for filtering */
  departments?: Department[];
  /** Callback when create button is clicked */
  onCreateClick?: () => void;
  /** Callback when edit button is clicked */
  onEditClick?: (user: UserListItem) => void;
}

export const UserList: React.FC<UserListProps> = ({
  departments = [],
  onCreateClick,
  onEditClick,
}) => {
  // Filter state
  const [searchText, setSearchText] = React.useState('');
  const [departmentFilter, setDepartmentFilter] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<string>('');
  const [page, setPage] = React.useState(1);
  const pageSize = 10;
  
  // Dialog state
  const [deactivateUser, setDeactivateUser] = React.useState<UserListItem | null>(null);
  const [activateUser, setActivateUser] = React.useState<UserListItem | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = React.useState<UserListItem | null>(null);
  const [tempPassword, setTempPassword] = React.useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = React.useState(false);
  const [roleEditUser, setRoleEditUser] = React.useState<UserListItem | null>(null);
  const [selectedRoles, setSelectedRoles] = React.useState<RoleCode[]>([]);
  
  // Build query params
  const queryParams: UserListParams = React.useMemo(() => ({
    search: searchText || undefined,
    department_id: departmentFilter ? parseInt(departmentFilter) : undefined,
    is_active: statusFilter === '' ? undefined : statusFilter === 'active',
    page,
    page_size: pageSize,
  }), [searchText, departmentFilter, statusFilter, page]);
  
  // API hooks
  const { data, isLoading, refetch } = useUserList(queryParams);
  const deactivateMutation = useDeactivateUser();
  const activateMutation = useActivateUser();
  const resetPasswordMutation = useResetPassword();
  const assignRolesMutation = useAssignRoles();
  
  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [searchText, departmentFilter, statusFilter]);
  
  // Handle deactivate
  const handleDeactivate = async () => {
    if (!deactivateUser) return;
    try {
      await deactivateMutation.mutateAsync(deactivateUser.id);
      setDeactivateUser(null);
    } catch (error) {
      console.error('Deactivate error:', error);
    }
  };
  
  // Handle activate
  const handleActivate = async () => {
    if (!activateUser) return;
    try {
      await activateMutation.mutateAsync(activateUser.id);
      setActivateUser(null);
    } catch (error) {
      console.error('Activate error:', error);
    }
  };
  
  // Handle reset password
  const handleResetPassword = async () => {
    if (!resetPasswordUser) return;
    try {
      const result = await resetPasswordMutation.mutateAsync(resetPasswordUser.id);
      setTempPassword(result.temporary_password);
    } catch (error) {
      console.error('Reset password error:', error);
    }
  };
  
  // Handle copy password
  const handleCopyPassword = async () => {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch (error) {
      console.error('Copy error:', error);
    }
  };
  
  // Handle close reset password dialog
  const handleCloseResetPassword = () => {
    setResetPasswordUser(null);
    setTempPassword(null);
    setCopiedPassword(false);
  };
  
  // Handle open role edit
  const handleOpenRoleEdit = (user: UserListItem) => {
    setRoleEditUser(user);
    setSelectedRoles(user.roles.map(r => r.code));
  };
  
  // Handle save roles
  const handleSaveRoles = async () => {
    if (!roleEditUser) return;
    try {
      await assignRolesMutation.mutateAsync({
        id: roleEditUser.id,
        data: { role_codes: selectedRoles },
      });
      setRoleEditUser(null);
      refetch();
    } catch (error) {
      console.error('Assign roles error:', error);
    }
  };
  
  // Table columns
  const columns: TableColumn<UserListItem>[] = [
    {
      key: 'real_name',
      title: '姓名',
      accessor: 'real_name',
    },
    {
      key: 'employee_id',
      title: '工号',
      accessor: 'employee_id',
    },
    {
      key: 'username',
      title: '账号',
      accessor: 'username',
    },
    {
      key: 'is_active',
      title: '状态',
      accessor: 'is_active',
      render: (value) => (
        <Badge variant={value ? 'success' : 'secondary'}>
          {value ? '启用' : '停用'}
        </Badge>
      ),
    },
    {
      key: 'department',
      title: '所属室',
      accessor: (record) => record.department?.name || '-',
    },
    {
      key: 'roles',
      title: '角色',
      render: (_, record) => (
        <div className="flex flex-wrap gap-1">
          {record.roles.map((role) => (
            <Badge key={role.code} variant="outline" className="text-xs">
              {ROLE_NAMES[role.code] || role.name}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      width: 200,
      render: (_, record) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEditClick?.(record);
            }}
            title="编辑"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenRoleEdit(record);
            }}
            title="配置角色"
          >
            <Settings className="h-4 w-4" />
          </Button>
          
          {record.is_active ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setDeactivateUser(record);
              }}
              title="停用"
              className="text-warning hover:text-warning"
            >
              <UserX className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setActivateUser(record);
              }}
              title="启用"
              className="text-success hover:text-success"
            >
              <UserCheck className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setResetPasswordUser(record);
            }}
            title="重置密码"
          >
            <KeyRound className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
  
  // Department filter options
  const departmentOptions: SelectOption[] = [
    { value: '', label: '全部部门' },
    ...departments.map(dept => ({
      value: dept.id.toString(),
      label: dept.name,
    })),
  ];
  
  // Status filter options
  const statusOptions: SelectOption[] = [
    { value: '', label: '全部状态' },
    { value: 'active', label: '启用' },
    { value: 'inactive', label: '停用' },
  ];
  
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              placeholder="搜索姓名或工号..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Department filter */}
          <Select
            options={departmentOptions}
            value={departmentFilter}
            onChange={(v) => setDepartmentFilter(Array.isArray(v) ? v[0] : v)}
            className="w-40"
          />
          
          {/* Status filter */}
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={(v) => setStatusFilter(Array.isArray(v) ? v[0] : v)}
            className="w-32"
          />
        </div>
        
        {/* Create button */}
        <Button variant="primary" onClick={onCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          新建用户
        </Button>
      </div>
      
      {/* Table */}
      <Table
        columns={columns}
        dataSource={data?.results || []}
        rowKey="id"
        loading={isLoading}
        pagination={data ? {
          current: page,
          pageSize,
          total: data.count,
          onChange: (newPage) => setPage(newPage),
        } : false}
        emptyText="暂无用户数据"
      />
      
      {/* Deactivate confirmation dialog */}
      <ConfirmDialog
        open={!!deactivateUser}
        onClose={() => setDeactivateUser(null)}
        onConfirm={handleDeactivate}
        title="停用用户"
        description={`确定要停用用户「${deactivateUser?.real_name}」吗？停用后该用户将无法登录系统。`}
        confirmText="停用"
        variant="danger"
        loading={deactivateMutation.isPending}
      />
      
      {/* Activate confirmation dialog */}
      <ConfirmDialog
        open={!!activateUser}
        onClose={() => setActivateUser(null)}
        onConfirm={handleActivate}
        title="启用用户"
        description={`确定要启用用户「${activateUser?.real_name}」吗？`}
        confirmText="启用"
        loading={activateMutation.isPending}
      />
      
      {/* Reset password dialog */}
      <Modal
        open={!!resetPasswordUser}
        onClose={handleCloseResetPassword}
        title="重置密码"
        size="sm"
        footer={
          tempPassword ? (
            <Button variant="primary" onClick={handleCloseResetPassword}>
              完成
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={handleCloseResetPassword}>
                取消
              </Button>
              <Button 
                variant="danger" 
                onClick={handleResetPassword}
                loading={resetPasswordMutation.isPending}
              >
                重置密码
              </Button>
            </>
          )
        }
      >
        {tempPassword ? (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              用户「{resetPasswordUser?.real_name}」的密码已重置，临时密码为：
            </p>
            <div className="flex items-center gap-2 p-3 bg-background-secondary rounded-lg">
              <code className="flex-1 text-lg font-mono text-primary">
                {tempPassword}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyPassword}
                className={cn(copiedPassword && 'text-success')}
              >
                {copiedPassword ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-text-muted">
              请将此临时密码告知用户，用户首次登录后需要修改密码。
            </p>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">
            确定要重置用户「{resetPasswordUser?.real_name}」的密码吗？
            系统将生成一个临时密码。
          </p>
        )}
      </Modal>
      
      {/* Role edit dialog */}
      <Modal
        open={!!roleEditUser}
        onClose={() => setRoleEditUser(null)}
        title={`配置角色 - ${roleEditUser?.real_name}`}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRoleEditUser(null)}>
              取消
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSaveRoles}
              loading={assignRolesMutation.isPending}
            >
              保存
            </Button>
          </>
        }
      >
        <RoleSelector
          value={selectedRoles}
          onChange={setSelectedRoles}
        />
      </Modal>
    </div>
  );
};

UserList.displayName = 'UserList';
