import * as React from "react"
import { useRoleNavigate } from "@/hooks/use-role-navigate"
import {
    FileText,
    Trash2,
    Clock,
    ListTodo,
    Pencil,
    BarChart3,
    FileCheck,
} from "lucide-react"
import { useTaskList } from "../api/get-tasks"
import { useDeleteTask } from "../api/delete-task"
import { useAuth } from "@/features/auth/stores/auth-context"
import { ROUTES } from "@/config/routes"
import { Button } from '@/components/ui/button';
import { CircleButton } from '@/components/ui/circle-button';
import { Tooltip } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SearchInput } from '@/components/ui/search-input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table/data-table';
import {
    LIST_ACTION_ICON_ANALYTICS_CLASS,
    LIST_ACTION_ICON_DESTRUCTIVE_CLASS,
    LIST_ACTION_ICON_EDIT_CLASS,
    LIST_ACTION_ICON_VIEW_CLASS,
} from '@/components/ui/data-table/action-icon-styles';
import { CellMutedTimestamp, CellWithIcon } from '@/components/ui/data-table/data-table-cells';
import { ListTag } from '@/components/ui/list-tag';
import { toast } from "sonner"
import { showApiError } from "@/utils/error-handler"
import dayjs from "@/lib/dayjs"
import { getLastEditedByName } from '@/lib/last-edited';
import { type ColumnDef } from "@tanstack/react-table"
import type { TaskListItem } from '@/types/task';
import { PageHeader } from '@/components/ui/page-header';
import { PageFillShell, PageViewport } from '@/components/ui/page-shell';

type TaskDisplayStatus = 'IN_PROGRESS' | 'DUE_SOON' | 'OVERDUE' | 'ENDED'
type ResponsiveColumnMeta = {
    width?: string
    minWidth?: string
    maxWidth?: string
}

const TASK_STATUS_META: Record<TaskDisplayStatus, {
    label: string
    className: string
}> = {
    IN_PROGRESS: { label: '进行中', className: 'bg-secondary-100/70 text-text-muted' },
    DUE_SOON: { label: '即将截止', className: 'bg-warning-100/70 text-text-muted' },
    OVERDUE: { label: '已逾期', className: 'bg-destructive-100/70 text-text-muted' },
    ENDED: { label: '已结束', className: 'bg-primary-100/70 text-text-muted' },
}

const getTaskDisplayStatus = (task: TaskListItem): TaskDisplayStatus => {
    const now = dayjs()
    const deadline = dayjs(task.deadline)
    const total = task.assignee_count
    const completed = task.completed_count

    if (total > 0 && completed >= total) {
        return 'ENDED'
    }
    if (!deadline.isAfter(now)) {
        return 'OVERDUE'
    }
    if (deadline.diff(now, 'hour', true) <= 48) {
        return 'DUE_SOON'
    }
    return 'IN_PROGRESS'
}

const renderTaskTagLabel = (count: number | string, label: string) => (
    <span className="inline-flex items-baseline gap-0.5">
        <span>{count}</span>
        <span>{label}</span>
    </span>
)

const getTaskResourceTags = (task: TaskListItem) => {
    const tags: Array<{ key: string; label: React.ReactNode; className: string }> = []
    if (task.knowledge_count > 0) {
        tags.push({ key: 'knowledge', label: renderTaskTagLabel(task.knowledge_count, '知识'), className: 'bg-secondary-100/70 text-text-muted' })
    }
    if (task.practice_count > 0) {
        tags.push({ key: 'practice', label: renderTaskTagLabel(task.practice_count, '测验'), className: 'bg-primary-100/70 text-text-muted' })
    }
    if (task.exam_count > 0) {
        tags.push({ key: 'exam', label: renderTaskTagLabel(task.exam_count, '考试'), className: 'bg-warning-100/70 text-text-muted' })
    }
    return tags
}

