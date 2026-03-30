/**
 * 用户管理页面 - 三栏布局
 * Sidebar（视图切换 + 筛选）| 用户列表（DataTable）| 详情面板
 */
import * as React from "react"
import { type ColumnDef } from "@tanstack/react-table"
import {
  MoreVertical,
  Pencil,
  Lock,
  Ban,
  CheckCircle,
  ShieldCheck,
  Building2,
  Trash2,
} from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { useUsers, useDepartments, useMentors } from "../api/get-users"
import { useActivateUser, useDeactivateUser, useDeleteUser, useResetPassword, useUpdateUserAvatar } from "../api/manage-users"
import { UserForm } from "./user-form"
import { UserSidebar, type ViewMode } from "./user-sidebar"
import { AvatarPickerPopover } from "./avatar-picker-popover"
import { Users as UsersIcon } from "lucide-react"
import { getRoleColor } from "@/lib/role-config"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { AvatarCircle } from '@/components/common/avatar-circle';
import { DataTable } from '@/components/ui/data-table/data-table';
import { CellWithAvatar, CellTags, CellIconText, CellSmallAvatar, CellStatus } from '@/components/ui/data-table/data-table-cells';
import { SearchInput } from "@/components/ui/search-input"
import { CircleButton } from "@/components/ui/circle-button"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/ui/page-header';
import { toast } from "sonner"
import { showApiError } from "@/utils/error-handler"
import { cn } from "@/lib/utils"
import type { UserList as UserListType, Role } from "@/types/api"

