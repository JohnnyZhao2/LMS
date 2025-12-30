import { useState } from 'react';
import { FileText, Filter, Inbox } from 'lucide-react';
import { useStudentTasks } from '../api/get-tasks';
import { TaskCard } from './task-card';
import {
    PageHeader,
    Spinner,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui';
import type { TaskStatus } from '@/types/api';

const statusOptions = [
    { value: 'IN_PROGRESS', label: '进行中' },
    { value: 'PENDING_EXAM', label: '待考试' },
    { value: 'COMPLETED', label: '已完成' },
    { value: 'OVERDUE', label: '已逾期' },
];

/**
 * 学员任务列表组件
 * 使用卡片式布局展示任务
 */
export const StudentTaskList: React.FC = () => {
    const [status, setStatus] = useState<TaskStatus | undefined>();

    const { data, isLoading } = useStudentTasks({ status });
    const tasks = data?.results ?? [];
    const totalLabel = data?.count ?? 0;

    const handleStatusChange = (value: string) => {
        // Handle "all" as undefined to show all tasks
        setStatus(value === 'all' ? undefined : (value as TaskStatus));
    };

    return (
        <div>
            <PageHeader
                title="任务中心"
                subtitle="查看和管理学习任务、练习任务和考试任务"
                icon={<FileText className="w-5 h-5" />}
            />

            {/* 筛选区 */}
            <div className="animate-fadeInUp flex items-center gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm">
                <div className="flex items-center gap-2 text-gray-500">
                    <Filter className="w-4 h-4" />
                    <span className="text-sm">筛选</span>
                </div>
                <Select
                    value={status ?? 'all'}
                    onValueChange={handleStatusChange}
                >
                    <SelectTrigger className="w-35">
                        <SelectValue placeholder="状态" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">全部状态</SelectItem>
                        {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span className="ml-auto text-sm text-gray-500">
                    共 {totalLabel} 个任务
                </span>
            </div>

            {/* 任务列表 */}
            <Spinner spinning={isLoading}>
                {tasks && tasks.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tasks.map((task, index) => (
                            <div
                                key={task.id}
                                className="animate-fadeInUp"
                                style={{
                                    animationDelay: `${index * 50}ms`,
                                    animationFillMode: 'both',
                                }}
                            >
                                <TaskCard task={task} variant="student" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <Inbox className="w-12 h-12 mb-4" />
                        <span className="text-base">暂无任务</span>
                    </div>
                )}
            </Spinner>
        </div>
    );
};

export default StudentTaskList;
