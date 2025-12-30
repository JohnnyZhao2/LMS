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
        <div className="flex items-center gap-4 py-2">
          <div className="relative">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-clay-btn transition-transform duration-300 hover:scale-110"
              style={{
                background: "linear-gradient(135deg, var(--color-clay-primary) 0%, var(--color-clay-secondary) 100%)",
              }}
            >
              {row.original.username?.charAt(0) || "?"}
            </div>
            <div className={cn(
              "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm",
              row.original.is_active ? "bg-clay-success" : "bg-clay-muted"
            )} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-clay-foreground group-hover:text-clay-primary transition-colors">
              {row.original.username}
            </span>
            <span className="text-xs font-bold text-clay-muted uppercase tracking-wider flex items-center gap-1">
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
                "border-none shadow-sm",
                role.code === 'ADMIN' ? "bg-clay-secondary/10 text-clay-secondary" :
                  role.code === 'MENTOR' ? "bg-clay-primary/10 text-clay-primary" :
                    "bg-clay-tertiary/10 text-clay-tertiary"
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
          <div className="p-1.5 rounded-lg bg-clay-muted/5 text-clay-muted">
            <Building2 className="w-4 h-4" />
          </div>
          <span className={cn(
            "text-sm font-bold",
            row.original.department ? "text-clay-foreground" : "text-clay-muted italic"
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
        if (!mentor) return <span className="text-clay-muted/50 italic text-xs font-bold uppercase tracking-wider">未分配</span>
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-clay-tertiary/10 text-clay-tertiary flex items-center justify-center text-xs font-black border border-clay-tertiary/20">
              {mentor.username?.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-bold text-clay-foreground">{mentor.username}</span>
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
            "border-none",
            row.original.is_active
              ? "bg-clay-success/10 text-clay-success"
              : "bg-clay-muted/10 text-clay-muted"
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
            <Button variant="ghost" size="icon" className="h-10 w-10 circle hover:bg-clay-primary/10 hover:text-clay-primary">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-[24px] p-2 border-none shadow-clay-card bg-white/80 backdrop-blur-xl animate-fadeIn">
            <DropdownMenuLabel className="text-[10px] font-black text-clay-muted uppercase tracking-widest px-4 py-2">账号控制台</DropdownMenuLabel>

            <div className="space-y-1">
              <DropdownMenuItem
                className="rounded-xl px-4 py-3 font-bold text-clay-foreground focus:bg-clay-primary/10 focus:text-clay-primary cursor-pointer transition-colors"
                onClick={() => {
                  setEditingUserId(row.original.id)
                  setFormModalOpen(true)
                }}
              >
                <Pencil className="mr-3 h-4 w-4" /> 编辑资料
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-xl px-4 py-3 font-bold text-clay-foreground focus:bg-clay-secondary/10 focus:text-clay-secondary cursor-pointer transition-colors"
                onClick={() => setResetPasswordDialog({ open: true, userId: row.original.id })}
              >
                <Lock className="mr-3 h-4 w-4" /> 重置密码
              </DropdownMenuItem>
            </div>

            <DropdownMenuSeparator className="bg-clay-muted/10 my-2 mx-4" />

            <DropdownMenuItem
              className={cn(
                "rounded-xl px-4 py-3 font-bold cursor-pointer transition-colors",
                row.original.is_active
                  ? "text-red-500 focus:bg-red-50 focus:text-red-600"
                  : "text-clay-success focus:bg-clay-success/10 focus:text-clay-success"
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
    <div className="space-y-10 animate-fadeIn overflow-x-hidden pb-20">
      <PageHeader
        title="用户管理"
        subtitle="Accounts & Permissions"
        icon={<Users />}
        extra={
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              className="h-14 px-6 rounded-2xl font-bold text-clay-muted hover:bg-white/50 hover:text-clay-primary"
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
              className="shadow-clay-btn hover:shadow-clay-btn-hover"
            >
              <Plus className="mr-2 h-5 w-5" />
              新增用户
            </Button>
          </div>
        }
      />

      {/* 统计网格 - 使用语义化变量 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard
          title="活跃用户"
          value={stats.active}
          icon={UserCheck}
          color="var(--color-clay-primary)"
          gradient="linear-gradient(135deg, var(--color-clay-primary) 0%, #A78BFA 100%)"
          delay="stagger-delay-1"
        />
        <StatCard
          title="管理员"
          value={stats.admins}
          icon={ShieldCheck}
          color="var(--color-clay-secondary)"
          gradient="linear-gradient(135deg, var(--color-clay-secondary) 0%, #F472B6 100%)"
          delay="stagger-delay-2"
        />
        <StatCard
          title="总用户数"
          value={stats.total}
          icon={Users}
          color="var(--color-clay-warning)"
          gradient="linear-gradient(135deg, var(--color-clay-warning) 0%, #FCD34D 100%)"
          delay="stagger-delay-3"
        />
        <StatCard
          title="近一周新增"
          value={stats.new}
          icon={Plus}
          color="var(--color-clay-success)"
          gradient="linear-gradient(135deg, var(--color-clay-success) 0%, #34D399 100%)"
          delay="stagger-delay-4"
        />
      </div>

      {/* 列表主体 - 使用 glass-card 与测试中心一致 */}
      <div className="reveal-item stagger-delay-2">
        <div className="glass-card rounded-[2.5rem] p-8 border-none overflow-hidden relative">
          {/* 装饰性光晕 */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-clay-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

          {/* 搜索和筛选 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 relative z-10">
            <div className="relative flex-1 max-w-lg group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-clay-primary transition-colors" />
              <Input
                placeholder="搜索姓名、工号、电子邮箱..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-16 pl-14 pr-8 bg-white rounded-[1.25rem] border-none shadow-premium focus:ring-4 ring-primary-50 text-base font-medium"
              />
            </div>

            <div className="flex items-center gap-6">
              <Button
                onClick={handleSearch}
                className="h-14 px-10 rounded-2xl font-bold shadow-clay-btn hover:scale-105 transition-transform"
              >
                搜索
              </Button>
              <div className="h-12 w-[2px] bg-gray-200 mx-2" />
              <div className="text-right">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Total Users</span>
                <span className="text-2xl font-black text-gray-900 tracking-tight">{data?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* 表格容器 */}
          <div className="overflow-hidden rounded-[2rem] relative z-10">
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

      {/* 重置密码确认对话框 - Clay Style */}
      <Dialog
        open={resetPasswordDialog.open}
        onOpenChange={(open) => setResetPasswordDialog({ open, userId: resetPasswordDialog.userId })}
      >
        <DialogContent className="rounded-[40px] max-w-md p-10 border-white/60 bg-clay-cardBg/95 backdrop-blur-2xl shadow-clay-deep">
          <DialogHeader>
            <div className="w-24 h-24 bg-clay-secondary/10 text-clay-secondary rounded-full flex items-center justify-center mb-8 mx-auto shadow-clay-pressed">
              <Lock className="h-10 w-10" />
            </div>
            <DialogTitle className="text-3xl font-black text-clay-foreground mb-4 text-center tracking-tight">重置密码？</DialogTitle>
            <DialogDescription className="text-clay-muted font-medium text-center text-lg leading-relaxed">
              系统将生成一个<span className="text-clay-primary font-bold">临时密码</span>。<br />
              用户下次登录时必须修改。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-10 gap-4 sm:flex-row">
            <Button
              variant="ghost"
              onClick={() => setResetPasswordDialog({ open: false })}
              className="flex-1 rounded-2xl h-16 font-bold text-clay-muted hover:bg-clay-muted/10 hover:text-clay-foreground"
            >
              取消
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resetPassword.isPending}
              className="flex-1 bg-gradient-to-r from-clay-secondary to-pink-600 text-white rounded-2xl h-16 font-bold shadow-clay-btn hover:shadow-clay-btn-hover"
            >
              {resetPassword.isPending ? "处理中..." : "确认重置"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 临时密码显示对话框 - Clay Style */}
      <Dialog
        open={tempPasswordDialog.open}
        onOpenChange={(open) => setTempPasswordDialog({ open, password: tempPasswordDialog.password })}
      >
        <DialogContent className="rounded-[40px] max-w-md p-10 border-white/60 bg-clay-bg/95 backdrop-blur-2xl shadow-clay-deep">
          <DialogHeader>
            <div className="w-24 h-24 bg-clay-success/10 text-clay-success rounded-full flex items-center justify-center mb-8 mx-auto shadow-clay-pressed">
              <ShieldCheck className="h-12 w-12" />
            </div>
            <DialogTitle className="text-3xl font-black text-clay-foreground mb-3 text-center tracking-tight">重置成功</DialogTitle>
            <DialogDescription className="text-clay-muted font-medium text-center text-lg">
              请务必将此密码<span className="text-clay-foreground font-bold">安全地</span>转交给用户
            </DialogDescription>
          </DialogHeader>

          <div className="mt-8 relative group cursor-pointer" onClick={() => {
            navigator.clipboard.writeText(tempPasswordDialog.password || '');
            toast.success('密码已复制');
          }}>
            <div className="absolute inset-0 bg-clay-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative bg-white border-none rounded-3xl p-8 text-center shadow-clay-card hover:-translate-y-1 transition-transform duration-300">
              <span className="text-xs font-black text-clay-muted uppercase tracking-[0.2em] mb-3 block">临时密码</span>
              <code className="text-4xl font-black text-clay-primary tracking-widest font-mono">
                {tempPasswordDialog.password}
              </code>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-clay-muted uppercase tracking-wider opacity-60 group-hover:opacity-100 transition-opacity">
                点击复制
              </div>
            </div>
          </div>

          <DialogFooter className="mt-12">
            <Button
              onClick={() => setTempPasswordDialog({ open: false })}
              className="w-full bg-clay-foreground text-white rounded-2xl h-16 font-bold shadow-clay-btn hover:shadow-clay-btn-hover hover:-translate-y-1"
            >
              完成并关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
