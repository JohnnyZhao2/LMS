/**
 * 用户管理页面 - 三栏布局
 * Sidebar（视图切换 + 筛选）| 用户列表（DataTable）| 详情面板
 */
import * as React from "react"
import { type ColumnDef } from "@tanstack/react-table"
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Lock,
  Ban,
  CheckCircle,
  ShieldCheck,
  RefreshCw,
  Building2,
} from "lucide-react"
import { useUsers, useDepartments, useMentors } from "../api/get-users"
import { useActivateUser, useDeactivateUser, useResetPassword } from "../api/manage-users"
import { UserForm } from "./user-form"
import { UserSidebar, type ViewMode } from "./user-sidebar"
import { Users as UsersIcon } from "lucide-react"
import {
  DataTable,
  CellWithAvatar,
  CellTags,
  CellIconText,
  CellSmallAvatar,
  CellStatus,
} from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ContentPanel } from "@/components/ui"
import {
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  PageHeader,
} from "@/components/ui"
import { toast } from "sonner"
import { showApiError } from "@/utils/error-handler"
import { cn } from "@/lib/utils"
import type { UserList as UserListType, Role } from "@/types/api"

export const UserList: React.FC = () => {
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

  // API Hooks
  const { data: departments = [] } = useDepartments()
  const { data: mentors = [] } = useMentors()
  const departmentFilter = viewMode === 'department' && selectedHierarchyId !== 'all'
    ? selectedHierarchyId as number
    : undefined
  const { data, isLoading, refetch } = useUsers({ search, departmentId: departmentFilter })
  const activateUser = useActivateUser()
  const deactivateUser = useDeactivateUser()
  const resetPassword = useResetPassword()

  // 筛选变化时重置页码
  React.useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [search, viewMode, selectedHierarchyId])

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

  // 角色颜色映射
  const getRoleColor = (code: string) => {
    const colorMap: Record<string, { bg: string; color: string }> = {
      ADMIN: { bg: '#FEE2E2', color: '#DC2626' },
      MENTOR: { bg: '#FEF3C7', color: '#F59E0B' },
      DEPT_MANAGER: { bg: '#EDE9FE', color: '#7C3AED' },
      ROOM_MANAGER: { bg: '#EDE9FE', color: '#7C3AED' },
      TEAM_MANAGER: { bg: '#DBEAFE', color: '#3B82F6' },
    }
    return colorMap[code] || { bg: '#DBEAFE', color: '#3B82F6' }
  }

  // DataTable 列定义 - 使用共用 Cell 组件
  const columns: ColumnDef<UserListType>[] = [
    {
      header: "用户信息",
      id: "user",
      size: 400, // 给一个较大的基础参考值，让它倾向于占据更多空间
      cell: ({ row }) => (
        <CellWithAvatar
          name={row.original.username}
          subtitle={row.original.employee_id || 'NO ID'}
        />
      ),
    },
    {
      header: "权限角色",
      id: "roles",
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
      cell: ({ row }) => {
        const mentor = row.original.mentor
        if (!mentor) return <span className="text-[#9CA3AF] italic text-xs">未分配</span>
        return <CellSmallAvatar name={mentor.username} />
      },
    },
    {
      header: "状态",
      id: "status",
      cell: ({ row }) => (
        <CellStatus isActive={row.original.is_active} />
      ),
    },
    {
      header: "操作",
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 min-w-[60px]" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md hover:bg-[#DBEAFE] hover:text-[#3B82F6] text-[#9CA3AF] shadow-none">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-lg p-1 border border-[#E5E7EB]">
              <DropdownMenuLabel className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider px-3 py-2">
                账号控制台
              </DropdownMenuLabel>

              <DropdownMenuItem
                className="rounded-md px-3 py-2 text-sm font-medium cursor-pointer"
                onClick={() => {
                  setEditingUserId(row.original.id)
                  setFormModalOpen(true)
                }}
              >
                <Pencil className="mr-2 h-4 w-4" /> 编辑资料
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-md px-3 py-2 text-sm font-medium cursor-pointer"
                onClick={() => setResetPasswordDialog({ open: true, userId: row.original.id })}
              >
                <Lock className="mr-2 h-4 w-4" /> 重置密码
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuItem
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
                  row.original.is_active
                    ? "text-[#DC2626] focus:bg-[#FEE2E2]"
                    : "text-[#10B981] focus:bg-[#D1FAE5]"
                )}
                onClick={() => handleToggleActive(row.original)}
              >
                {row.original.is_active ? (
                  <><Ban className="mr-2 h-4 w-4" /> 停用账号</>
                ) : (
                  <><CheckCircle className="mr-2 h-4 w-4" /> 启用账号</>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-10 animate-fadeIn pb-20">
      <PageHeader
        title="用户中心"
        subtitle="组织架构与权限管理"
        icon={<UsersIcon />}
        extra={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="h-14 py-3 px-6 rounded-md border-4 border-[#E5E7EB] font-semibold text-[#6B7280] hover:bg-[#F3F4F6] flex items-center gap-2 shadow-none"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4" />
              刷新同步
            </Button>
            <Button
              onClick={() => {
                setEditingUserId(undefined)
                setFormModalOpen(true)
              }}
              className="h-14 px-8 rounded-md bg-[#3B82F6] text-white font-semibold hover:bg-[#2563EB] hover:scale-105 transition-all duration-200 shadow-none"
            >
              <Plus className="mr-2 h-5 w-5" />
              快速录入
            </Button>
          </div>
        }
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
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-lg group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9CA3AF] group-focus-within:text-[#3B82F6] transition-colors" />
              <Input
                placeholder="检索姓名、工号、部位..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-14 h-14 bg-white border-2 border-[#F3F4F6] rounded-md focus:border-[#3B82F6] text-base font-medium shadow-none transition-all"
              />
            </div>
          </div>

          {/* User List - 使用恢复的分页配置 */}
          <ContentPanel padding="md" className="overflow-hidden">
            <DataTable
              columns={columns}
              data={filteredUsers}
              isLoading={isLoading}
              pagination={{
                pageIndex: pagination.pageIndex,
                pageSize: pagination.pageSize,
                pageCount: Math.ceil(filteredUsers.length / pagination.pageSize),
                onPageChange: (page) => setPagination(prev => ({ ...prev, pageIndex: page })),
                onPageSizeChange: (size) => setPagination(prev => ({ ...prev, pageSize: size, pageIndex: 0 })),
              }}
              rowClassName="group cursor-pointer hover:bg-[#F9FAFB] transition-colors"
              onRowClick={(row) => {
                setEditingUserId(row.id)
                setFormModalOpen(true)
              }}
            />
          </ContentPanel>
        </div>
      </div>

      {/* User Form Modal */}
      <UserForm
        open={formModalOpen}
        userId={editingUserId}
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
            系统将生成一个<span className="text-blue-600 font-semibold">临时密码</span>。<br />
            用户下次登录时必须修改。
          </>
        }
        icon={<Lock className="h-10 w-10" />}
        iconBgColor="bg-blue-100"
        iconColor="text-blue-600"
        confirmText="确认重置"
        cancelText="取消"
        confirmVariant="destructive"
        onConfirm={handleResetPassword}
        isConfirming={resetPassword.isPending}
      />

      {/* Temp Password Dialog */}
      <Dialog
        open={tempPasswordDialog.open}
        onOpenChange={(open) => setTempPasswordDialog({ open, password: tempPasswordDialog.password })}
      >
        <DialogContent className="rounded-lg max-w-md p-8 border border-gray-200">
          <DialogHeader>
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 mx-auto">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900 text-center">重置成功</DialogTitle>
            <DialogDescription className="text-gray-500 text-center text-sm">
              请务必将此密码<span className="text-gray-900 font-semibold">安全地</span>转交给用户
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 cursor-pointer" onClick={() => {
            navigator.clipboard.writeText(tempPasswordDialog.password || '');
            toast.success('密码已复制');
          }}>
            <div className="bg-gray-50 rounded-lg p-6 text-center hover:bg-gray-100 transition-colors">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">临时密码</span>
              <code className="text-2xl font-bold text-blue-600 tracking-widest font-mono">
                {tempPasswordDialog.password}
              </code>
              <div className="mt-3 text-xs font-medium text-gray-400">点击复制</div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              onClick={() => setTempPasswordDialog({ open: false })}
              className="w-full bg-gray-900 text-white rounded-lg h-11 font-semibold hover:bg-gray-800"
            >
              完成并关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
