/**
 * 用户管理页面
 * 顶部筛选工具带 | 用户列表（DataTable）| 详情面板
 */
import * as React from "react"
import { type ColumnDef } from "@tanstack/react-table"
import {
  Pencil,
  Lock,
  Ban,
  CheckCircle,
  Trash2,
} from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { useUsers, useDepartments, useMentors } from '@/entities/user/api/get-users'
import { useActivateUser, useChangePassword, useDeactivateUser, useDeleteUser, useUpdateUserAvatar } from '@/entities/user/api/manage-users'
import { UserForm } from "./user-form"
import { AvatarPickerPopover } from '@/entities/user/components/avatar-picker-popover'
import { Users as UsersIcon } from "lucide-react"
import { getRoleColor } from "@/lib/role-config"
import { useAuth } from "@/session/auth/auth-context"
import { DataTable } from '@/components/ui/data-table/data-table';
import {
  LIST_ACTION_ICON_DESTRUCTIVE_CLASS,
  LIST_ACTION_ICON_EDIT_CLASS,
  LIST_ACTION_ICON_SUCCESS_CLASS,
  LIST_ACTION_ICON_WARNING_CLASS,
} from '@/components/ui/data-table/action-icon-styles';
import { CellWithAvatar, CellTags, CellSmallAvatar, CellStatus } from '@/components/ui/data-table/data-table-cells';
import { CircleButton } from "@/components/ui/circle-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { COMPACT_FILTER_SELECT_CLASSNAME, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tooltip } from '@/components/ui/tooltip';
import { PageHeader } from '@/components/ui/page-header';
import { PageFillShell, PageWorkbench } from '@/components/ui/page-shell';
import { toast } from "sonner"
import { showApiError } from "@/utils/error-handler"
import { cn } from "@/lib/utils"
import type { UserList as UserListType, Role } from '@/types/common';
import { UserDirectoryFilters } from "./user-directory-filters"

