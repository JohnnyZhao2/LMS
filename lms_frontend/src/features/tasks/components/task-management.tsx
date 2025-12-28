import { useMemo, useState } from 'react';
import {
    Table,
    Empty,
    Spin,
    Button,
    Typography,
    Input,
    Tag,
    Progress,
    Popconfirm,
    message,
    Tooltip,
    Segmented,
} from 'antd';
import {
    PlusOutlined,
    FileTextOutlined,
    SearchOutlined,
    BookOutlined,
    FireOutlined,
    CheckCircleOutlined,
    EditOutlined,
    DeleteOutlined,
    EyeOutlined,
    GoldOutlined,
    DownOutlined,
    UpOutlined,
    CloseCircleOutlined,
} from '@ant-design/icons';
import { useTaskList } from '../api/get-tasks';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import { usePendingGrading } from '@/features/grading/api/get-pending-grading';
import { PageHeader, Card, StatusBadge } from '@/components/ui';
import { useDeleteTask } from '../api/delete-task';
import { showApiError } from '@/utils/error-handler';
import type { TaskListItem, TaskType } from '@/types/api';
import dayjs from '@/lib/dayjs';

const { Text } = Typography;

/**
 * 统计卡片组件
 */
interface StatCardProps {
    label: string;
    value: number | string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    description?: string;
}

const StatCard: React.FC<StatCardProps> = ({
    label,
    value,
    icon,
    color,
    bgColor,
    description,
}) => (
    <Card
        hoverable
        style={{
            height: '100%',
            overflow: 'hidden',
            position: 'relative',
        }}
    >
        {/* 装饰圆圈 */}
        <div
            style={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: bgColor,
                opacity: 0.3,
            }}
        />
        <div
            style={{
                position: 'absolute',
                top: 20,
                right: 20,
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: bgColor,
                opacity: 0.2,
            }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
            {/* 图标 */}
            <div
                style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--radius-lg)',
                    background: bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: color,
                    fontSize: 24,
                    marginBottom: 'var(--spacing-4)',
                }}
            >
                {icon}
            </div>

            {/* 标签 */}
            <Text
                type="secondary"
                style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                }}
            >
                {label}
            </Text>

            {/* 数值 */}
            <div
                style={{
                    fontSize: 'var(--font-size-4xl)',
                    fontWeight: 700,
                    color: 'var(--color-gray-900)',
                    lineHeight: 1.2,
                    marginTop: 'var(--spacing-1)',
                }}
            >
                {value}
            </div>

            {/* 描述 */}
            {description && (
                <Text
                    type="secondary"
                    style={{
                        fontSize: 'var(--font-size-xs)',
                        marginTop: 'var(--spacing-2)',
                        display: 'block',
                    }}
                >
                    {description}
                </Text>
            )}
        </div>
    </Card>
);

/**
 * 任务类型配置
 */
const taskTypeConfig = {
    LEARNING: {
        icon: <BookOutlined />,
        color: 'var(--color-success-500)',
        bg: 'var(--color-success-50)',
        label: '学习',
        tagColor: 'green',
    },
    PRACTICE: {
        icon: <FileTextOutlined />,
        color: 'var(--color-primary-500)',
        bg: 'var(--color-primary-50)',
        label: '练习',
        tagColor: 'blue',
    },
    EXAM: {
        icon: <FireOutlined />,
        color: 'var(--color-error-500)',
        bg: 'var(--color-error-50)',
        label: '考试',
        tagColor: 'red',
    },
};

/**
 * 任务管理组件（管理员/导师视图）
 */
