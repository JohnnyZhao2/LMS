import * as React from "react"
import { type ColumnDef } from "@tanstack/react-table"
import {
  Users,
  Plus,
  Pencil,
  Lock,
  Ban,
  CheckCircle,
  Search,
  ShieldCheck,
  UserCheck,
  Building2,
  RefreshCw,
  MoreVertical
} from "lucide-react"
import { useUsers } from "../api/get-users"
import { useActivateUser, useDeactivateUser, useResetPassword } from "../api/manage-users"
import { UserForm } from "./user-form"
import { DataTable } from "@/components/ui/data-table/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { showApiError } from "@/utils/error-handler"
import dayjs from "@/lib/dayjs"
import { cn } from "@/lib/utils"
import type { UserList as UserListType, Role } from "@/types/api"
import { PageHeader } from "@/components/ui"

export const UserList: React.FC = () => {
  const [search, setSearch] = React.useState("")
  const [searchInput, setSearchInput] = React.useState("")
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

  const { data, isLoading, refetch } = useUsers({ search })
  const activateUser = useActivateUser()
  const deactivateUser = useDeactivateUser()
  const resetPassword = useResetPassword()

  // 统计逻辑
  const stats = React.useMemo(() => {
    const users = data || []
    return {
      total: users.length,
      active: users.filter(u => u.is_active).length,
      admins: users.filter(u => u.roles.some(r => r.code === 'ADMIN')).length,
      new: users.filter(u => dayjs(u.created_at).isAfter(dayjs().subtract(7, 'day'))).length
    }
  }, [data])

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

  const handleSearch = () => {
    setSearch(searchInput)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const columns: ColumnDef<UserListType>[] = [
    {
      id: "user",
      header: "用户信息",
      cell: ({ row }) => (
        <div className="flex items-center gap-4 py-2">
          <div className="relative">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-black text-xl transition-transform duration-200 hover:scale-110"
              style={{
                backgroundColor: "#3B82F6",
              }}
            >
              {row.original.username?.charAt(0) || "?"}
            </div>
            <div className={cn(
              "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
              row.original.is_active ? "bg-[#10B981]" : "bg-[#9CA3AF]"
            )} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-[#111827] group-hover:text-[#3B82F6] transition-colors">
              {row.original.username}
            </span>
            <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider flex items-center gap-1">
              {row.original.employee_id || 'NO ID'}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "roles",
      header: "权限角色",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          {row.original.roles.map((role: Role) => (
            <Badge
              key={role.code}
              className={cn(
                "border-0 shadow-none",
                role.code === 'ADMIN' ? "bg-[#FEE2E2] text-[#DC2626]" :
                  role.code === 'MENTOR' ? "bg-[#DBEAFE] text-[#3B82F6]" :
                    "bg-[#DBEAFE] text-[#3B82F6]"
              )}
            >
              {role.name}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: "department",
      header: "所属部门",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-[#F3F4F6] text-[#6B7280]">
            <Building2 className="w-4 h-4" />
          </div>
          <span className={cn(
            "text-sm font-bold",
            row.original.department ? "text-[#111827]" : "text-[#6B7280] italic"
          )}>
            {row.original.department?.name || "未分配"}
          </span>
        </div>
      ),
    },
    {
      id: "mentor",
      header: "指导老师",
      cell: ({ row }) => {
        const mentor = row.original.mentor
        if (!mentor) return <span className="text-[#9CA3AF] italic text-xs font-bold uppercase tracking-wider">未分配</span>
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#E0F2FE] text-[#0EA5E9] flex items-center justify-center text-xs font-black border-0">
              {mentor.username?.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-bold text-[#111827]">{mentor.username}</span>
          </div>
        )
      },
    },
    {
      id: "is_active",
      header: "状态",
      cell: ({ row }) => (
        <Badge
          variant={row.original.is_active ? "success" : "secondary"}
          className={cn(
            "border-0 shadow-none",
            row.original.is_active
              ? "bg-[#D1FAE5] text-[#10B981]"
              : "bg-[#F3F4F6] text-[#6B7280]"
          )}
        >
          {row.original.is_active ? "活跃" : "已停用"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-md hover:bg-[#F3F4F6] hover:text-[#3B82F6] shadow-none">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-lg p-2 border-0 bg-white shadow-none">
            <DropdownMenuLabel className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider px-4 py-2">账号控制台</DropdownMenuLabel>

            <div className="space-y-1">
              <DropdownMenuItem
                className="rounded-md px-4 py-3 font-medium text-[#111827] focus:bg-[#F3F4F6] focus:text-[#3B82F6] cursor-pointer transition-colors"
                onClick={() => {
                  setEditingUserId(row.original.id)
                  setFormModalOpen(true)
                }}
              >
                <Pencil className="mr-3 h-4 w-4" /> 编辑资料
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-md px-4 py-3 font-medium text-[#111827] focus:bg-[#F3F4F6] focus:text-[#3B82F6] cursor-pointer transition-colors"
                onClick={() => setResetPasswordDialog({ open: true, userId: row.original.id })}
              >
                <Lock className="mr-3 h-4 w-4" /> 重置密码
              </DropdownMenuItem>
            </div>

            <DropdownMenuSeparator className="bg-[#E5E7EB] my-2 mx-4" />

            <DropdownMenuItem
              className={cn(
                "rounded-md px-4 py-3 font-medium cursor-pointer transition-colors",
                row.original.is_active
                  ? "text-[#DC2626] focus:bg-[#FEE2E2] focus:text-[#DC2626]"
                  : "text-[#10B981] focus:bg-[#D1FAE5] focus:text-[#10B981]"
              )}
              onClick={() => handleToggleActive(row.original)}
            >
              {row.original.is_active ? (
                <><Ban className="mr-3 h-4 w-4" /> 停用账号</>
              ) : (
                <><CheckCircle className="mr-3 h-4 w-4" /> 启用账号</>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-8 pb-20 min-h-[calc(100vh-8rem)]">
      <PageHeader
        title="用户管理"
        subtitle="Accounts & Permissions"
        icon={<Users />}
        extra={
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              className="h-14 px-6 rounded-md font-semibold text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#3B82F6] transition-all duration-200 shadow-none"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              刷新
            </Button>
            <Button
              onClick={() => {
                setEditingUserId(undefined)
                setFormModalOpen(true)
              }}
              className="h-14 px-8 rounded-md bg-[#3B82F6] text-white hover:bg-[#2563EB] hover:scale-105 transition-all duration-200 shadow-none"
            >
              <Plus className="mr-2 h-5 w-5" />
              新增用户
            </Button>
          </div>
        }
      />

      {/* 统计网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 border-0 shadow-none transition-all duration-200 hover:scale-[1.02]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-[#3B82F6] flex items-center justify-center text-white">
              <UserCheck className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1">活跃用户</p>
              <h3 className="text-3xl font-bold text-[#111827]">{stats.active}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 border-0 shadow-none transition-all duration-200 hover:scale-[1.02]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-[#3B82F6] flex items-center justify-center text-white">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1">管理员</p>
              <h3 className="text-3xl font-bold text-[#111827]">{stats.admins}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 border-0 shadow-none transition-all duration-200 hover:scale-[1.02]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-[#F59E0B] flex items-center justify-center text-white">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1">总用户数</p>
              <h3 className="text-3xl font-bold text-[#111827]">{stats.total}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 border-0 shadow-none transition-all duration-200 hover:scale-[1.02]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-[#10B981] flex items-center justify-center text-white">
              <Plus className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1">近一周新增</p>
              <h3 className="text-3xl font-bold text-[#111827]">{stats.new}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* 列表主体 */}
      <div>
        <div className="bg-white rounded-lg p-8 border-0 shadow-none overflow-hidden">
          {/* 搜索和筛选 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
              <Input
                placeholder="搜索姓名、工号、电子邮箱..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-14 pl-12 pr-4 bg-[#F3F4F6] rounded-md border-0 focus:bg-white focus:border-2 focus:border-[#3B82F6] text-base font-medium shadow-none"
              />
            </div>

            <div className="flex items-center gap-6">
              <Button
                onClick={handleSearch}
                className="h-14 px-8 rounded-md font-semibold bg-[#3B82F6] text-white hover:bg-[#2563EB] hover:scale-105 transition-all duration-200 shadow-none"
              >
                搜索
              </Button>
              <div className="h-12 w-[1px] bg-[#E5E7EB] mx-2" />
              <div className="text-right">
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">Total Users</span>
                <span className="text-2xl font-bold text-[#111827]">{data?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* 表格容器 */}
          <div className="overflow-hidden rounded-lg">
            <DataTable
              columns={columns}
              data={data || []}
              isLoading={isLoading}
              className="border-none"
              rowClassName="group cursor-pointer"
              onRowClick={(row) => {
                setEditingUserId(row.id)
                setFormModalOpen(true)
              }}
            />
          </div>
        </div>
      </div>

      {/* 用户表单弹窗 */}
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

      {/* 重置密码确认对话框 */}
      <Dialog
        open={resetPasswordDialog.open}
        onOpenChange={(open) => setResetPasswordDialog({ open, userId: resetPasswordDialog.userId })}
      >
        <DialogContent className="rounded-lg max-w-md p-10 border-0 bg-white shadow-none">
          <DialogHeader>
            <div className="w-20 h-20 bg-[#DBEAFE] text-[#3B82F6] rounded-full flex items-center justify-center mb-8 mx-auto">
              <Lock className="h-10 w-10" />
            </div>
            <DialogTitle className="text-2xl font-bold text-[#111827] mb-4 text-center tracking-tight">重置密码？</DialogTitle>
            <DialogDescription className="text-[#6B7280] font-medium text-center text-base leading-relaxed">
              系统将生成一个<span className="text-[#3B82F6] font-semibold">临时密码</span>。<br />
              用户下次登录时必须修改。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-10 gap-4 sm:flex-row">
            <Button
              variant="ghost"
              onClick={() => setResetPasswordDialog({ open: false })}
              className="flex-1 rounded-md h-14 font-semibold text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] shadow-none"
            >
              取消
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resetPassword.isPending}
              className="flex-1 bg-[#DC2626] text-white rounded-md h-14 font-semibold hover:bg-[#B91C1C] hover:scale-105 transition-all duration-200 shadow-none"
            >
              {resetPassword.isPending ? "处理中..." : "确认重置"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 临时密码显示对话框 */}
      <Dialog
        open={tempPasswordDialog.open}
        onOpenChange={(open) => setTempPasswordDialog({ open, password: tempPasswordDialog.password })}
      >
        <DialogContent className="rounded-lg max-w-md p-10 border-0 bg-white shadow-none">
          <DialogHeader>
            <div className="w-20 h-20 bg-[#D1FAE5] text-[#10B981] rounded-full flex items-center justify-center mb-8 mx-auto">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <DialogTitle className="text-2xl font-bold text-[#111827] mb-3 text-center tracking-tight">重置成功</DialogTitle>
            <DialogDescription className="text-[#6B7280] font-medium text-center text-base">
              请务必将此密码<span className="text-[#111827] font-semibold">安全地</span>转交给用户
            </DialogDescription>
          </DialogHeader>

          <div className="mt-8 relative group cursor-pointer" onClick={() => {
            navigator.clipboard.writeText(tempPasswordDialog.password || '');
            toast.success('密码已复制');
          }}>
            <div className="relative bg-[#F3F4F6] rounded-lg p-8 text-center transition-all duration-200 hover:scale-[1.02] shadow-none">
              <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3 block">临时密码</span>
              <code className="text-3xl font-bold text-[#3B82F6] tracking-widest font-mono">
                {tempPasswordDialog.password}
              </code>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                点击复制
              </div>
            </div>
          </div>

          <DialogFooter className="mt-10">
            <Button
              onClick={() => setTempPasswordDialog({ open: false })}
              className="w-full bg-[#111827] text-white rounded-md h-14 font-semibold hover:bg-[#374151] hover:scale-105 transition-all duration-200 shadow-none"
            >
              完成并关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