export const UserList: React.FC = () => {
  const [searchParams] = useSearchParams()
  const { hasPermission, currentRole, user: currentUser } = useAuth()
  const canCreateUser = hasPermission('user.create')
  const canUpdateUser = hasPermission('user.update')
  const canManageUserAccount = hasPermission('user.activate')
  const canManageUserAuthorization = hasPermission('user.authorize')
  const canDeleteUser = hasPermission('user.delete')
  const canResetPassword = canManageUserAccount
  const canOpenUserEditor = canUpdateUser || canManageUserAuthorization
  const canAdminEditAvatar = currentRole === 'ADMIN' || currentRole === 'SUPER_ADMIN' || !!currentUser?.is_superuser
  const userIdParam = searchParams.get('user_id')
  const userIdFromParam = userIdParam ? Number(userIdParam) : undefined

  // 视图模式和筛选状态
  const [viewMode, setViewMode] = React.useState<ViewMode>('department')
  const [selectedHierarchyId, setSelectedHierarchyId] = React.useState<number | 'all'>('all')
  const [search, setSearch] = React.useState("")

  // 分页状态
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  // 用户操作状态
  const [formModalOpen, setFormModalOpen] = React.useState(false)
  const [editingUserId, setEditingUserId] = React.useState<number | undefined>()
  const [resetPasswordDialog, setResetPasswordDialog] = React.useState<{
    open: boolean
    userId?: number
  }>({ open: false })
  const [tempPasswordDialog, setTempPasswordDialog] = React.useState<{
    open: boolean
    password?: string
  }>({ open: false })
  const [deleteUserDialog, setDeleteUserDialog] = React.useState<{
    open: boolean
    user?: UserListType
  }>({ open: false })

  // API Hooks
  const { data: departments = [] } = useDepartments()
  const { data: mentors = [] } = useMentors()
  const createInitialDepartmentId = viewMode === 'department' && selectedHierarchyId !== 'all'
    ? selectedHierarchyId as number
    : undefined
  const createInitialMentorId = viewMode === 'mentorship' && selectedHierarchyId !== 'all'
    ? selectedHierarchyId as number
    : undefined
  const departmentFilter = viewMode === 'department' && selectedHierarchyId !== 'all'
    ? selectedHierarchyId as number
    : undefined
  const { data, isLoading, refetch } = useUsers({
    search,
    departmentId: departmentFilter,
  })
  const activateUser = useActivateUser()
  const deactivateUser = useDeactivateUser()
  const deleteUser = useDeleteUser()
  const resetPassword = useResetPassword()
  const updateUserAvatar = useUpdateUserAvatar()

  // 筛选变化时重置页码
  React.useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [search, viewMode, selectedHierarchyId])

  React.useEffect(() => {
    if (!userIdFromParam || Number.isNaN(userIdFromParam)) return
    setEditingUserId(userIdFromParam)
    setFormModalOpen(true)
  }, [userIdFromParam])

  // 根据视图模式过滤用户列表
  const filteredUsers = React.useMemo(() => {
    let users = data || []

    // 师徒模式：按导师筛选
    if (viewMode === 'mentorship' && selectedHierarchyId !== 'all') {
      users = users.filter(u => u.mentor?.id === selectedHierarchyId)
    }

    return users
  }, [data, viewMode, selectedHierarchyId])

  const handleToggleActive = async (user: UserListType) => {
    try {
      if (user.is_active) {
        await deactivateUser.mutateAsync(user.id)
        toast.success("账号已停用")
      } else {
        await activateUser.mutateAsync(user.id)
        toast.success("账号已启用")
      }
      refetch()
    } catch (error) {
      showApiError(error)
    }
  }

  const handleResetPassword = async () => {
    if (!resetPasswordDialog.userId) return
    try {
      const result = await resetPassword.mutateAsync(resetPasswordDialog.userId)
      setResetPasswordDialog({ open: false })
      setTempPasswordDialog({ open: true, password: result.temporary_password })
    } catch (error) {
      showApiError(error)
    }
  }

  const handleDeleteUser = async () => {
    const targetUser = deleteUserDialog.user
    if (!targetUser) return

    if (targetUser.is_active) {
      toast.error("仅可删除已停用（离职）用户")
      return
    }

    try {
      await deleteUser.mutateAsync(targetUser.id)
      toast.success("用户及关联数据已彻底删除")

      if (editingUserId === targetUser.id) {
        setFormModalOpen(false)
        setEditingUserId(undefined)
      }
      setDeleteUserDialog({ open: false })
      refetch()
    } catch (error) {
      showApiError(error)
    }
  }

  const handleUserAvatarSelect = async (user: UserListType, avatarKey: string) => {
    try {
      await updateUserAvatar.mutateAsync({
        id: user.id,
        data: { avatar_key: avatarKey },
      })
      toast.success(`已更新 ${user.username} 的头像`)
    } catch (error) {
      showApiError(error, '头像更新失败')
    }
  }

  // DataTable 列定义 - 使用共用 Cell 组件
  const columns: ColumnDef<UserListType>[] = [
    {
      header: "用户信息",
      id: "user",
      size: 240,
      cell: ({ row }) => (
        <CellWithAvatar
          name={row.original.username}
          subtitle={row.original.employee_id || 'NO ID'}
          avatar={(
            <AvatarPickerPopover
              avatarKey={row.original.avatar_key}
              name={row.original.username}
              size="md"
              canEdit={canAdminEditAvatar}
              isUpdating={updateUserAvatar.isPending}
              align="start"
              onSelectAvatar={(avatarKey) => handleUserAvatarSelect(row.original, avatarKey)}
            />
          )}
        />
      ),
    },
    {
      header: "权限角色",
      id: "roles",
      size: 200,
      cell: ({ row }) => (
        <CellTags
          tags={row.original.roles.map((role: Role) => ({
            key: role.code,
            label: role.name,
            ...getRoleColor(role.code),
          }))}
        />
      ),
    },
    {
      header: "所属部门",
      id: "department",
      size: 160,
      cell: ({ row }) => (
        <CellIconText
          icon={<Building2 className="w-4 h-4" />}
          text={row.original.department?.name || "未分配"}
        />
      ),
    },
    {
      header: "指导老师",
      id: "mentor",
      size: 140,
      cell: ({ row }) => {
        const mentor = row.original.mentor
        if (!mentor) return <span className="text-text-muted italic text-xs">未分配</span>
        return <CellSmallAvatar name={mentor.username} avatarKey={mentor.avatar_key} />
      },
    },
    {
      header: "状态",
      id: "status",
      size: 100,
      cell: ({ row }) => (
        <CellStatus isActive={row.original.is_active} />
      ),
    },
    {
      header: "操作",
      id: "actions",
      size: 80,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 min-w-[60px]" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md hover:bg-primary-100 hover:text-primary text-text-muted">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-lg p-1 border border-border">
              <DropdownMenuLabel className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-3 py-2">
                账号控制台
              </DropdownMenuLabel>

              <DropdownMenuItem
                disabled={!canUpdateUser}
                className="rounded-md px-3 py-2 text-sm font-medium cursor-pointer"
                onClick={() => {
                  if (!canUpdateUser) return
                  setEditingUserId(row.original.id)
                  setFormModalOpen(true)
                }}
              >
                <Pencil className="mr-2 h-4 w-4" /> 编辑资料
              </DropdownMenuItem>
              {canResetPassword && (
                <DropdownMenuItem
                  className="rounded-md px-3 py-2 text-sm font-medium cursor-pointer"
                  onClick={() => setResetPasswordDialog({ open: true, userId: row.original.id })}
                >
                  <Lock className="mr-2 h-4 w-4" /> 重置密码
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator className="my-1" />

              {canManageUserAccount && (
                <DropdownMenuItem
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
                    row.original.is_active
                      ? "text-destructive focus:bg-destructive-100"
                      : "text-secondary focus:bg-secondary-100"
                  )}
                  onClick={() => handleToggleActive(row.original)}
                >
                  {row.original.is_active ? (
                    <><Ban className="mr-2 h-4 w-4" /> 停用账号</>
                  ) : (
                    <><CheckCircle className="mr-2 h-4 w-4" /> 启用账号</>
                  )}
                </DropdownMenuItem>
              )}

              {canDeleteUser && (
                <DropdownMenuItem
                  className="rounded-md px-3 py-2 text-sm font-medium cursor-pointer text-destructive focus:bg-destructive-100"
                  onClick={() => {
                    if (row.original.is_active) {
                      toast.error("请先停用账号，再执行彻底删除")
                      return
                    }
                    setDeleteUserDialog({ open: true, user: row.original })
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> 彻底删除
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-10 pb-20">
      <PageHeader
        title="用户中心"
        icon={<UsersIcon />}
      />

      <div className="flex items-start gap-8">
        {/* Left Sidebar */}
        <UserSidebar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          departments={departments}
          mentors={mentors}
          selectedId={selectedHierarchyId}
          onSelect={setSelectedHierarchyId}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          {/* Header */}
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-end">
            <SearchInput
              className="w-full xl:w-[22rem] xl:min-w-[22rem]"
              placeholder="检索姓名、工号、部位..."
              value={search}
              onChange={setSearch}
            />
            {canCreateUser && (
              <CircleButton
                onClick={() => {
                  setEditingUserId(undefined)
                  setFormModalOpen(true)
                }}
                label="快速录入"
                className="self-end xl:self-auto"
              />
            )}
          </div>

          {/* User List - 使用恢复的分页配置 */}
          <div>
            <DataTable
              columns={columns}
              data={filteredUsers}
              isLoading={isLoading}
              pagination={{
                pageIndex: pagination.pageIndex,
                pageSize: pagination.pageSize,
                pageCount: Math.ceil(filteredUsers.length / pagination.pageSize),
                totalCount: filteredUsers.length,
                onPageChange: (page) => setPagination(prev => ({ ...prev, pageIndex: page })),
                onPageSizeChange: (size) => setPagination(prev => ({ ...prev, pageSize: size, pageIndex: 0 })),
              }}
              rowClassName="group cursor-pointer hover:bg-muted transition-colors"
              onRowClick={(row) => {
                if (!canOpenUserEditor) return
                setEditingUserId(row.id)
                setFormModalOpen(true)
              }}
            />
          </div>
        </div>
      </div>

      {/* User Form Modal */}
      <UserForm
        open={formModalOpen}
        userId={editingUserId}
        initialDepartmentId={editingUserId ? undefined : createInitialDepartmentId}
        initialMentorId={editingUserId ? undefined : createInitialMentorId}
        onClose={() => {
          setFormModalOpen(false)
          setEditingUserId(undefined)
        }}
        onSuccess={() => {
          refetch()
        }}
      />

      {/* Reset Password Confirm Dialog */}
      <ConfirmDialog
        open={resetPasswordDialog.open}
        onOpenChange={(open) => setResetPasswordDialog({ open, userId: resetPasswordDialog.userId })}
        title="重置密码？"
        description={
          <>
            系统将生成一个<span className="text-primary-600 font-semibold">临时密码</span>。<br />
            用户下次登录时必须修改。
          </>
        }
        icon={<Lock className="h-10 w-10" />}
        iconBgColor="bg-primary-100"
        iconColor="text-primary-600"
        confirmText="确认重置"
        cancelText="取消"
        confirmVariant="destructive"
        onConfirm={handleResetPassword}
        isConfirming={resetPassword.isPending}
      />

      <ConfirmDialog
        open={deleteUserDialog.open}
        onOpenChange={(open) =>
          setDeleteUserDialog({
            open,
            user: open ? deleteUserDialog.user : undefined,
          })
        }
        title="彻底删除该离职用户？"
        description={`将永久删除用户「${deleteUserDialog.user?.username ?? ''}」及其所有关联数据（任务、答题、抽查、题库与知识资源）。此操作不可撤销。`}
        icon={<Trash2 className="h-10 w-10" />}
        iconBgColor="bg-destructive-100"
        iconColor="text-destructive"
        confirmText="确认删除"
        cancelText="取消"
        confirmVariant="destructive"
        onConfirm={handleDeleteUser}
        isConfirming={deleteUser.isPending}
      />

      {/* Temp Password Dialog */}
      <Dialog
        open={tempPasswordDialog.open}
        onOpenChange={(open) => setTempPasswordDialog({ open, password: tempPasswordDialog.password })}
      >
        <DialogContent className="rounded-lg max-w-md p-8 border border-border">
          <DialogHeader>
            <AvatarCircle size="lg" variant="secondary" className="mb-6 mx-auto">
              <ShieldCheck className="h-8 w-8" />
            </AvatarCircle>
            <DialogTitle className="text-xl font-bold text-foreground text-center">重置成功</DialogTitle>
            <DialogDescription className="text-text-muted text-center text-sm">
              请务必将此密码<span className="text-foreground font-semibold">安全地</span>转交给用户
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 cursor-pointer" onClick={() => {
            navigator.clipboard.writeText(tempPasswordDialog.password || '');
            toast.success('密码已复制');
          }}>
            <div className="bg-muted rounded-lg p-6 text-center hover:bg-muted transition-colors">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 block">临时密码</span>
              <code className="text-2xl font-bold text-primary-600 tracking-widest font-mono">
                {tempPasswordDialog.password}
              </code>
              <div className="mt-3 text-xs font-medium text-text-muted">点击复制</div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              onClick={() => setTempPasswordDialog({ open: false })}
              className="w-full bg-primary text-white rounded-lg h-11 font-semibold hover:bg-primary-600 "
            >
              完成并关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
