"use client"

import React, { useState } from 'react';
import { FileText, Filter, Inbox, Activity, Search } from 'lucide-react';
import { useStudentTasks } from '../api/get-tasks';
import { TaskCard } from './task-card';
import {
    Spinner,
    Skeleton,
} from '@/components/ui';
import { Input } from '@/components/ui/input';
import type { TaskStatus } from '@/types/api';
import { cn } from '@/lib/utils';

const statusOptions = [
    { value: 'all', label: '全部' },
    { value: 'IN_PROGRESS', label: '进行中' },
    { value: 'PENDING_EXAM', label: '待评审' },
    { value: 'COMPLETED', label: '已完成' },
    { value: 'OVERDUE', label: '紧急 / 逾期' },
];

/**
 * 学员任务列表组件 - 极致美学版
 */
export const StudentTaskList: React.FC = () => {
    const [status, setStatus] = useState<TaskStatus | undefined>();
    const [searchTerm, setSearchTerm] = useState("");

    const { data, isLoading } = useStudentTasks({ status });
    const allTasks = data?.results ?? [];

    const filteredTasks = allTasks.filter(t =>
        t.task_title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-10 animate-fadeIn">
            {/* 顶部标题栏 */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 reveal-item">
                <div className="space-y-4">
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight font-display flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-black/10">
                            <Activity className="w-7 h-7" />
                        </div>
                        任务治理中心
                    </h2>
                    <p className="text-base font-bold text-gray-400 uppercase tracking-widest flex items-center gap-3">
                        <span className="w-8 h-[2px] bg-primary-500/30 rounded-full" />
                        战略学习任务
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative group min-w-[320px]">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                        <Input
                            className="h-16 pl-14 pr-8 bg-white rounded-[1.25rem] border-none shadow-premium focus:ring-4 ring-primary-50 text-base font-medium"
                            placeholder="搜索任务标题或编号..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* 极致筛选器 */}
            <div className="reveal-item stagger-delay-1 flex flex-wrap items-center gap-6 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-3 bg-gray-100/50 p-1.5 rounded-[1.5rem] border border-white shadow-inner">
                    {statusOptions.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setStatus(opt.value === 'all' ? undefined : (opt.value as TaskStatus))}
                            className={cn(
                                "px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300",
                                (status === opt.value || (!status && opt.value === 'all'))
                                    ? "bg-white text-gray-900 shadow-xl"
                                    : "text-gray-400 hover:text-gray-600"
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <div className="h-8 w-[1px] bg-gray-200 hidden md:block" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                    共找到 <span className="text-gray-900">{filteredTasks.length}</span> 个任务
                </span>
            </div>

            {/* 任务列表网格 */}
            <div className="reveal-item stagger-delay-2">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Skeleton key={i} className="h-96 rounded-[2.5rem]" />
                        ))}
                    </div>
                ) : filteredTasks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-20">
                        {filteredTasks.map((task, index) => (
                            <div
                                key={task.id}
                                className={cn("reveal-item", `stagger-delay-${(index % 4) + 1}`)}
                            >
                                <TaskCard task={task} variant="student" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-gray-100 shadow-sm">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <Inbox className="w-10 h-10 text-gray-200" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-2">任务清单净空</h3>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">所有任务已同步完成</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentTaskList;
