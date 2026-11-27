/**
 * 用户管理页面
 * 顶部筛选工具带 | 用户列表（DataTable）| 详情面板
 */
import * as React from "react"
import { type ColumnDef } from "@tanstack/react-table"
import {
  Eye,
  Pencil,
  KeyRound,
  Trash2,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useUsers, useDepartments, useMentors, useRoles } from '@/api/users/get-users'
import { useChangePassword, useDeleteUser, useUpdateUserAvatar } from '@/api/users/manage-users'
import { UserForm } from "./user-form"
import { AvatarPickerPopover } from '@/components/users/avatar-picker-popover'
import { getRoleColor, SUPERUSER_VISUAL } from "@/lib/role-config"
import { DataTable } from '@/components/ui/data-table/data-table';
import {
  LIST_ACTION_ICON_ANALYTICS_CLASS,
  LIST_ACTION_ICON_DESTRUCTIVE_CLASS,
  LIST_ACTION_ICON_EDIT_CLASS,
  LIST_ACTION_ICON_WARNING_CLASS,
} from '@/components/ui/data-table/action-icon-styles';
import { CellWithAvatar, CellSmallAvatar } from '@/components/ui/data-table/data-table-cells';
import { CircleButton } from "@/components/ui/circle-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ListTag } from '@/components/ui/list-tag';
import { COMPACT_FILTER_SELECT_CLASSNAME, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tooltip } from '@/components/ui/tooltip';
import { PageWorkbench } from '@/components/ui/page-shell';
import { toast } from "sonner"
import { showApiError } from "@/utils/error-handler"
import type { UserList as UserListType, Role } from '@/types/common';
import { UserDirectoryFilters } from "./user-directory-filters"
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { LEARNER_ROLE_VALUE, USER_ROLE_ASSIGN_PERMISSION } from '@/config/authorization';
import { ROUTES } from '@/config/routes';

const DISABLED_ACTION_CLASS = 'disabled:opacity-25 disabled:grayscale'

