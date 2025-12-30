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
  MoreHorizontal,
  Shield,
  RefreshCw,
} from "lucide-react"
import { useUsers } from "../api/get-users"
import { useActivateUser, useDeactivateUser, useResetPassword } from "../api/manage-users"
import { UserFormModal } from "./user-form-modal"
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
import { PageHeader, StatCard } from "@/components/ui"

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
        <div className="flex items-center gap-4 py-1">
          <div className="relative">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-inner group-hover:scale-110 transition-transform duration-300"
              style={{
                background: "linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-700) 100%)",
              }}
            >
              {row.original.username?.charAt(0) || "?"}
            </div>
            <div className={cn(
              "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm",
              row.original.is_active ? "bg-success-500" : "bg-gray-300"
            )} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
              {row.original.username}
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
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
        <div className="flex flex-wrap gap-1.5">
          {row.original.roles.map((role: Role) => (
            <Badge
              key={role.code}
              className={cn(
                "badge-pill border-none px-2 py-0.5 text-[10px] font-bold uppercase",
                role.code === 'ADMIN' ? "bg-error-500/10 text-error-600" :
                  role.code === 'MENTOR' ? "bg-purple-500/10 text-purple-600" :
                    "bg-primary-500/10 text-primary-600"
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
          <Building2 className="w-3.5 h-3.5 text-gray-400" />
          <span className={cn(
            "text-xs font-bold",
            row.original.department ? "text-gray-700" : "text-gray-300 italic"
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
        if (!mentor) return <span className="text-gray-300 italic text-[10px] font-bold uppercase">未分配导师</span>
        return (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center text-[10px] font-black border border-cyan-100">
              {mentor.username?.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-bold text-gray-700">{mentor.username}</span>
          </div>
        )
      },
    },
    {
      id: "is_active",
      header: "状态",
      cell: ({ row }) => (
        <Badge
          className={cn(
            "badge-pill border-none",
            row.original.is_active ? "bg-success-500/10 text-success-600" : "bg-gray-100 text-gray-400"
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
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-gray-100">
              <MoreHorizontal className="h-5 w-5 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 border-none shadow-premium animate-fadeIn">
            <DropdownMenuLabel className="text-[10px] font-bold text-gray-400 uppercase px-3 py-2">账号操作</DropdownMenuLabel>
            <DropdownMenuItem
              className="rounded-xl px-3 py-2.5 font-bold text-gray-700 focus:bg-primary-50 focus:text-primary-600 cursor-pointer"
              onClick={() => {
                setEditingUserId(row.original.id)
                setFormModalOpen(true)
              }}
            >
              <Pencil className="mr-2 h-4 w-4" /> 编辑资料
            </DropdownMenuItem>
            <DropdownMenuItem
              className="rounded-xl px-3 py-2.5 font-bold text-gray-700 focus:bg-purple-50 focus:text-purple-600 cursor-pointer"
              onClick={() => setResetPasswordDialog({ open: true, userId: row.original.id })}
            >
              <Lock className="mr-2 h-4 w-4" /> 重置密码
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-100 my-1 mx-2" />
            <DropdownMenuItem
              className={cn(
                "rounded-xl px-3 py-2.5 font-bold cursor-pointer",
                row.original.is_active ? "text-error-500 focus:bg-error-50" : "text-success-500 focus:bg-success-50"
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
      ),
    },
  ]

  return (
    <div className="space-y-10 animate-fadeIn overflow-x-hidden pb-10">
      <PageHeader
        title="用户管理"
        subtitle="Accounts & Permissions"
        icon={<Users />}
        extra={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="h-auto py-3 px-6 rounded-2xl border-2 border-gray-100 font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4" />
              刷新
            </Button>
            <Button
              onClick={() => {
                setEditingUserId(undefined)
                setFormModalOpen(true)
              }}
              className="btn-gradient h-12 px-6 rounded-xl text-white font-bold shadow-md shadow-primary-500/20 hover:scale-105 transition-all duration-300"
            >
              <Plus className="mr-2 h-5 w-5" />
              新增用户
            </Button>
          </div>
        }
      />

      {/* 统计网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="活跃用户"
          value={stats.active}
          icon={UserCheck}
          color="var(--color-primary-500)"
          gradient="linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-300) 100%)"
          delay="stagger-delay-1"
        />
        <StatCard
          title="管理员"
          value={stats.admins}
          icon={ShieldCheck}
          color="var(--color-error-500)"
          gradient="linear-gradient(135deg, var(--color-error-500) 0%, var(--color-error-300) 100%)"
          delay="stagger-delay-2"
        />
        <StatCard
          title="总用户数"
          value={stats.total}
          icon={Users}
          color="var(--color-orange-500)"
          gradient="linear-gradient(135deg, var(--color-orange-500) 0%, var(--color-orange-300) 100%)"
          delay="stagger-delay-3"
        />
        <StatCard
          title="近一周新增"
          value={stats.new}
          icon={Plus}
          color="var(--color-success-500)"
          gradient="linear-gradient(135deg, var(--color-success-500) 0%, var(--color-success-300) 100%)"
          delay="stagger-delay-4"
        />
      </div>

      {/* 列表主体 */}
      <div className="reveal-item stagger-delay-2">
        <div className="glass-card rounded-[2.5rem] p-8 border-none shadow-2xl">
          {/* 搜索和筛选 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div className="relative flex-1 max-w-md group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
              <Input
                placeholder="搜索姓名、工号、电子邮箱..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-14 h-16 bg-gray-50/50 border-none rounded-[1.25rem] focus:ring-4 ring-primary-50 shadow-inner text-base font-medium"
              />
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={handleSearch}
                className="h-14 px-8 rounded-2xl bg-primary-600 text-white font-bold hover:bg-primary-700 shadow-lg shadow-primary-500/20 transition-all duration-300 transform hover:scale-105"
              >
                搜索
              </Button>
              <div className="h-10 w-[1px] bg-gray-100 mx-2" />
              <span className="text-sm font-bold text-gray-400">
                Found <span className="text-gray-900">{data?.length || 0}</span> matches
              </span>
            </div>
          </div>

          {/* 表格 */}
          <div className="overflow-hidden rounded-[1.5rem] border border-gray-100/50">
            <DataTable
              columns={columns}
              data={data || []}
              isLoading={isLoading}
              className="border-none"
              rowClassName="hover:bg-primary-50/30 transition-colors cursor-pointer group"
              onRowClick={(row) => {
                setEditingUserId(row.id)
                setFormModalOpen(true)
              }}
            />
          </div>
        </div>
      </div>

      {/* 用户表单弹窗 */}
      <UserFormModal
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
        <DialogContent className="rounded-[2rem] max-w-md p-10 border-none shadow-2xl">
          <DialogHeader>
            <div className="w-20 h-20 bg-purple-50 text-purple-500 rounded-3xl flex items-center justify-center mb-8 mx-auto">
              <Lock className="h-10 w-10" />
            </div>
            <DialogTitle className="text-2xl font-black text-gray-900 mb-2 text-center">锁定并重置密码？</DialogTitle>
            <DialogDescription className="text-gray-500 font-medium text-center leading-relaxed">
              确定要重置该用户的密码吗？系统将自动生成随机临时密码，用户下次登录时必须修改。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-10 gap-4 sm:flex-row">
            <Button
              variant="ghost"
              onClick={() => setResetPasswordDialog({ open: false })}
              className="flex-1 rounded-2xl h-14 font-bold text-gray-500 hover:bg-gray-100"
            >
              放弃
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resetPassword.isPending}
              className="flex-1 bg-purple-500 hover:bg-purple-600 text-white rounded-2xl h-14 font-bold shadow-xl shadow-purple-500/20"
            >
              {resetPassword.isPending ? "处理中..." : "确定重置"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 临时密码显示对话框 */}
      <Dialog
        open={tempPasswordDialog.open}
        onOpenChange={(open) => setTempPasswordDialog({ open, password: tempPasswordDialog.password })}
      >
        <DialogContent className="rounded-[2rem] max-w-md p-10 border-none shadow-2xl">
          <DialogHeader>
            <div className="w-20 h-20 bg-success-50 text-success-500 rounded-3xl flex items-center justify-center mb-8 mx-auto">
              <Shield className="h-10 w-10" />
            </div>
            <DialogTitle className="text-2xl font-black text-gray-900 mb-2 text-center">密码重置成功</DialogTitle>
            <DialogDescription className="text-gray-500 font-medium text-center">
              请务必安全地将此密码转交给用户
            </DialogDescription>
          </DialogHeader>

          <div className="mt-8">
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center group cursor-pointer hover:border-primary-300 transition-colors"
              onClick={() => {
                navigator.clipboard.writeText(tempPasswordDialog.password || '');
                toast.success('密码已复制');
              }}>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">临时密码</span>
              <code className="text-3xl font-black text-primary-600 tracking-wider">
                {tempPasswordDialog.password}
              </code>
              <div className="mt-4 text-[10px] font-bold text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity uppercase">
                点击复制
              </div>
            </div>
          </div>

          <DialogFooter className="mt-10">
            <Button
              onClick={() => setTempPasswordDialog({ open: false })}
              className="w-full bg-gray-900 text-white rounded-2xl h-14 font-bold shadow-xl"
            >
              完成并关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
