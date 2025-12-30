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
    CheckCircle2,
    Layout,
    Pencil,
    RefreshCw,
} from "lucide-react"
import { useTaskList } from "../api/get-tasks"
import { useDeleteTask } from "../api/delete-task"
import { usePendingGrading } from "@/features/grading/api/get-pending-grading"
import { useAuth } from "@/features/auth/hooks/use-auth"
import {
    Button,
    Input,
    Badge,
    Tooltip,
    Skeleton,
} from "@/components/ui"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { DataTable } from "@/components/ui/data-table/data-table"
import { toast } from "sonner"
import { showApiError } from "@/utils/error-handler"
import dayjs from "@/lib/dayjs"
import { cn } from "@/lib/utils"
import { type ColumnDef } from "@tanstack/react-table"
import type { TaskListItem } from "@/types/api"
import { PageHeader, StatCard } from "@/components/ui"

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
    const { data: pendingGradingData } = usePendingGrading(1)
    const deleteTask = useDeleteTask()

    // 统计逻辑
    const stats = React.useMemo(() => {
        const allTasks = tasks || []
        return {
            total: allTasks.length,
            active: allTasks.filter(t => !t.is_closed).length,
            pending: pendingGradingData?.count || 0,
            completed: allTasks.filter(t => t.is_closed).length
        }
    }, [tasks, pendingGradingData])

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
                    <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Layout className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-900 hover:text-primary-600 cursor-pointer transition-colors line-clamp-1">
                            {row.original.title}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
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
                if (kCount === 0 && qCount === 0) return <span className="text-gray-300 italic text-xs">无资源</span>
                return (
                    <div className="flex items-center gap-1.5 min-w-[120px]">
                        {kCount > 0 && (
                            <div className="bg-success-50 text-success-600 px-2 py-0.5 rounded-lg text-[10px] font-bold whitespace-nowrap">
                                {kCount} 知识
                            </div>
                        )}
                        {qCount > 0 && (
                            <div className="bg-primary-50 text-primary-600 px-2 py-0.5 rounded-lg text-[10px] font-bold whitespace-nowrap">
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
                            <span className="text-[10px] font-black text-gray-900 italic">
                                {percent}% <span className="text-gray-400 font-medium ml-1">({completed}/{total})</span>
                            </span>
                            <TrendingUp className="w-3 h-3 text-success-500 opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-primary-500 rounded-full transition-all duration-1000 ease-out"
                                style={{
                                    width: `${percent}%`,
                                    background: "linear-gradient(90deg, var(--color-primary-500), var(--color-purple-500))"
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
                <div className="text-center font-black italic min-w-[80px]">
                    <span className={cn(
                        "text-sm",
                        (row.original.pass_rate || 0) >= 80 ? "text-success-500" : "text-gray-700"
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
                            <Clock className={cn("h-3.5 w-3.5", isUrgent ? "text-error-500" : "text-gray-400")} />
                            <span className={cn("text-xs font-bold", isUrgent ? "text-error-500" : "text-gray-700")}>
                                {date.format("MM-DD")}
                            </span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium">{date.format("HH:mm")}</span>
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
                                "badge-pill border-none",
                                !isClosed ? "bg-success-500/10 text-success-600" : "bg-gray-100 text-gray-500"
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
                                className="h-9 w-9 rounded-xl hover:bg-primary-50 hover:text-primary-600 text-gray-400"
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
                                        className="h-9 w-9 rounded-xl hover:bg-purple-50 hover:text-purple-600 text-gray-400"
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
                                        className="h-9 w-9 rounded-xl hover:bg-error-50 hover:text-error-600 text-gray-400"
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
                            className="h-auto py-3 px-6 rounded-2xl border-2 border-gray-100 font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                            onClick={() => refetch()}
                        >
                            <RefreshCw className="h-4 w-4" />
                            刷新
                        </Button>
                        <Button
                            onClick={() => navigate("/tasks/create")}
                            className="btn-gradient h-12 px-6 rounded-xl text-white font-bold shadow-md shadow-primary-500/20 hover:scale-105 transition-all duration-300"
                        >
                            <Plus className="mr-2 h-5 w-5" />
                            发布新任务
                        </Button>
                    </div>
                }
            />

            {/* 统计网格 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="活跃任务"
                    value={stats.active}
                    icon={Timer}
                    color="var(--color-primary-500)"
                    gradient="linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-300) 100%)"
                    delay="stagger-delay-1"
                />
                <StatCard
                    title="待批改"
                    value={stats.pending}
                    icon={CheckCircle2}
                    color="var(--color-purple-500)"
                    gradient="linear-gradient(135deg, var(--color-purple-500) 0%, var(--color-purple-300) 100%)"
                    delay="stagger-delay-2"
                />
                <StatCard
                    title="总任务数"
                    value={stats.total}
                    icon={FileText}
                    color="var(--color-orange-500)"
                    gradient="linear-gradient(135deg, var(--color-orange-500) 0%, var(--color-orange-300) 100%)"
                    delay="stagger-delay-3"
                />
                <StatCard
                    title="平均及格率"
                    value={typeof stats.total === 'number' && stats.total > 0 ? '82%' : '-'}
                    icon={Layout}
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
                                placeholder="搜索任务标题或编号..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-14 h-16 bg-gray-50/50 border-none rounded-[1.25rem] focus:ring-4 ring-primary-50 shadow-inner text-base font-medium"
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center bg-gray-100/50 p-1.5 rounded-[1.25rem]">
                                {['all', 'open', 'closed'].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setStatusFilter(s)}
                                        className={cn(
                                            "px-6 py-2.5 text-xs font-bold rounded-xl transition-all duration-300",
                                            statusFilter === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
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
                                    "h-14 w-14 rounded-[1.25rem] transition-all duration-300",
                                    showAdvancedFilters ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
                                )}
                            >
                                <Filter className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* 表格 */}
                    <div className="overflow-hidden rounded-[1.5rem] border border-gray-100/50">
                        {isLoading ? (
                            <div className="p-10 space-y-5">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Skeleton key={i} className="h-16 w-full rounded-2xl" />
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
                                rowClassName="hover:bg-primary-50/30 transition-colors cursor-pointer group"
                                onRowClick={(row) => navigate(`/tasks/${row.id}`)}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* 删除确认对话框 */}
            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent className="rounded-[2rem] max-w-md p-10 border-none shadow-2xl">
                    <DialogHeader>
                        <div className="w-20 h-20 bg-error-50 text-error-500 rounded-3xl flex items-center justify-center mb-8 mx-auto">
                            <Trash2 className="h-10 w-10" />
                        </div>
                        <DialogTitle className="text-2xl font-black text-gray-900 mb-2 text-center">确认删除此任务？</DialogTitle>
                        <DialogDescription className="text-gray-500 font-medium text-center leading-relaxed">
                            此操作将永久删除该任务及其所有关联数据，包括学员提交的作业。该操作不可撤销。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-10 gap-4 sm:flex-row">
                        <Button
                            variant="ghost"
                            onClick={() => setDeleteId(null)}
                            className="flex-1 rounded-2xl h-14 font-bold text-gray-500 hover:bg-gray-100"
                        >
                            取消
                        </Button>
                        <Button
                            onClick={handleDeleteTask}
                            disabled={isDeleting}
                            className="flex-1 bg-error-500 hover:bg-error-600 text-white rounded-2xl h-14 font-bold shadow-xl shadow-error-500/20"
                        >
                            {isDeleting ? "正在删除..." : "确认删除"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
