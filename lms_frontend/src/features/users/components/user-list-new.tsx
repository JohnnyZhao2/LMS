import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Users, Plus, Pencil, Lock, Ban, CheckCircle, Search } from 'lucide-react';
import { useUsers } from '../api/get-users';
import { useActivateUser, useDeactivateUser, useResetPassword } from '../api/manage-users';
import { UserFormModalNew } from './user-form-modal-new';
import { DataTable } from '@/components/ui/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { UserList as UserListType, Role } from '@/types/api';
import { showApiError } from '@/utils/error-handler';
import dayjs from '@/lib/dayjs';

/**
 * 用户列表组件 - ShadCN UI 版本
 * 保持与原 Ant Design 版本完全一致的视觉效果
 */
export const UserListNew: React.FC = () => {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | undefined>();
  const [resetPasswordDialog, setResetPasswordDialog] = useState<{
    open: boolean;
    userId?: number;
  }>({ open: false });
  const [tempPasswordDialog, setTempPasswordDialog] = useState<{
    open: boolean;
    password?: string;
  }>({ open: false });

  const { data, isLoading, refetch } = useUsers({ search });
  const activateUser = useActivateUser();
  const deactivateUser = useDeactivateUser();
  const resetPassword = useResetPassword();

  const handleToggleActive = async (user: UserListType) => {
    try {
      if (user.is_active) {
        await deactivateUser.mutateAsync(user.id);
        toast.success('已停用');
      } else {
        await activateUser.mutateAsync(user.id);
        toast.success('已启用');
      }
    } catch (error) {
      showApiError(error, '操作失败');
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordDialog.userId) return;
    try {
      const result = await resetPassword.mutateAsync(resetPasswordDialog.userId);
      setResetPasswordDialog({ open: false });
      setTempPasswordDialog({ open: true, password: result.temporary_password });
    } catch (error) {
      showApiError(error, '重置失败');
    }
  };

  const handleSearch = () => {
    setSearch(searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const columns: ColumnDef<UserListType>[] = [
    {
      id: 'basic_info',
      header: '用户信息',
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-base"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary-400) 0%, var(--color-primary-600) 100%)',
              }}
            >
              {record.username?.charAt(0) || '?'}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{record.username}</div>
              <div className="text-xs text-gray-500">{record.employee_id}</div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'roles',
      header: '角色',
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex flex-wrap gap-1">
            {record.roles.map((role: Role) => (
              <span
                key={role.code}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{
                  background: 'var(--color-primary-50)',
                  color: 'var(--color-primary-600)',
                }}
              >
                {role.name}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      id: 'department',
      header: '部门',
      cell: ({ row }) => {
        const record = row.original;
        return (
          <span className={record.department ? 'text-gray-900' : 'text-gray-400'}>
            {record.department?.name || '-'}
          </span>
        );
      },
    },
    {
      id: 'mentor',
      header: '导师',
      cell: ({ row }) => {
        const record = row.original;
        if (record.mentor) {
          return (
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-semibold"
                style={{ background: 'var(--color-cyan-500)' }}
              >
                {record.mentor.username?.charAt(0).toUpperCase() || '?'}
              </div>
              <span className="text-gray-900">{record.mentor.username}</span>
            </div>
          );
        }
        return <span className="text-gray-400">-</span>;
      },
    },
    {
      id: 'is_active',
      header: '状态',
      size: 100,
      cell: ({ row }) => {
        const record = row.original;
        return (
          <Badge
            variant={record.is_active ? 'default' : 'secondary'}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              record.is_active
                ? 'bg-green-50 text-green-600 hover:bg-green-50'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {record.is_active ? '已启用' : '已停用'}
          </Badge>
        );
      },
    },
    {
      id: 'created_at',
      header: '创建时间',
      size: 120,
      cell: ({ row }) => {
        const record = row.original;
        return (
          <span className="text-sm text-gray-500">
            {record.created_at ? dayjs(record.created_at).format('YYYY-MM-DD') : '-'}
          </span>
        );
      },
    },
    {
      id: 'action',
      header: '操作',
      size: 200,
      cell: ({ row }) => {
        const record = row.original;
        const isSuperuser = record.is_superuser || false;

        return (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => {
                setEditingUserId(record.id);
                setFormModalOpen(true);
              }}
            >
              <Pencil className="h-4 w-4 mr-1" />
              编辑
            </Button>
            {!isSuperuser && (
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-2 ${
                  record.is_active
                    ? 'text-red-500 hover:text-red-600 hover:bg-red-50'
                    : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                }`}
                onClick={() => handleToggleActive(record)}
              >
                {record.is_active ? (
                  <>
                    <Ban className="h-4 w-4 mr-1" />
                    停用
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    启用
                  </>
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => setResetPasswordDialog({ open: true, userId: record.id })}
            >
              <Lock className="h-4 w-4 mr-1" />
              重置
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="animate-fadeIn">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2
              className="m-0 flex items-center gap-3 text-2xl font-bold"
              style={{ fontSize: 'var(--font-size-3xl)' }}
            >
              <span
                className="flex items-center justify-center w-10 h-10 rounded-lg"
                style={{
                  background: 'var(--color-primary-50)',
                  color: 'var(--color-primary-500)',
                }}
              >
                <Users className="w-5 h-5" />
              </span>
              用户管理
            </h2>
            <p className="text-gray-500 mt-1" style={{ fontSize: 'var(--font-size-base)', marginLeft: '52px' }}>
              管理系统用户账号、角色权限及组织归属
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingUserId(undefined);
              setFormModalOpen(true);
            }}
            className="h-11 px-5 font-semibold rounded-xl"
            style={{
              background: 'var(--color-primary-500)',
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            新建用户
          </Button>
        </div>
      </div>

      <Card className="rounded-xl border-gray-200 shadow-sm">
        <CardContent className="p-6">
          {/* Search Bar */}
          <div className="flex justify-between items-center mb-5">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索姓名或工号..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9 h-10 rounded-lg border-gray-200 focus:border-primary-500"
              />
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput('');
                    setSearch('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
            {data && (
              <span className="text-sm text-gray-500">
                共 {data.length} 个用户
              </span>
            )}
          </div>

          {/* Data Table */}
          <DataTable
            columns={columns}
            data={data || []}
            isLoading={isLoading}
            onRowClick={(row) => {
              setEditingUserId(row.id);
              setFormModalOpen(true);
            }}
          />
        </CardContent>
      </Card>

      {/* User Form Modal - ShadCN UI version */}
      <UserFormModalNew
        open={formModalOpen}
        userId={editingUserId}
        onClose={() => {
          setFormModalOpen(false);
          setEditingUserId(undefined);
        }}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Reset Password Confirmation Dialog */}
      <Dialog
        open={resetPasswordDialog.open}
        onOpenChange={(open) => setResetPasswordDialog({ open, userId: resetPasswordDialog.userId })}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认重置密码</DialogTitle>
            <DialogDescription>
              确定要重置该用户的密码吗？重置后会生成临时密码。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setResetPasswordDialog({ open: false })}
            >
              取消
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resetPassword.isPending}
            >
              {resetPassword.isPending ? '重置中...' : '确定重置'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Temporary Password Display Dialog */}
      <Dialog
        open={tempPasswordDialog.open}
        onOpenChange={(open) => setTempPasswordDialog({ open, password: tempPasswordDialog.password })}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-green-600 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              密码重置成功
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-3">临时密码：</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-3 bg-gray-100 rounded-lg font-mono text-lg select-all">
                {tempPasswordDialog.password}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(tempPasswordDialog.password || '');
                  toast.success('已复制到剪贴板');
                }}
              >
                复制
              </Button>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              请通知用户使用临时密码登录并修改密码。
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setTempPasswordDialog({ open: false })}>
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