export const UserList: React.FC = () => {
  const navigate = useNavigate()
  const { user, hasCapability, isImpersonating, startImpersonation } = useAuth()
  const isSuperuser = Boolean(user?.is_superuser)
  const hasPermission = (code: string) => isSuperuser || hasCapability(code)
  const canCreateUser = hasPermission('users.add_user')
  const canUpdateUser = hasPermission('users.change_user')
  const canDeleteUser = hasPermission('users.delete_user')
  const canChangePassword = canUpdateUser
  const canOpenUserEditor = canUpdateUser || hasPermission(USER_ROLE_ASSIGN_PERMISSION)
  const canAdminEditAvatar = hasPermission('users.change_user_avatar')
  const canJumpToAuthorization = hasPermission(USER_ROLE_ASSIGN_PERMISSION)
  const canManageUser = React.useCallback(
    (target: UserListType) => (
      !target.is_superuser
      && (isSuperuser || (target.id !== user?.id && !target.roles.some((r) => r.code === 'ADMIN')))
    ),
    [isSuperuser, user?.id],
  )

  // 筛选状态
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState<string>('all')
  const [selectedMentorId, setSelectedMentorId] = React.useState<string>('all')
  const [selectedRoleCode, setSelectedRoleCode] = React.useState<string>('all')
  const [search, setSearch] = React.useState("")

  // 分页状态
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  // 用户操作状态
  const [impersonatingUserId, setImpersonatingUserId] = React.useState<number | null>(null)
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
  const { data: availableRoles = [] } = useRoles()
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
  const deleteUser = useDeleteUser()
  const changePassword = useChangePassword()
  const updateUserAvatar = useUpdateUserAvatar()

  const withPageReset = (setter: React.Dispatch<React.SetStateAction<string>>) => (value: string) => {
    setter(value)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }

  const filteredUsers = React.useMemo(() => {
    const list = data || []
    if (selectedRoleCode === 'all') return list
    if (selectedRoleCode === LEARNER_ROLE_VALUE) {
      return list.filter((u) => !u.is_superuser && !u.roles.some((r) => r.is_active !== false))
    }
    return list.filter((u) => u.roles.some((r) => r.code === selectedRoleCode))
  }, [data, selectedRoleCode])

  const closeChangePasswordDialog = () => {
    setChangePasswordDialog({ open: false })
    setNewPassword('')
    setPasswordError(undefined)
  }

  const openChangePasswordDialog = React.useCallback((targetUser: UserListType) => {
    setChangePasswordDialog({ open: true, userId: targetUser.id, username: targetUser.username })
    setNewPassword('')
    setPasswordError(undefined)
  }, [])

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

  const handleUserAvatarSelect = React.useCallback(async (targetUser: UserListType, avatarKey: string) => {
    try {
      await updateUserAvatar.mutateAsync({
        id: targetUser.id,
        data: { avatar_key: avatarKey },
      })
      toast.success(`已更新 ${targetUser.username} 的头像`)
    } catch (error) {
      showApiError(error, '头像更新失败')
    }
  }, [updateUserAvatar])

  const handleImpersonate = React.useCallback(async (targetUser: UserListType) => {
    if (impersonatingUserId !== null) return
    setImpersonatingUserId(targetUser.id)
    try {
      await startImpersonation(targetUser.id)
      toast.success(`已切换为「${targetUser.username}」视角`)
      navigate(ROUTES.DASHBOARD)
    } catch (error) {
      showApiError(error, '切换用户视角失败')
    } finally {
      setImpersonatingUserId(null)
    }
  }, [impersonatingUserId, navigate, startImpersonation])

  // DataTable 列定义 - 使用共用 Cell 组件
  const columns = React.useMemo<ColumnDef<UserListType>[]>(() => [
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
              canEdit={canAdminEditAvatar && canManageUser(row.original)}
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
      cell: ({ row }) => {
        if (row.original.is_superuser) {
          return (
            <ListTag size="sm" className={cn(SUPERUSER_VISUAL.bgClass, SUPERUSER_VISUAL.textClass)}>
              超管
            </ListTag>
          )
        }
        if (row.original.roles.length === 0) {
          return <span className="text-xs text-text-muted">普通学员</span>
        }
        const visibleRoles = row.original.roles.slice(0, 3)
        const hiddenRoles = row.original.roles.slice(3)
        return (
          <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {visibleRoles.map((role: Role) => {
              const isInactive = role.is_active === false
              const visual = getRoleColor(role.code)
              const tag = (
                <ListTag
                  size="sm"
                  className={cn(
                    isInactive ? 'bg-slate-100 text-slate-400 line-through' : visual.bgClass,
                    !isInactive && visual.textClass,
                    canJumpToAuthorization && 'cursor-pointer transition-opacity hover:opacity-80',
                  )}
                >
                  {isInactive ? `${role.name}（已停用）` : role.name}
                </ListTag>
              )
              if (!canJumpToAuthorization) {
                return <React.Fragment key={role.code}>{tag}</React.Fragment>
              }
              return (
                <button
                  key={role.code}
                  type="button"
                  title={`查看「${role.name}」权限配置`}
                  onClick={() => navigate(`${ROUTES.AUTHORIZATION}?role_code=${encodeURIComponent(role.code)}`)}
                  className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {tag}
                </button>
              )
            })}
            {hiddenRoles.length > 0 && (
              <Tooltip title={hiddenRoles.map((role) => role.name).join('、')}>
                <ListTag size="sm" className="bg-slate-100 text-slate-600">
                  +{hiddenRoles.length}
                </ListTag>
              </Tooltip>
            )}
          </div>
        )
      },
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
      header: "操作",
      id: "actions",
      meta: { minWidth: '172px' },
      cell: ({ row }) => {
        const manageable = canManageUser(row.original)
        const canImpersonateTarget = !row.original.is_superuser && row.original.is_active !== false
        return (
        <div className="inline-flex flex-nowrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {isSuperuser && !isImpersonating && (
            <Tooltip
              title={
                canImpersonateTarget
                  ? "以此身份查看（仅当前标签页）"
                  : row.original.is_superuser
                    ? "不可切换超管账号"
                    : "停用账号不可登录"
              }
            >
              <Button
                variant="ghost"
                size="icon"
                aria-label={`以 ${row.original.username} 身份查看`}
                disabled={!canImpersonateTarget || impersonatingUserId !== null}
                className={cn(LIST_ACTION_ICON_ANALYTICS_CLASS, DISABLED_ACTION_CLASS)}
                onClick={() => {
                  if (!canImpersonateTarget) return
                  void handleImpersonate(row.original)
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </Tooltip>
          )}
          <Tooltip title={manageable ? "编辑资料" : "不可操作当前账号"}>
            <Button
              variant="ghost"
              size="icon"
              disabled={!canOpenUserEditor || !manageable}
              className={cn(LIST_ACTION_ICON_EDIT_CLASS, DISABLED_ACTION_CLASS)}
              onClick={() => {
                if (!canOpenUserEditor || !manageable) return
                setEditingUserId(row.original.id)
                setFormModalOpen(true)
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </Tooltip>
          {canChangePassword && (
            <Tooltip title={manageable ? "修改密码" : "不可修改当前账号密码"}>
              <Button
                variant="ghost"
                size="icon"
                disabled={!manageable}
                className={cn(LIST_ACTION_ICON_WARNING_CLASS, DISABLED_ACTION_CLASS)}
                onClick={() => manageable && openChangePasswordDialog(row.original)}
              >
                <KeyRound className="h-4 w-4" />
              </Button>
            </Tooltip>
          )}
          {canDeleteUser && (
            <Tooltip title={manageable ? "彻底删除" : "不可删除当前账号"}>
              <Button
                variant="ghost"
                size="icon"
                disabled={!manageable}
                className={cn(LIST_ACTION_ICON_DESTRUCTIVE_CLASS, DISABLED_ACTION_CLASS)}
                onClick={() => {
                  if (!manageable) return
                  setDeleteUserDialog({ open: true, user: row.original })
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Tooltip>
          )}
        </div>
        )
      },
    },
  ], [
    canAdminEditAvatar,
    canChangePassword,
    canDeleteUser,
    canJumpToAuthorization,
    canManageUser,
    canOpenUserEditor,
    handleImpersonate,
    handleUserAvatarSelect,
    impersonatingUserId,
    isImpersonating,
    isSuperuser,
    navigate,
    openChangePasswordDialog,
    updateUserAvatar.isPending,
  ])

  return (
    <>
      <PageWorkbench>
          <div className="flex min-h-0 flex-1 flex-col self-stretch">
            <UserDirectoryFilters
              departmentOptions={departmentSegmentOptions}
              selectedDepartmentId={selectedDepartmentId}
              onDepartmentChange={withPageReset(setSelectedDepartmentId)}
              search={search}
              onSearchChange={withPageReset(setSearch)}
              searchPlaceholder="检索姓名、工号、部门..."
              leftExtra={(
                <div className="flex flex-wrap items-center gap-2">
                  <div className={COMPACT_FILTER_SELECT_CLASSNAME}>
                    <Select value={selectedRoleCode} onValueChange={withPageReset(setSelectedRoleCode)}>
                      <SelectTrigger>
                        <SelectValue placeholder="全部角色" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部角色</SelectItem>
                        <SelectItem value={LEARNER_ROLE_VALUE}>普通学员</SelectItem>
                        {availableRoles.map((role) => (
                          <SelectItem key={role.code} value={role.code}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={COMPACT_FILTER_SELECT_CLASSNAME}>
                    <Select value={selectedMentorId} onValueChange={withPageReset(setSelectedMentorId)}>
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
                  if (!canOpenUserEditor || !canManageUser(row)) return
                  setEditingUserId(row.id)
                  setFormModalOpen(true)
                }}
              />
            </div>
          </div>
        </PageWorkbench>

      {/* User Form Modal */}
      <UserForm
        open={formModalOpen}
        userId={editingUserId}
        initialDepartmentId={editingUserId ? undefined : departmentFilter}
        initialMentorId={editingUserId ? undefined : mentorFilter}
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
              <KeyRound className="h-6 w-6" />
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
        title="彻底删除该用户？"
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
