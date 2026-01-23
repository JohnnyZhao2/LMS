import * as React from "react"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { useRoleNavigate } from "@/hooks/use-role-navigate"
import {
    FileText,
    Plus,
    Search,
    Eye,
    Trash2,
    Clock,
    Timer,
    Layout,
    Pencil,
    RefreshCw,
    BarChart3,
    FileCheck,
} from "lucide-react"
import { useTaskList } from "../api/get-tasks"
import { useDeleteTask } from "../api/delete-task"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { ROUTES } from "@/config/routes"
import {
    Button,
    Input,
    Tooltip,
    Skeleton,
    SegmentedControl,
} from "@/components/ui"
import { ConfirmDialog } from "@/components/ui"
import {
    DataTable,
    CellWithIcon,
    CellTags,
} from "@/components/ui/data-table"
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
    const { roleNavigate } = useRoleNavigate()
    const { user, currentRole } = useAuth()
    const [searchTerm, setSearchTerm] = React.useState("")
    const [statusFilter, setStatusFilter] = React.useState<string>("open")
    const [deleteId, setDeleteId] = React.useState<number | null>(null)
    const [isDeleting, setIsDeleting] = React.useState(false)
    const [page, setPage] = React.useState(1)
    const [pageSize, setPageSize] = React.useState(10)

    const { data: tasksData, isLoading, refetch } = useTaskList({ page, pageSize })
    const deleteTask = useDeleteTask()

    // 动画配置
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08, delayChildren: 0.1 }
        }
    } satisfies Variants

    const itemVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.98 },
        visible: { 
            opacity: 1, 
            y: 0, 
            scale: 1,
            transition: { type: "spring", stiffness: 260, damping: 20 }
        }
    } satisfies Variants

    // 统计逻辑
    const stats = React.useMemo(() => {
        const allTasks = tasksData?.results || []
        return {
            total: tasksData?.count || 0,
            active: allTasks.filter((t: TaskListItem) => !t.is_closed).length,
            completed: allTasks.filter((t: TaskListItem) => t.is_closed).length
        }
    }, [tasksData])

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
                <CellWithIcon
                    icon={<Layout className="h-5 w-5" />}
                    title={row.original.title}
                    subtitle={row.original.updated_by_name || row.original.created_by_name}
                />
            ),
        },
        {
            header: "关联资源",
            id: "resources",
            cell: ({ row }) => {
                const kCount = row.original.knowledge_count || 0
                const qCount = row.original.quiz_count || 0
                const tags = []
                if (kCount > 0) tags.push({ key: 'k', label: `${kCount} 知识`, bgClass: 'bg-secondary-100', textClass: 'text-secondary' })
                if (qCount > 0) tags.push({ key: 'q', label: `${qCount} 测验`, bgClass: 'bg-primary-100', textClass: 'text-primary' })
                return <CellTags tags={tags} />
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
                            <span className="text-[10px] font-bold text-gray-900">
                                {percent}% <span className="text-gray-400 font-medium ml-1">({completed}/{total})</span>
                            </span>
                            <TrendingUp className="w-3 h-3 text-secondary opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percent}%` }}
                                transition={{ type: "spring", stiffness: 50, damping: 20, delay: 0.5 }}
                                className="h-full bg-primary rounded-full"
                            />
                        </div>
                    </div>
                )
            }
        },
        {
            header: "截止日期",
            id: "deadline",
            cell: ({ row }) => {
                const now = dayjs()
                const date = dayjs(row.original.deadline)
                const isUrgent = !row.original.is_closed && date.isAfter(now) && date.diff(now, 'hour') <= 48
                return (
                    <div className="flex flex-col min-w-[100px]">
                        <div className="flex items-center gap-1.5">
                            <Clock className={cn("h-3.5 w-3.5", isUrgent ? "text-destructive" : "text-gray-400")} />
                            <span className={cn("text-xs font-bold", isUrgent ? "text-destructive" : "text-gray-900")}>
                                {date.format("MM-DD")}
                            </span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium">{date.format("HH:mm")}</span>
                    </div>
                )
            }
        },
        {
            header: "更新时间",
            id: "updated_at",
            cell: ({ row }) => (
                <div className="flex flex-col min-w-[100px]">
                    <span className="text-sm font-bold text-gray-900">
                        {dayjs(row.original.updated_at).format("YYYY.MM.DD")}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {dayjs(row.original.updated_at).format("HH:mm:ss")}
                    </span>
                </div>
            )
        },
        {
            header: "操作",
            id: "actions",
            cell: ({ row }) => {
                const canEdit = currentRole === 'ADMIN' || row.original.created_by === user?.id;
                const canPreview = currentRole === 'ADMIN' || currentRole === 'MENTOR' || currentRole === 'DEPT_MANAGER';
                return (
                    <div className="flex items-center gap-1.5 min-w-[150px]" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="查看详情">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-md hover:bg-primary-100 hover:text-primary text-gray-400  soft-press"
                                onClick={() => roleNavigate(`/tasks/${row.original.id}`)}
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
                        </Tooltip>
                        {canPreview && (
                            <>
                                <Tooltip title="进度监控">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 rounded-md hover:bg-secondary-100 hover:text-secondary text-gray-400  soft-press"
                                        onClick={() => roleNavigate(`/tasks/${row.original.id}/preview`)}
                                    >
                                        <BarChart3 className="h-4 w-4" />
                                    </Button>
                                </Tooltip>
                                <Tooltip title="阅卷中心">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 rounded-md hover:bg-primary-100 hover:text-primary-600 text-gray-400  soft-press"
                                        onClick={() => roleNavigate(`/tasks/${row.original.id}/preview?tab=grading`)}
                                    >
                                        <FileCheck className="h-4 w-4" />
                                    </Button>
                                </Tooltip>
                            </>
                        )}
                        {canEdit && (
                            <>
                                <Tooltip title="编辑任务">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 rounded-md hover:bg-primary-100 hover:text-primary text-gray-400  soft-press"
                                        disabled={row.original.is_closed}
                                        onClick={() => roleNavigate(`/tasks/${row.original.id}/edit`)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </Tooltip>
                                <Tooltip title="删除任务">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 rounded-md hover:bg-destructive-100 hover:text-destructive text-gray-400  soft-press"
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
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-10 overflow-x-hidden pb-10"
        >
            <motion.div variants={itemVariants}>
                <PageHeader
                    title="任务中心"
                    subtitle="管理与监督"
                    icon={<FileText />}
                    extra={
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                className="h-14 py-3 px-6 rounded-md border-4 border-gray-200 font-semibold text-gray-500 hover:bg-gray-100 flex items-center gap-2  soft-press"
                                onClick={() => refetch()}
                            >
                                <RefreshCw className="h-4 w-4" />
                                刷新
                            </Button>
                            <Button
                                onClick={() => roleNavigate(`${ROUTES.TASKS}/create`)}
                                className="h-14 px-8 rounded-md bg-primary text-white font-semibold hover:bg-primary-600  soft-press"
                            >
                                <Plus className="mr-2 h-5 w-5" />
                                发布新任务
                            </Button>
                        </div>
                    }
                />
            </motion.div>

            {/* 统计网格 */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard
                    title="活跃任务"
                    value={stats.active}
                    icon={Timer}
                    accentClassName="bg-primary"
                />
                <StatCard
                    title="总任务数"
                    value={stats.total}
                    icon={FileText}
                    accentClassName="bg-warning"
                />
                <StatCard
                    title="平均及格率"
                    value={typeof stats.total === 'number' && stats.total > 0 ? '82%' : '-'}
                    icon={Layout}
                    accentClassName="bg-secondary"
                />
            </motion.div>

            {/* 列表主体 */}
            <motion.div variants={itemVariants}>
                <ContentPanel className="overflow-hidden">
                    {/* 搜索和筛选 */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                        <div className="relative flex-1 max-w-md group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="搜索任务标题或编号..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-14 h-14 bg-gray-100 border-0 rounded-md focus:bg-white focus:border-2 focus:border-primary text-base font-medium "
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <SegmentedControl
                                value={statusFilter}
                                onChange={(val: string) => setStatusFilter(val)}
                                options={[
                                    { label: '进行中', value: 'open' },
                                    { label: '已结束', value: 'closed' },
                                    { label: '全部', value: 'all' },
                                ]}
                                variant="premium"
                                activeColor="white"
                                className="w-full md:w-auto"
                            />
                        </div>
                    </div>

                    {/* 表格 */}
                    <div className="overflow-hidden rounded-lg border-0">
                        <AnimatePresence mode="wait">
                            {isLoading ? (
                                <motion.div 
                                    key="skeleton"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="p-10 space-y-5"
                                >
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <Skeleton key={i} className="h-16 w-full rounded-lg" />
                                    ))}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="content"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <DataTable
                                        columns={columns}
                                        data={tasksData?.results?.filter((t: TaskListItem) => {
                                            const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
                                            const matchesStatus = statusFilter === 'all' ||
                                                (statusFilter === 'open' && !t.is_closed) ||
                                                (statusFilter === 'closed' && t.is_closed);
                                            return matchesSearch && matchesStatus;
                                        }) || []}
                                        pagination={{
                                            pageIndex: page - 1,
                                            pageSize: pageSize,
                                            pageCount: Math.ceil((tasksData?.count || 0) / pageSize),
                                            totalCount: tasksData?.count || 0,
                                            onPageChange: (p: number) => setPage(p + 1),
                                            onPageSizeChange: (size: number) => {
                                                setPageSize(size);
                                                setPage(1);
                                            },
                                        }}
                                        rowClassName="hover:bg-gray-100 transition-colors cursor-pointer group"
                                        onRowClick={(row: TaskListItem) => roleNavigate(`/tasks/${row.id}`)}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </ContentPanel>
            </motion.div>

            {/* 删除确认对话框 */}
            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="确认删除此任务？"
                description="此操作将永久删除该任务及其所有关联数据，包括学员提交的作业。该操作不可撤销。"
                icon={<Trash2 className="h-10 w-10" />}
                iconBgColor="bg-destructive-100"
                iconColor="text-destructive"
                confirmText="确认删除"
                cancelText="取消"
                confirmVariant="destructive"
                onConfirm={handleDeleteTask}
                isConfirming={isDeleting}
            />
        </motion.div>
    )
}
