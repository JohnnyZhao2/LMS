import React, { useState } from 'react';
import { Inbox, Activity, Search } from 'lucide-react';
import { useStudentTasks } from '../api/get-tasks';
import { TaskCard } from './task-card';
import { Skeleton } from '@/components/ui/skeleton';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import type { TaskStatus } from '@/types/api';

const statusOptions = [
    { value: 'IN_PROGRESS', label: '进行中' },
    { value: 'COMPLETED', label: '已完成' },
    { value: 'OVERDUE', label: '已逾期' },
    { value: 'all', label: '全部' },
];

/**
 * 学员任务列表组件 - Flat Design 版本
 * 
 * 设计规范：
 * - 无阴影 
 * - 无渐变 (no gradient)
 * - 实心背景色
 * - hover:scale 交互反馈
 */
export const StudentTaskList: React.FC = () => {
    const [statusFilter, setStatusFilter] = useState<string>("IN_PROGRESS");
    const [searchTerm, setSearchTerm] = useState("");

    const { data, isLoading } = useStudentTasks({
        status: statusFilter === 'all' ? undefined : (statusFilter as TaskStatus)
    });
    const allTasks = data?.results ?? [];

    const filteredTasks = allTasks.filter(t =>
        t.task_title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-10">
            {/* 顶部标题栏 - Flat Design */}
            {/* 顶部标题栏 - Refactored to use PageHeader */}
            <PageHeader
                title="任务治理中心"
                icon={<Activity />}
                extra={
                    <div className="relative group min-w-[320px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary transition-colors" />
                        <Input
                            className="pl-12 h-12 bg-muted border-0 rounded-md focus:bg-background focus:border-2 focus:border-primary text-sm font-medium"
                            placeholder="搜索任务..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                }
            />

            {/* 分段筛选器 - Flat Design */}
            <div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b-2 border-border">
                <div className="flex items-center gap-4">
                    <SegmentedControl
                        value={statusFilter}
                        onChange={(val: string) => setStatusFilter(val)}
                        options={statusOptions}
                        variant="premium"
                        activeColor="white"
                        className="w-full md:w-auto"
                    />
                </div>

                <span className="text-xs font-bold text-text-muted uppercase tracking-widest">
                    共找到 <span className="text-primary text-base ml-1">{filteredTasks.length}</span> 个任务
                </span>
            </div>

            {/* 任务列表网格 */}
            <div>
                {isLoading && !data ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Skeleton key={i} className="h-80 rounded-lg" />
                        ))}
                    </div>
                ) : filteredTasks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                        {filteredTasks.map((task) => (
                            <TaskCard key={task.id} task={task} variant="student" />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 bg-muted rounded-lg">
                        <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center mb-6">
                            <Inbox className="w-10 h-10 text-text-muted" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-2">任务清单净空</h3>
                        <p className="text-text-muted font-semibold uppercase tracking-widest text-sm">所有任务已同步完成</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentTaskList;