export const TaskManagement: React.FC = () => {
    const { currentRole, user } = useAuth();
    const navigate = useNavigate();
    const [taskType, setTaskType] = useState<string>('ALL');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [deptFilter, setDeptFilter] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // 获取任务列表（不带筛选，前端筛选）
    const { data: tasks, isLoading } = useTaskList({});

    // 获取待评分数量
    const { data: pendingGradingData } = usePendingGrading(1);

    // 删除任务
    const deleteTask = useDeleteTask();

    // 综合筛选任务
    const filteredTasks = useMemo(() => {
        if (!tasks) return [];
        return tasks.filter((t) => {
            // 搜索
            const query = searchQuery.toLowerCase();
            const matchesSearch = !query ||
                t.title.toLowerCase().includes(query) ||
                t.id.toString().includes(query);

            // 任务类型
            const matchesType = taskType === 'ALL' || t.task_type === taskType;

            // 状态
            const matchesStatus = statusFilter === 'ALL' ||
                (statusFilter === 'ACTIVE' && !t.is_closed) ||
                (statusFilter === 'CLOSED' && t.is_closed);

            // 部门（暂时前端模拟，后端需要添加 dept 字段）
            // const matchesDept = deptFilter === 'ALL' || t.dept === deptFilter;

            return matchesSearch && matchesType && matchesStatus;
        });
    }, [tasks, searchQuery, taskType, statusFilter]);

    // 统计数据
    const stats = useMemo(() => {
        const allTasks = tasks || [];
        const total = allTasks.length;
        // is_closed 由后端计算（手动关闭或截止时间已过）
        const active = allTasks.filter((t) => !t.is_closed).length;
        const pendingGrading = pendingGradingData?.count || 0;

        // 计算整体及格率：所有任务的平均及格率
        const tasksWithPassRate = allTasks.filter((t) => t.pass_rate !== null && t.pass_rate !== undefined);
        let passRate = '-';
        if (tasksWithPassRate.length > 0) {
            const avgPassRate = tasksWithPassRate.reduce((sum, t) => sum + (t.pass_rate ?? 0), 0) / tasksWithPassRate.length;
            passRate = `${avgPassRate.toFixed(1)}%`;
        }

        return { total, active, pendingGrading, passRate };
    }, [tasks, pendingGradingData]);

    // 检查是否有权限操作任务
    const canEditTask = (task: TaskListItem) => {
        const isAdmin = currentRole === 'ADMIN';
        const isCreator = task.created_by === user?.id;
        return isAdmin || isCreator;
    };

    // 删除任务
    const handleDelete = async (taskId: number) => {
        try {
            await deleteTask.mutateAsync(taskId);
            message.success('任务已删除');
        } catch (error) {
            showApiError(error, '删除失败');
        }
    };

    // 表格列定义
    const columns = [
        {
            title: '任务名称',
            dataIndex: 'title',
            key: 'title',
            width: 280,
            ellipsis: true,
            render: (text: string, record: TaskListItem) => {
                const config = taskTypeConfig[record.task_type as keyof typeof taskTypeConfig] || taskTypeConfig.LEARNING;
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 'var(--radius-md)',
                                background: config.bg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: config.color,
                                fontSize: 16,
                                flexShrink: 0,
                            }}
                        >
                            {config.icon}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <Text strong ellipsis style={{ display: 'block', maxWidth: '100%' }}>
                                {text}
                            </Text>
                            <Text
                                type="secondary"
                                style={{ fontSize: 'var(--font-size-xs)' }}
                            >
                                {record.created_by_name}
                            </Text>
                        </div>
                    </div>
                );
            },
        },
        {
            title: '类型',
            dataIndex: 'task_type',
            key: 'task_type',
            width: 80,
            align: 'center' as const,
            render: (type: TaskType) => {
                const config = taskTypeConfig[type as keyof typeof taskTypeConfig] || taskTypeConfig.LEARNING;
                return (
                    <Tag color={config.tagColor}>
                        {config.label}
                    </Tag>
                );
            },
        },
        {
            title: '完成进度',
            key: 'progress',
            width: 140,
            render: (_: unknown, record: TaskListItem) => {
                const completed = record.completed_count || 0;
                const total = record.assignee_count || 0;
                const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
                const config = taskTypeConfig[record.task_type as keyof typeof taskTypeConfig] || taskTypeConfig.LEARNING;

                return (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
                                {completed}/{total}
                            </Text>
                            <Text style={{ fontSize: 'var(--font-size-xs)', color: config.color, fontWeight: 600 }}>
                                {percentage}%
                            </Text>
                        </div>
                        <Progress
                            percent={percentage}
                            showInfo={false}
                            strokeColor={config.color}
                            trailColor="var(--color-gray-100)"
                            size="small"
                        />
                    </div>
                );
            },
        },
        {
            title: '及格率',
            key: 'pass_rate',
            width: 80,
            align: 'center' as const,
            render: (_: unknown, record: TaskListItem) => {
                if (record.pass_rate === null || record.pass_rate === undefined) {
                    return <Text type="secondary">-</Text>;
                }
                const rate = record.pass_rate;
                const color = rate >= 80 ? 'var(--color-success-500)' : rate >= 60 ? 'var(--color-warning-500)' : 'var(--color-error-500)';
                return (
                    <Text style={{ fontWeight: 600, color }}>
                        {rate.toFixed(0)}%
                    </Text>
                );
            },
        },
        {
            title: '截止时间',
            dataIndex: 'deadline',
            key: 'deadline',
            width: 120,
            render: (deadline: string, record: TaskListItem) => {
                const isUrgent = !record.is_closed && dayjs(deadline).diff(dayjs(), 'day') <= 1;
                return (
                    <Text
                        style={{
                            color: isUrgent ? 'var(--color-error-500)' : 'var(--color-gray-600)',
                            fontWeight: isUrgent ? 600 : 400,
                            fontSize: 'var(--font-size-sm)',
                        }}
                    >
                        {dayjs(deadline).format('MM-DD HH:mm')}
                    </Text>
                );
            },
        },
        {
            title: '状态',
            key: 'status',
            width: 80,
            align: 'center' as const,
            render: (_: unknown, record: TaskListItem) => (
                <StatusBadge
                    status={record.is_closed ? 'default' : 'processing'}
                    text={record.is_closed ? '已结束' : '进行中'}
                    size="small"
                />
            ),
        },
        {
            title: '操作',
            key: 'action',
            width: 140,
            render: (_: unknown, record: TaskListItem) => (
                <div style={{ display: 'flex', gap: 'var(--spacing-1)' }}>
                    <Tooltip title="预览">
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                            size="small"
                            onClick={() => navigate(`/tasks/${record.id}`)}
                        />
                    </Tooltip>
                    {canEditTask(record) && (
                        <>
                            <Tooltip title="编辑">
                                <Button
                                    type="text"
                                    icon={<EditOutlined />}
                                    size="small"
                                    disabled={record.is_closed}
                                    onClick={() => navigate(`/tasks/${record.id}/edit`)}
                                />
                            </Tooltip>
                            <Popconfirm
                                title="确认删除"
                                description="确定要删除此任务吗？此操作不可恢复。"
                                onConfirm={() => handleDelete(record.id)}
                                okText="删除"
                                cancelText="取消"
                                okButtonProps={{ danger: true }}
                            >
                                <Tooltip title="删除">
                                    <Button
                                        type="text"
                                        icon={<DeleteOutlined />}
                                        size="small"
                                        danger
                                    />
                                </Tooltip>
                            </Popconfirm>
                        </>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="animate-fadeIn">
            {/* 页面头部 */}
            <PageHeader
                title="任务中心"
                subtitle="管理并监控学习任务、练习任务和考试任务"
                icon={<FileTextOutlined />}
                extra={
                    <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                        {stats.pendingGrading > 0 && (
                            <Button
                                icon={<GoldOutlined />}
                                onClick={() => navigate('/grading')}
                                style={{
                                    height: 44,
                                    paddingLeft: 'var(--spacing-5)',
                                    paddingRight: 'var(--spacing-5)',
                                    fontWeight: 600,
                                    borderRadius: 'var(--radius-lg)',
                                }}
                            >
                                进入评审中心
                                <Tag
                                    color="error"
                                    style={{
                                        marginLeft: 8,
                                        borderRadius: 'var(--radius-full)',
                                        minWidth: 24,
                                        textAlign: 'center',
                                    }}
                                >
                                    {stats.pendingGrading}
                                </Tag>
                            </Button>
                        )}
                        {stats.pendingGrading === 0 && (
                            <Button
                                icon={<GoldOutlined />}
                                onClick={() => navigate('/grading')}
                                style={{
                                    height: 44,
                                    paddingLeft: 'var(--spacing-5)',
                                    paddingRight: 'var(--spacing-5)',
                                    fontWeight: 600,
                                    borderRadius: 'var(--radius-lg)',
                                }}
                            >
                                进入评审中心
                            </Button>
                        )}
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => navigate('/tasks/create')}
                            style={{
                                height: 44,
                                paddingLeft: 'var(--spacing-5)',
                                paddingRight: 'var(--spacing-5)',
                                fontWeight: 600,
                                borderRadius: 'var(--radius-lg)',
                            }}
                        >
                            发布新任务
                        </Button>
                    </div>
                }
            />

            {/* 统计卡片 */}
            <div
                className="animate-fadeInUp"
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 'var(--spacing-4)',
                    marginBottom: 'var(--spacing-6)',
                }}
            >
                <StatCard
                    label="任务总数"
                    value={stats.total}
                    icon={<FileTextOutlined />}
                    color="var(--color-primary-500)"
                    bgColor="var(--color-primary-50)"
                    description="累计发布的任务总量"
                />
                <StatCard
                    label="进行中"
                    value={stats.active}
                    icon={<CheckCircleOutlined />}
                    color="var(--color-success-500)"
                    bgColor="var(--color-success-50)"
                    description="学员正在参与的任务"
                />
                <StatCard
                    label="待批阅"
                    value={stats.pendingGrading}
                    icon={<EditOutlined />}
                    color="var(--color-warning-500)"
                    bgColor="var(--color-warning-50)"
                    description="主观题待导师评审"
                />
                <StatCard
                    label="及格率"
                    value={stats.passRate}
                    icon={<GoldOutlined />}
                    color="var(--color-purple-500)"
                    bgColor="#F3E8FF"
                    description="已完成任务的整体表现"
                />
            </div>

            {/* 筛选区和任务列表 */}
            <Card>
                {/* 顶部筛选条 */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-4)',
                        marginBottom: showAdvancedFilters ? 'var(--spacing-3)' : 'var(--spacing-4)',
                    }}
                >
                    {/* 搜索框 */}
                    <Input
                        placeholder="搜索任务名称..."
                        prefix={<SearchOutlined style={{ color: 'var(--color-gray-400)' }} />}
                        style={{ width: 220 }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        allowClear
                    />

                    {/* 任务类型分段选择器 */}
                    <Segmented
                        value={taskType}
                        onChange={(value) => setTaskType(value as string)}
                        options={[
                            { value: 'ALL', label: '全部' },
                            { value: 'LEARNING', label: '学习' },
                            { value: 'PRACTICE', label: '练习' },
                            { value: 'EXAM', label: '考试' },
                        ]}
                    />

                    {/* 更多筛选按钮 */}
                    <Button
                        type="text"
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        icon={showAdvancedFilters ? <UpOutlined /> : <DownOutlined />}
                        style={{
                            marginLeft: 'auto',
                            color: (statusFilter !== 'ALL' || deptFilter !== 'ALL')
                                ? 'var(--color-primary-500)'
                                : 'var(--color-gray-500)',
                        }}
                    >
                        更多筛选
                        {(statusFilter !== 'ALL' || deptFilter !== 'ALL') && (
                            <Tag
                                color="blue"
                                style={{ marginLeft: 4, borderRadius: 'var(--radius-full)' }}
                            >
                                {(statusFilter !== 'ALL' ? 1 : 0) + (deptFilter !== 'ALL' ? 1 : 0)}
                            </Tag>
                        )}
                    </Button>
                </div>

                {/* 高级筛选面板 */}
                {showAdvancedFilters && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-4)',
                            padding: 'var(--spacing-3)',
                            marginBottom: 'var(--spacing-4)',
                            background: 'var(--color-gray-50)',
                            borderRadius: 'var(--radius-md)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                            <Text type="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>状态:</Text>
                            <Segmented
                                size="small"
                                value={statusFilter}
                                onChange={(value) => setStatusFilter(value as string)}
                                options={[
                                    { value: 'ALL', label: '全部' },
                                    { value: 'ACTIVE', label: '进行中' },
                                    { value: 'CLOSED', label: '已结束' },
                                ]}
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                            <Text type="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>部门:</Text>
                            <Segmented
                                size="small"
                                value={deptFilter}
                                onChange={(value) => setDeptFilter(value as string)}
                                options={[
                                    { value: 'ALL', label: '全部' },
                                    { value: 'DEPT_1', label: '一室' },
                                    { value: 'DEPT_2', label: '二室' },
                                ]}
                            />
                        </div>

                        {/* 重置筛选 */}
                        {(statusFilter !== 'ALL' || deptFilter !== 'ALL') && (
                            <Button
                                type="link"
                                size="small"
                                icon={<CloseCircleOutlined />}
                                onClick={() => {
                                    setStatusFilter('ALL');
                                    setDeptFilter('ALL');
                                }}
                                style={{ marginLeft: 'auto' }}
                            >
                                重置
                            </Button>
                        )}
                    </div>
                )}

                {/* 任务表格 */}
                <Spin spinning={isLoading}>
                    {filteredTasks && filteredTasks.length > 0 ? (
                        <Table
                            columns={columns}
                            dataSource={filteredTasks}
                            rowKey="id"
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: false,
                                showTotal: (total) => `共 ${total} 条`,
                            }}
                            style={{ marginTop: 'var(--spacing-2)' }}
                        />
                    ) : (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <div style={{ textAlign: 'center' }}>
                                    <Text type="secondary">
                                        {searchQuery ? '未找到符合搜索条件的任务' : '暂无任务'}
                                    </Text>
                                </div>
                            }
                            style={{ padding: 'var(--spacing-12) 0' }}
                        />
                    )}
                </Spin>
            </Card>
        </div>
    );
};

export default TaskManagement;
