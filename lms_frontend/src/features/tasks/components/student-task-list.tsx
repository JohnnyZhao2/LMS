import React, { useState } from 'react';
import { Inbox } from 'lucide-react';
import { useStudentTasks } from '../api/get-tasks';
import { TaskCard } from './task-card';
import { Skeleton } from '@/components/ui/skeleton';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { PageShell } from '@/components/ui/page-shell';
import { SearchInput } from '@/components/ui/search-input';
import { STUDENT_TASK_STATUS_OPTIONS } from '@/lib/task-status';
import type { TaskStatus } from '@/types/common';

const statusOptions = [
    ...STUDENT_TASK_STATUS_OPTIONS,
    { value: 'all', label: '全部' },
];

export const StudentTaskList: React.FC = () => {
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [search, setSearch] = useState('');

    const { data, isLoading } = useStudentTasks({
        status: statusFilter === 'all' ? undefined : (statusFilter as TaskStatus),
        search,
    });
    const tasks = data?.results ?? [];
    const totalCount = data?.count ?? tasks.length;

    return (
        <PageShell className="gap-0 pb-4">
            <div className="flex min-h-0 flex-1 flex-col">
                <div className="mb-6 flex flex-col gap-4 pb-1 xl:flex-row xl:items-center xl:justify-between">
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
                            当前共 <span className="ml-1 text-base text-primary">{totalCount}</span> 个任务
                        </span>
                    </div>
                </div>

                <div className="pb-1">
                    {isLoading && !data ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <Skeleton key={i} className="h-[188px] rounded-2xl" />
                            ))}
                        </div>
                    ) : tasks.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
