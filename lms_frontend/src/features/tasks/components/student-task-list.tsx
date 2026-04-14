import React, { useState } from 'react';
import { Inbox, Activity } from 'lucide-react';
import { useStudentTasks } from '../api/get-tasks';
import { TaskCard } from './task-card';
import { Skeleton } from '@/components/ui/skeleton';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { SearchInput } from '@/components/ui/search-input';
import type { TaskStatus } from '@/types/common';

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
    const [search, setSearch] = useState('');

    const { data, isLoading } = useStudentTasks({
        status: statusFilter === 'all' ? undefined : (statusFilter as TaskStatus),
        search,
    });
    const tasks = data?.results ?? [];
    const totalCount = data?.count ?? tasks.length;

    return (
        <PageShell className="pb-4">
            <PageHeader
                title="任务中心"
                icon={<Activity />}
            />

            <div className="flex min-h-0 flex-1 flex-col">
                {/* 分段筛选器 - Flat Design */}
                <div className="mb-1 flex flex-col gap-4 pb-3 xl:flex-row xl:items-center xl:justify-between">
                    <SegmentedControl
                        value={statusFilter}
                        onChange={(val: string) => setStatusFilter(val)}
                        options={statusOptions}
                        className="w-full xl:w-auto xl:shrink-0"
                    />
                    <div className="flex w-full min-w-0 flex-col gap-3 xl:w-auto xl:flex-row xl:items-center">
                        <SearchInput
                            value={search}
                            onChange={setSearch}
                            placeholder="搜索任务标题..."
                            className="w-full xl:w-[20rem] xl:max-w-full xl:shrink-0"
                        />
                        <span className="text-xs font-bold uppercase tracking-widest text-text-muted xl:whitespace-nowrap">
                            当前共 <span className="text-primary text-base ml-1">{totalCount}</span> 个任务
                        </span>
                    </div>
                </div>

                {/* 任务列表网格 */}
                <div className="pb-1">
                    {isLoading && !data ? (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <Skeleton key={i} className="h-80 rounded-lg" />
                            ))}
                        </div>
                    ) : tasks.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {tasks.map((task) => (
                                <TaskCard key={task.id} task={task} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-2xl bg-muted py-32">
                            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-md bg-muted">
                                <Inbox className="h-10 w-10 text-text-muted" />
                            </div>
                            <h3 className="mb-2 text-2xl font-bold text-foreground">任务清单净空</h3>
                            <p className="text-sm font-semibold uppercase tracking-widest text-text-muted">所有任务已同步完成</p>
                        </div>
                    )}
                </div>
            </div>
        </PageShell>
    );
};