export const UserList: React.FC = () => {
  const [searchParams] = useSearchParams()
  const { hasCapability } = useAuth()
  const canCreateUser = hasCapability('user.create')
  const canUpdateUser = hasCapability('user.update')
  const canManageUserAccount = hasCapability('user.activate')
  const canDeleteUser = hasCapability('user.delete')
  const canChangePassword = canManageUserAccount
  const canOpenUserEditor = canUpdateUser || hasCapability('user.authorize')
  const canAdminEditAvatar = hasCapability('user.avatar.update')
  const userIdParam = searchParams.get('user_id')
  const userIdFromParam = userIdParam ? Number(userIdParam) : undefined

  // 筛选状态
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState<string>('all')
  const [selectedMentorId, setSelectedMentorId] = React.useState<string>('all')
  const [search, setSearch] = React.useState("")

  // 分页状态
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  // 用户操作状态
  const [formModalOpen, setFormModalOpen] = React.useState(false)
  const [editingUserId, setEditingUserId] = React.useState<number | undefined>()
  const [changePasswordDialog, setChangePasswordDialog] = React.useState<{
    open: boolean
    userId?: number
    username?: string
  }>({ open: false })
  const [newPassword, setNewPassword] = React.useState('')
  const [passwordError, setPasswordError] = React.useState<string>()
  const [deleteUserDialog, setDeleteUserDialog] = React.useState<{
    open: boolean
    user?: UserListType
  }>({ open: false })

  // API Hooks
  const { data: departments = [] } = useDepartments()
  const { data: mentors = [] } = useMentors()
  const departmentSegmentOptions = React.useMemo(
    () => [
      { label: '全部', value: 'all' },
      ...departments.map((department) => ({
        label: department.name,
        value: department.id.toString(),
      })),
    ],
    [departments]
  )
  const createInitialDepartmentId = selectedDepartmentId !== 'all'
    ? Number(selectedDepartmentId)
    : undefined
  const createInitialMentorId = selectedMentorId !== 'all'
    ? Number(selectedMentorId)
    : undefined
  const departmentFilter = selectedDepartmentId !== 'all'
    ? Number(selectedDepartmentId)
    : undefined
  const mentorFilter = selectedMentorId !== 'all'
    ? Number(selectedMentorId)
    : undefined
  const { data, isLoading } = useUsers({
    search,
    departmentId: departmentFilter,
    mentorId: mentorFilter,
  })
  const activateUser = useActivateUser()
  const deactivateUser = useDeactivateUser()
  const deleteUser = useDeleteUser()
  const changePassword = useChangePassword()
  const updateUserAvatar = useUpdateUserAvatar()

  // 筛选变化时重置页码
  React.useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [search, selectedDepartmentId, selectedMentorId])

  React.useEffect(() => {
    if (!userIdFromParam || Number.isNaN(userIdFromParam)) return
    setEditingUserId(userIdFromParam)
    setFormModalOpen(true)
  }, [userIdFromParam])

  const filteredUsers = data || []

  const handleToggleActive = async (user: UserListType) => {
    try {
      if (user.is_active) {
        await deactivateUser.mutateAsync(user.id)
        toast.success("账号已停用")
      } else {
        await activateUser.mutateAsync(user.id)
        toast.success("账号已启用")
      }
    } catch (error) {
      showApiError(error)
    }
  }

  const closeChangePasswordDialog = () => {
    setChangePasswordDialog({ open: false })
    setNewPassword('')
    setPasswordError(undefined)
  }

  const openChangePasswordDialog = (user: UserListType) => {
    setChangePasswordDialog({ open: true, userId: user.id, username: user.username })
    setNewPassword('')
    setPasswordError(undefined)
  }

  const handleChangePassword = async () => {
    if (!changePasswordDialog.userId) return
    const password = newPassword.trim()
    if (!password) {
      setPasswordError('请输入新密码')
      return
    }

    try {
      await changePassword.mutateAsync({ userId: changePasswordDialog.userId, password })
      toast.success("密码已修改")
      closeChangePasswordDialog()
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
      meta: { width: '28%', minWidth: '240px' },
      cell: ({ row }) => (
        <CellWithAvatar
          name={row.original.username}
          subtitle={row.original.employee_id || 'NO ID'}
          className="gap-3.5"
          avatar={(
            <AvatarPickerPopover
              avatarKey={row.original.avatar_key}
              name={row.original.username}
              size="md"
              className="h-[35px] w-[35px]"
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
      meta: { width: '22%', minWidth: '180px' },
      cell: ({ row }) => (
        <CellTags
          tags={row.original.roles.map((role: Role) => ({
            key: role.code,
            label: role.name,
            bgClass: getRoleColor(role.code).bgClass,
          }))}
        />
      ),
    },
    {
      header: "所属部门",
      id: "department",
      meta: { minWidth: '140px' },
      cell: ({ row }) => (
        <span className="text-[13px] font-medium text-text-muted">
          {row.original.department?.name || "未分配"}
        </span>
      ),
    },
    {
      header: "指导老师",
      id: "mentor",
      meta: { width: '120px' },
      cell: ({ row }) => {
        const mentor = row.original.mentor
        if (!mentor) return <span className="text-[13px] font-medium text-text-muted">未分配</span>
        return <CellSmallAvatar name={mentor.username} avatarKey={mentor.avatar_key} />
      },
    },
    {
      header: "状态",
      id: "status",
      meta: { width: '88px' },
      cell: ({ row }) => (
        <CellStatus isActive={row.original.is_active} />
      ),
    },
    {
      header: "操作",
      id: "actions",
      meta: { minWidth: '184px' },
      cell: ({ row }) => (
        <div className="inline-flex flex-nowrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Tooltip title="编辑资料">
            <Button
              variant="ghost"
              size="icon"
              disabled={!canUpdateUser}
              className={LIST_ACTION_ICON_EDIT_CLASS}
              onClick={() => {
                if (!canUpdateUser) return
                setEditingUserId(row.original.id)
                setFormModalOpen(true)
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </Tooltip>
          {canChangePassword && (
            <Tooltip title="修改密码">
              <Button
                variant="ghost"
                size="icon"
                className={LIST_ACTION_ICON_WARNING_CLASS}
                onClick={() => openChangePasswordDialog(row.original)}
              >
                <Lock className="h-4 w-4" />
              </Button>
            </Tooltip>
          )}
          {canManageUserAccount && (
            <Tooltip title={row.original.is_active ? "停用账号" : "启用账号"}>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  row.original.is_active
                    ? LIST_ACTION_ICON_DESTRUCTIVE_CLASS
                    : LIST_ACTION_ICON_SUCCESS_CLASS,
                  "disabled:pointer-events-none disabled:opacity-50",
                )}
                onClick={() => handleToggleActive(row.original)}
              >
                {row.original.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
              </Button>
            </Tooltip>
          )}
          {canDeleteUser && (
            <Tooltip title="彻底删除">
              <Button
                variant="ghost"
                size="icon"
                className={LIST_ACTION_ICON_DESTRUCTIVE_CLASS}
                onClick={() => {
                  if (row.original.is_active) {
                    toast.error("请先停用账号，再执行彻底删除")
                    return
                  }
                  setDeleteUserDialog({ open: true, user: row.original })
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Tooltip>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <PageFillShell>
        <PageHeader
          title="用户中心"
          icon={<UsersIcon />}
        />

        <PageWorkbench>
          <div className="flex min-h-0 flex-1 flex-col self-stretch">
            <UserDirectoryFilters
              departmentOptions={departmentSegmentOptions}
              selectedDepartmentId={selectedDepartmentId}
              onDepartmentChange={setSelectedDepartmentId}
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="检索姓名、工号、部位..."
              leftExtra={(
                <div className={COMPACT_FILTER_SELECT_CLASSNAME}>
                  <Select value={selectedMentorId} onValueChange={setSelectedMentorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="全部导师" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部导师</SelectItem>
                      {mentors.map((mentor) => (
                        <SelectItem key={mentor.id} value={mentor.id.toString()}>
                          {mentor.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              rightExtra={canCreateUser ? (
                <CircleButton
                  onClick={() => {
                    setEditingUserId(undefined)
                    setFormModalOpen(true)
                  }}
                  label="快速录入"
                  className="shrink-0"
                />
              ) : undefined}
            />

            <div className="flex min-h-0 flex-1 flex-col">
              <DataTable
                columns={columns}
                data={filteredUsers}
                isLoading={isLoading}
                pagination={{
                  pageIndex: pagination.pageIndex,
                  pageSize: pagination.pageSize,
                  defaultPageSize: 10,
                  pageCount: Math.ceil(filteredUsers.length / pagination.pageSize),
                  totalCount: filteredUsers.length,
                  onPageChange: (page) => setPagination(prev => ({ ...prev, pageIndex: page })),
                  onPageSizeChange: (size) => setPagination(prev => ({ ...prev, pageSize: size, pageIndex: 0 })),
                }}
                rowClassName="group"
                onRowClick={(row) => {
                  if (!canOpenUserEditor) return
                  setEditingUserId(row.id)
                  setFormModalOpen(true)
                }}
              />
            </div>
          </div>
        </PageWorkbench>
      </PageFillShell>

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
      />

      <Dialog
        open={changePasswordDialog.open}
        onOpenChange={(open) => {
          if (!open) closeChangePasswordDialog()
        }}
      >
        <DialogContent className="max-w-md rounded-xl border border-border p-7 [&>button]:hidden">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-warning-100 text-warning">
              <Lock className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-xl font-bold text-foreground">修改密码</DialogTitle>
            <DialogDescription className="text-center text-sm text-text-muted">
              {changePasswordDialog.username ? `为「${changePasswordDialog.username}」设置新密码` : '设置新密码'}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-2">
            <Input
              type="password"
              value={newPassword}
              autoFocus
              placeholder="输入新密码"
              onChange={(event) => {
                setNewPassword(event.target.value)
                setPasswordError(undefined)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void handleChangePassword()
                }
              }}
            />
            {passwordError && <p className="text-xs font-bold text-destructive">{passwordError}</p>}
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeChangePasswordDialog}
              disabled={changePassword.isPending}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={() => void handleChangePassword()}
              disabled={changePassword.isPending}
            >
              {changePassword.isPending ? '保存中' : '保存'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

    </>
  )
}