const getTaskRiskTags = (task: TaskListItem) => {
    const tags: Array<{ key: string; label: React.ReactNode; className: string }> = []
    if (task.pending_grading_count > 0) {
        tags.push({
            key: 'grading',
            label: (
                <span className="inline-flex items-baseline gap-0.5">
                    <span>待批改</span>
                    <span>{task.pending_grading_count}</span>
                </span>
            ),
            className: 'bg-warning-100/70 text-text-muted',
        })
    }
    if (task.abnormal_count > 0) {
        tags.push({
            key: 'abnormal',
            label: (
                <span className="inline-flex items-baseline gap-0.5">
                    <span>异常学员</span>
                    <span>{task.abnormal_count}</span>
                </span>
            ),
            className: 'bg-destructive-100/70 text-text-muted',
        })
    }
    if (task.assignee_count === 0) {
        tags.push({ key: 'empty', label: renderTaskTagLabel(0, '人参与'), className: 'bg-muted/85 text-text-muted' })
    }
    return tags
}

const TaskTitleCell: React.FC<{ task: TaskListItem }> = ({ task }) => {
    return (
        <CellWithIcon
            icon={<ListTodo className="h-3.5 w-3.5" strokeWidth={1.8} />}
            title={task.title}
            subtitle={getLastEditedByName(task.updated_by_name, task.created_by_name)}
            iconBgClass="bg-muted/55"
            iconColorClass="text-foreground/60"
        />
    )
}

const TaskResourceCell: React.FC<{ task: TaskListItem }> = ({ task }) => {
    const resourceTags = getTaskResourceTags(task)

    if (resourceTags.length === 0) {
        return <span className="text-[13px] font-medium text-text-muted">—</span>
    }

    return (
            <div className="inline-flex flex-wrap items-center gap-1">
                {resourceTags.map((tag) => (
                    <ListTag key={tag.key} size="sm" className={tag.className}>
                        {tag.label}
                    </ListTag>
                ))}
        </div>
    )
}

const TaskStatusCell: React.FC<{ task: TaskListItem }> = ({ task }) => {
    const status = getTaskDisplayStatus(task)
    const meta = TASK_STATUS_META[status]

    return (
        <ListTag size="sm" className={meta.className}>
            {meta.label}
        </ListTag>
    )
}

const TaskDeadlineCell: React.FC<{ task: TaskListItem }> = ({ task }) => {
    return (
        <CellMutedTimestamp
            icon={<Clock className="h-3.5 w-3.5" />}
            value={task.deadline}
        />
    )
}

const TaskProgressCell: React.FC<{ task: TaskListItem }> = ({ task }) => {
    const completed = task.completed_count
    const total = task.assignee_count
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0

    return (
        <div className="w-full max-w-[116px]">
            <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-medium text-foreground/75">{percent}%</span>
                <span className="text-[11px] font-normal text-text-muted tabular-nums">{completed}/{total}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    )
}

const TaskRiskCell: React.FC<{ task: TaskListItem }> = ({ task }) => {
    const riskTags = getTaskRiskTags(task)

    if (riskTags.length === 0) {
        return <span className="text-[13px] font-medium text-text-muted">—</span>
    }

    return (
            <div className="inline-flex flex-wrap items-center gap-1">
                {riskTags.map((tag) => (
                    <ListTag key={tag.key} size="sm" className={tag.className}>
                        {tag.label}
                    </ListTag>
                ))}
        </div>
    )
}

