import * as React from "react"
import { useNavigate } from "react-router-dom"
import {
    FileText,
    Plus,
    Search,
    Filter,
    Eye,
    Trash2,
    Clock,
    Timer,
    Layout,
    Pencil,
    RefreshCw,
} from "lucide-react"
import { useTaskList } from "../api/get-tasks"
import { useDeleteTask } from "../api/delete-task"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { ROUTES } from "@/config/routes"
import {
    Button,
    Input,
    Badge,
    Tooltip,
    Skeleton,
} from "@/components/ui"
import { ConfirmDialog } from "@/components/ui"
import { DataTable } from "@/components/ui/data-table/data-table"
import { toast } from "sonner"
import { showApiError } from "@/utils/error-handler"
import dayjs from "@/lib/dayjs"
import { cn } from "@/lib/utils"
import { type ColumnDef } from "@tanstack/react-table"
import type { TaskListItem } from "@/types/api"
import { PageHeader, StatCard, ContentPanel } from "@/components/ui"

/**
 * 辅助组件: 趋势图标
 */
const TrendingUp = ({ className }: { className?: string }) => (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M23 6L13.5 15.5L8.5 10.5L1 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 6H23V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

export const TaskManagement: React.FC = () => {
    const navigate = useNavigate()
    const { user, currentRole } = useAuth()
    const [searchTerm, setSearchTerm] = React.useState("")
    const [statusFilter, setStatusFilter] = React.useState<string>("all")
    const [deleteId, setDeleteId] = React.useState<number | null>(null)
    const [isDeleting, setIsDeleting] = React.useState(false)
    const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false)

    const { data: tasks, isLoading, refetch } = useTaskList({})
    const deleteTask = useDeleteTask()

    // 统计逻辑
    const stats = React.useMemo(() => {
        const allTasks = tasks || []
        return {
            total: allTasks.length,
            active: allTasks.filter(t => !t.is_closed).length,
            completed: allTasks.filter(t => t.is_closed).length
        }
    }, [tasks])

    const handleDeleteTask = async () => {
        if (!deleteId) return
        setIsDeleting(true)
        try {
            await deleteTask.mutateAsync(deleteId)
            toast.success("任务已永久删除")
            setDeleteId(null)
            refetch()
        } catch (error) {
            showApiError(error)
        } finally {
            setIsDeleting(false)
        }
    }

    const columns: ColumnDef<TaskListItem>[] = [
        {
            header: "任务详情",
            id: "title",
            cell: ({ row }) => (
                <div className="flex items-center gap-4 py-1 min-w-[240px]">
                    <div className="w-10 h-10 rounded-md bg-[#DBEAFE] text-[#3B82F6] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Layout className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-[#111827] hover:text-[#3B82F6] cursor-pointer transition-colors line-clamp-1">
                            {row.original.title}
                        </span>
                        <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-tighter">
                            ID: {row.original.id} • {row.original.created_by_name}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            header: "关联资源",
            id: "resources",
            cell: ({ row }) => {
                const kCount = row.original.knowledge_count || 0
                const qCount = row.original.quiz_count || 0
                if (kCount === 0 && qCount === 0) return <span className="text-[#9CA3AF] italic text-xs">无资源</span>
                return (
                    <div className="flex items-center gap-1.5 min-w-[120px]">
                        {kCount > 0 && (
                            <div className="bg-[#D1FAE5] text-[#10B981] px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap border-0 shadow-none">
                                {kCount} 知识
                            </div>
                        )}
                        {qCount > 0 && (
                            <div className="bg-[#DBEAFE] text-[#3B82F6] px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap border-0 shadow-none">
                                {qCount} 测验
                            </div>
                        )}
                    </div>
                )
            }
        },
        {
            header: "完成进度",
            id: "progress",
            cell: ({ row }) => {
                const completed = row.original.completed_count || 0
                const total = row.original.assignee_count || 0
                const percent = total > 0 ? Math.round((completed / total) * 100) : 0
                return (
                    <div className="w-32 group/progress">
                        <div className="flex items-center justify-between mb-1.5 px-0.5">
                            <span className="text-[10px] font-bold text-[#111827]">
                                {percent}% <span className="text-[#9CA3AF] font-medium ml-1">({completed}/{total})</span>
                            </span>
                            <TrendingUp className="w-3 h-3 text-[#10B981] opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                        </div>
                        <div className="h-1.5 w-full bg-[#F3F4F6] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#3B82F6] rounded-full transition-all duration-1000 ease-out"
                                style={{
                                    width: `${percent}%`
                                }}
                            />
                        </div>
                    </div>
                )
            }
        },
        {
            header: "及格率",
            id: "pass_rate",
            cell: ({ row }) => (
                <div className="text-center font-bold min-w-[80px]">
                    <span className={cn(
                        "text-sm",
                        (row.original.pass_rate || 0) >= 80 ? "text-[#10B981]" : "text-[#111827]"
                    )}>
                        {row.original.pass_rate ? `${row.original.pass_rate.toFixed(0)}%` : '-'}
                    </span>
                </div>
            )
        },
        {
            header: "截止日期",
            id: "deadline",
            cell: ({ row }) => {
                const date = dayjs(row.original.deadline)
                const isUrgent = !row.original.is_closed && date.isBefore(dayjs().add(2, 'day'))
                return (
                    <div className="flex flex-col min-w-[100px]">
                        <div className="flex items-center gap-1.5">
                            <Clock className={cn("h-3.5 w-3.5", isUrgent ? "text-[#DC2626]" : "text-[#9CA3AF]")} />
                            <span className={cn("text-xs font-bold", isUrgent ? "text-[#DC2626]" : "text-[#111827]")}>
                                {date.format("MM-DD")}
                            </span>
                        </div>
                        <span className="text-[10px] text-[#9CA3AF] font-medium">{date.format("HH:mm")}</span>
                    </div>
                )
            }
        },
        {
            header: "状态",
            id: "status",
            cell: ({ row }) => {
                const isClosed = row.original.is_closed
                return (
                    <div className="min-w-[80px]">
                        <Badge
                            className={cn(
                                "border-0 shadow-none",
                                !isClosed ? "bg-[#D1FAE5] text-[#10B981]" : "bg-[#F3F4F6] text-[#6B7280]"
                            )}
                        >
                            {!isClosed ? "进行中" : "已结束"}
                        </Badge>
                    </div>
                )
            },
        },
        {
            header: "操作",
            id: "actions",
            cell: ({ row }) => {
                const canEdit = currentRole === 'ADMIN' || row.original.created_by === user?.id;
                return (
                    <div className="flex items-center gap-1.5 min-w-[120px]" onClick={(e) => e.stopPropagation()}>
                        <Tooltip content="预览任务">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-md hover:bg-[#DBEAFE] hover:text-[#3B82F6] text-[#9CA3AF] shadow-none"
                                onClick={() => navigate(`/tasks/${row.original.id}`)}
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
                        </Tooltip>
                        {canEdit && (
                            <>
                                <Tooltip content="编辑任务">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 rounded-md hover:bg-[#DBEAFE] hover:text-[#3B82F6] text-[#9CA3AF] shadow-none"
                                        disabled={row.original.is_closed}
                                        onClick={() => navigate(`/tasks/${row.original.id}/edit`)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </Tooltip>
                                <Tooltip content="删除任务">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 rounded-md hover:bg-[#FEE2E2] hover:text-[#DC2626] text-[#9CA3AF] shadow-none"
                                        onClick={() => setDeleteId(row.original.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </Tooltip>
                            </>
                        )}
                    </div>
                )
            },
        },
    ]

    return (
        <div className="space-y-10 animate-fadeIn overflow-x-hidden pb-10">
            <PageHeader
                title="任务中心"
                subtitle="管理与监督"
                icon={<FileText />}
                extra={
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            className="h-14 py-3 px-6 rounded-md border-4 border-[#E5E7EB] font-semibold text-[#6B7280] hover:bg-[#F3F4F6] flex items-center gap-2 shadow-none"
                            onClick={() => refetch()}
                        >
                            <RefreshCw className="h-4 w-4" />
                            刷新
                        </Button>
                        <Button
                            onClick={() => navigate(`${ROUTES.TASKS}/create`)}
                            className="h-14 px-8 rounded-md bg-[#3B82F6] text-white font-semibold hover:bg-[#2563EB] hover:scale-105 transition-all duration-200 shadow-none"
                        >
                            <Plus className="mr-2 h-5 w-5" />
                            发布新任务
                        </Button>
                    </div>
                }
            />

            {/* 统计网格 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard
                    title="活跃任务"
                    value={stats.active}
                    icon={Timer}
                    color="#3B82F6"
                    gradient=""
                    delay="stagger-delay-1"
                />
                <StatCard
                    title="总任务数"
                    value={stats.total}
                    icon={FileText}
                    color="#F59E0B"
                    gradient=""
                    delay="stagger-delay-2"
                />
                <StatCard
                    title="平均及格率"
                    value={typeof stats.total === 'number' && stats.total > 0 ? '82%' : '-'}
                    icon={Layout}
                    color="#10B981"
                    gradient=""
                    delay="stagger-delay-3"
                />
            </div>

            {/* 列表主体 */}
            <div className="reveal-item stagger-delay-2">
                <ContentPanel className="overflow-hidden">
                    {/* 搜索和筛选 */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                        <div className="relative flex-1 max-w-md group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9CA3AF] group-focus-within:text-[#3B82F6] transition-colors" />
                            <Input
                                placeholder="搜索任务标题或编号..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-14 h-14 bg-[#F3F4F6] border-0 rounded-md focus:bg-white focus:border-2 focus:border-[#3B82F6] text-base font-medium shadow-none"
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center bg-[#F3F4F6] p-1.5 rounded-md">
                                {['all', 'open', 'closed'].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setStatusFilter(s)}
                                        className={cn(
                                            "px-6 py-2.5 text-xs font-bold rounded-md transition-all duration-200 shadow-none",
                                            statusFilter === s ? "bg-white text-[#111827]" : "text-[#6B7280] hover:text-[#111827]"
                                        )}
                                    >
                                        {s === 'all' ? '全部' : s === 'open' ? '进行中' : '已结束'}
                                    </button>
                                ))}
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                className={cn(
                                    "h-14 w-14 rounded-md transition-all duration-200 shadow-none",
                                    showAdvancedFilters ? "bg-[#111827] text-white" : "bg-[#F3F4F6] text-[#6B7280]"
                                )}
                            >
                                <Filter className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* 表格 */}
                    <div className="overflow-hidden rounded-lg border-0">
                        {isLoading ? (
                            <div className="p-10 space-y-5">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                                ))}
                            </div>
                        ) : (
                            <DataTable
                                columns={columns}
                                data={tasks?.filter(t => {
                                    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
                                    const matchesStatus = statusFilter === 'all' ||
                                        (statusFilter === 'open' && !t.is_closed) ||
                                        (statusFilter === 'closed' && t.is_closed);
                                    return matchesSearch && matchesStatus;
                                }) || []}
                                className="border-none"
                                rowClassName="hover:bg-[#F3F4F6] transition-colors cursor-pointer group"
                                onRowClick={(row) => navigate(`/tasks/${row.id}`)}
                            />
                        )}
                    </div>
                </ContentPanel>
            </div>

            {/* 删除确认对话框 */}
            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="确认删除此任务？"
                description="此操作将永久删除该任务及其所有关联数据，包括学员提交的作业。该操作不可撤销。"
                icon={<Trash2 className="h-10 w-10" />}
                iconBgColor="bg-[#FEE2E2]"
                iconColor="text-[#DC2626]"
                confirmText="确认删除"
                cancelText="取消"
                confirmVariant="destructive"
                onConfirm={handleDeleteTask}
                isConfirming={isDeleting}
            />
        </div>
    )
}
