import * as React from "react"
import { useRoleNavigate } from "@/hooks/use-role-navigate"
import {
    FileText,
    Eye,
    Trash2,
    Clock,
    Layout,
    Pencil,
    BarChart3,
    FileCheck,
} from "lucide-react"
import { useTaskList } from "../api/get-tasks"
import { useDeleteTask } from "../api/delete-task"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { ROUTES } from "@/config/routes"
import { Button } from '@/components/ui/button';
import { CircleButton } from '@/components/ui/circle-button';
import { DESKTOP_SEARCH_INPUT_CLASSNAME, SearchInput } from '@/components/ui/search-input';
import { Tooltip } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table/data-table';
import { CellWithIcon, CellTags } from '@/components/ui/data-table/data-table-cells';
import { toast } from "sonner"
import { showApiError } from "@/utils/error-handler"
import dayjs from "@/lib/dayjs"
import { cn } from "@/lib/utils"
import { type ColumnDef } from "@tanstack/react-table"
import type { TaskListItem } from "@/types/api"
import { PageHeader } from '@/components/ui/page-header';
import { PageFillShell, PageViewport } from '@/components/ui/page-shell';
import { isAdminLikeRole } from '@/lib/role-utils';

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
    const [creatorSideFilter, setCreatorSideFilter] = React.useState<'all' | 'management' | 'non_management'>('all')
    const [deleteId, setDeleteId] = React.useState<number | null>(null)
    const [isDeleting, setIsDeleting] = React.useState(false)
    const [page, setPage] = React.useState(1)
    const [pageSize, setPageSize] = React.useState(10)
    const isAdmin = isAdminLikeRole(currentRole)

    const { data: tasksData, isLoading, refetch } = useTaskList({
        page,
        pageSize,
        taskStatus: statusFilter as 'open' | 'closed' | 'all',
        creatorSide: isAdmin ? creatorSideFilter : 'all',
    })
    const deleteTask = useDeleteTask()

    React.useEffect(() => {
        setPage(1)
    }, [creatorSideFilter])

    React.useEffect(() => {
        setPage(1)
    }, [statusFilter])

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
                            <span className="text-[10px] font-bold text-foreground">
                                {percent}% <span className="text-text-muted font-medium ml-1">({completed}/{total})</span>
                            </span>
                            <TrendingUp className="w-3 h-3 text-secondary opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${percent}%` }}
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
                const isUrgent = date.isAfter(now) && date.diff(now, 'hour') <= 48
                return (
                    <div className="flex flex-col min-w-[100px]">
                        <div className="flex items-center gap-1.5">
                            <Clock className={cn("h-3.5 w-3.5", isUrgent ? "text-destructive" : "text-text-muted")} />
                            <span className={cn("text-xs font-bold", isUrgent ? "text-destructive" : "text-foreground")}>
                                {date.format("MM-DD")}
                            </span>
                        </div>
                        <span className="text-[10px] text-text-muted font-medium">{date.format("HH:mm")}</span>
                    </div>
                )
            }
        },
        {
            header: "更新时间",
            id: "updated_at",
            cell: ({ row }) => (
                <div className="flex flex-col min-w-[100px]">
                    <span className="text-sm font-bold text-foreground">
                        {dayjs(row.original.updated_at).format("YYYY.MM.DD")}
                    </span>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">
                        {dayjs(row.original.updated_at).format("HH:mm:ss")}
                    </span>
                </div>
            )
        },
        {
            header: "操作",
            id: "actions",
            cell: ({ row }) => {
                const canEdit = isAdminLikeRole(currentRole) || row.original.created_by === user?.id;
                const canPreview = isAdminLikeRole(currentRole) || currentRole === 'MENTOR' || currentRole === 'DEPT_MANAGER';
                const isClosedByDeadline = !dayjs(row.original.deadline).isAfter(dayjs());
                return (
                    <div className="flex items-center gap-1.5 min-w-[150px]" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="查看详情">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-md hover:bg-primary-100 hover:text-primary text-text-muted  soft-press"
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
                                        className="h-9 w-9 rounded-md hover:bg-secondary-100 hover:text-secondary text-text-muted  soft-press"
                                        onClick={() => roleNavigate(`/tasks/${row.original.id}/preview?tab=progress&entry=task-management`)}
                                    >
                                        <BarChart3 className="h-4 w-4" />
                                    </Button>
                                </Tooltip>
                                <Tooltip title="阅卷中心">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 rounded-md hover:bg-primary-100 hover:text-primary-600 text-text-muted  soft-press"
                                        onClick={() => {
                                            const searchParams = new URLSearchParams({
                                                task: String(row.original.id),
                                                entry: 'task-management',
                                                taskTitle: row.original.title,
                                            })
                                            roleNavigate(`${ROUTES.GRADING_CENTER}?${searchParams.toString()}`)
                                        }}
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
                                        className="h-9 w-9 rounded-md hover:bg-primary-100 hover:text-primary text-text-muted  soft-press"
                                        disabled={isClosedByDeadline}
                                        onClick={() => roleNavigate(`/tasks/${row.original.id}/edit`)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </Tooltip>
                                <Tooltip title="删除任务">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 rounded-md hover:bg-destructive-100 hover:text-destructive text-text-muted  soft-press"
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
        <PageFillShell>
            <PageHeader
                title="任务中心"
                icon={<FileText />}
            />

            {/* 列表主体 */}
            <PageViewport className="flex flex-col">
                {/* 搜索和筛选 */}
                <div className="mb-1 flex items-center gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        {isAdmin && (
                            <SegmentedControl
                                value={creatorSideFilter}
                                onChange={(val: string) => setCreatorSideFilter(val as 'all' | 'management' | 'non_management')}
                                options={[
                                    { label: '全部来源', value: 'all' },
                                    { label: '管理端', value: 'management' },
                                    { label: '非管理端', value: 'non_management' },
                                ]}
                                activeColor="white"
                                className="shrink-0"
                            />
                        )}
                        <SegmentedControl
                            value={statusFilter}
                            onChange={(val: string) => setStatusFilter(val)}
                            options={[
                                { label: '进行中', value: 'open' },
                                { label: '已结束', value: 'closed' },
                                { label: '全部', value: 'all' },
                            ]}
                            activeColor="white"
                            className="shrink-0"
                        />
                    </div>
                    <div className="ml-auto flex min-w-0 items-center justify-end gap-3">
                        <SearchInput
                            className={DESKTOP_SEARCH_INPUT_CLASSNAME}
                            placeholder="搜索任务标题或编号..."
                            value={searchTerm}
                            onChange={setSearchTerm}
                        />
                        <CircleButton
                            onClick={() => roleNavigate(`${ROUTES.TASKS}/create`)}
                            label="发布新任务"
                            className="shrink-0"
                        />
                    </div>
                </div>

                {/* 表格 */}
                <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-lg border-0">
                    {isLoading ? (
                        <div className="flex flex-1 flex-col space-y-5 p-10">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-16 w-full rounded-lg" />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-1 min-h-0 flex-col">
                            <DataTable
                                columns={columns}
                                data={tasksData?.results?.filter((t: TaskListItem) => {
                                    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
                                    return matchesSearch;
                                }) || []}
                                fillHeight
                                pagination={{
                                    pageIndex: page - 1,
                                    pageSize: pageSize,
                                    defaultPageSize: 10,
                                    pageCount: Math.ceil((tasksData?.count || 0) / pageSize),
                                    totalCount: tasksData?.count || 0,
                                    onPageChange: (p: number) => setPage(p + 1),
                                    onPageSizeChange: (size: number) => {
                                        setPageSize(size);
                                        setPage(1);
                                    },
                                }}
                                rowClassName="group"
                                onRowClick={(row: TaskListItem) => roleNavigate(`/tasks/${row.id}`)}
                            />
                        </div>
                    )}
                </div>
            </PageViewport>

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
        </PageFillShell>
    )
}