export const TaskManagement: React.FC = () => {
    const { roleNavigate } = useRoleNavigate()
    const { hasCapability } = useAuth()
    const [statusFilter, setStatusFilter] = React.useState<string>("open")
    const [creatorSideFilter, setCreatorSideFilter] = React.useState<'all' | 'management' | 'non_management'>('all')
    const [search, setSearch] = React.useState('')
    const [deleteId, setDeleteId] = React.useState<number | null>(null)
    const [page, setPage] = React.useState(1)
    const [pageSize, setPageSize] = React.useState(10)
    const canFilterCreatorSide = hasCapability('user.view')

    const { data: tasksData, isLoading } = useTaskList({
        page,
        pageSize,
        search,
        taskStatus: statusFilter as 'open' | 'closed' | 'all',
        creatorSide: canFilterCreatorSide ? creatorSideFilter : 'all',
    })
    const deleteTask = useDeleteTask()
    const columnMeta = React.useMemo<Record<string, ResponsiveColumnMeta>>(() => ({
        title: { width: '21%', minWidth: '300px' },
        resources: { minWidth: '148px' },
        status: { width: '88px' },
        deadline: { width: '168px' },
        progress: { width: '132px' },
        risk: { minWidth: '152px' },
        actions: { minWidth: '136px' },
    }), [])

    React.useEffect(() => {
        setPage(1)
    }, [creatorSideFilter])

    React.useEffect(() => {
        setPage(1)
    }, [statusFilter])

    React.useEffect(() => {
        setPage(1)
    }, [search])

    const handleDeleteTask = async () => {
        if (!deleteId) return
        try {
            await deleteTask.mutateAsync(deleteId)
            toast.success("任务已永久删除")
            setDeleteId(null)
        } catch (error) {
            showApiError(error)
        }
    }

    const openTaskEditor = (task: Pick<TaskListItem, 'id' | 'deadline' | 'actions'>) => {
        if (!task.actions.update || !dayjs(task.deadline).isAfter(dayjs())) {
            return
        }
        roleNavigate(`${ROUTES.TASKS}/${task.id}/edit`)
    }

    const columns: ColumnDef<TaskListItem>[] = [
        {
            header: "任务名称",
            id: "title",
            meta: columnMeta.title,
            cell: ({ row }) => <TaskTitleCell task={row.original} />,
        },
        {
            header: "资源组成",
            id: "resources",
            meta: columnMeta.resources,
            cell: ({ row }) => <TaskResourceCell task={row.original} />,
        },
        {
            header: "状态",
            id: "status",
            meta: columnMeta.status,
            cell: ({ row }) => <TaskStatusCell task={row.original} />,
        },
        {
            header: "截止时间",
            id: "deadline",
            meta: columnMeta.deadline,
            cell: ({ row }) => <TaskDeadlineCell task={row.original} />,
        },
        {
            header: "参与人数进度",
            id: "progress",
            meta: columnMeta.progress,
            cell: ({ row }) => <TaskProgressCell task={row.original} />,
        },
        {
            header: "风险提示",
            id: "risk",
            meta: columnMeta.risk,
            cell: ({ row }) => <TaskRiskCell task={row.original} />,
        },
        {
            header: "操作",
            id: "actions",
            meta: columnMeta.actions,
            cell: ({ row }) => {
                const canEdit = row.original.actions.update || row.original.actions.delete;
                const canPreview = row.original.actions.analytics;
                const isClosedByDeadline = !dayjs(row.original.deadline).isAfter(dayjs());
                return (
                    <div className="inline-flex flex-nowrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {canPreview && (
                            <>
                                <Tooltip title="进度监控">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={LIST_ACTION_ICON_ANALYTICS_CLASS}
                                        onClick={() => roleNavigate(`/tasks/${row.original.id}/preview?tab=progress&entry=task-management`)}
                                    >
                                        <BarChart3 className="h-4 w-4" />
                                    </Button>
                                </Tooltip>
                                <Tooltip title="阅卷中心">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={LIST_ACTION_ICON_VIEW_CLASS}
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
                                        className={LIST_ACTION_ICON_EDIT_CLASS}
                                        disabled={!row.original.actions.update || isClosedByDeadline}
                                        onClick={() => openTaskEditor(row.original)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </Tooltip>
                                {row.original.actions.delete && (
                                    <Tooltip title="删除任务">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={LIST_ACTION_ICON_DESTRUCTIVE_CLASS}
                                            onClick={() => setDeleteId(row.original.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </Tooltip>
                                )}
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
                <div className="mb-1 flex flex-col gap-3 xl:flex-row xl:items-center">
                    <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
                        {canFilterCreatorSide && (
                            <SegmentedControl
                                value={creatorSideFilter}
                                onChange={(val: string) => setCreatorSideFilter(val as 'all' | 'management' | 'non_management')}
                                options={[
                                    { label: '全部来源', value: 'all' },
                                    { label: '管理端', value: 'management' },
                                    { label: '非管理端', value: 'non_management' },
                                ]}
                                className="w-full lg:w-auto lg:shrink-0"
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
                            className="w-full lg:w-auto lg:shrink-0"
                        />
                    </div>
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center xl:ml-auto xl:justify-end">
                        <SearchInput
                            className="w-full sm:w-[20rem] sm:max-w-full sm:shrink-0"
                            placeholder="搜索任务标题..."
                            value={search}
                            onChange={setSearch}
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
                                data={tasksData?.results || []}
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
                                onRowClick={(row: TaskListItem) => openTaskEditor(row)}
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
                isConfirming={deleteTask.isPending}
            />
        </PageFillShell>
    )
}
