"use client"

import React, { useState } from 'react';
import { Inbox, Activity, Search } from 'lucide-react';
import { useStudentTasks } from '../api/get-tasks';
import { TaskCard } from './task-card';
import {
    Skeleton,
} from '@/components/ui';
import { Input } from '@/components/ui/input';
import type { TaskStatus } from '@/types/api';
import { cn } from '@/lib/utils';

const statusOptions = [
    { value: 'all', label: '全部' },
    { value: 'IN_PROGRESS', label: '进行中' },
    { value: 'COMPLETED', label: '已完成' },
    { value: 'OVERDUE', label: '已逾期' },
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
                    <h2 className="text-4xl sm:text-5xl font-black text-clay-foreground tracking-tight font-display flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-clay-primary to-clay-secondary rounded-2xl flex items-center justify-center text-white shadow-clay-btn">
                            <Activity className="w-8 h-8" />
                        </div>
                        任务治理中心
                    </h2>
                    <p className="text-lg font-bold text-clay-muted uppercase tracking-widest flex items-center gap-3">
                        <span className="w-8 h-[3px] bg-clay-primary/30 rounded-full" />
                        战略学习任务
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative group min-w-[320px]">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-clay-muted group-focus-within:text-clay-primary transition-colors" />
                        <Input
                            className="pl-14"
                            placeholder="搜索任务标题或编号..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* 极致筛选器 */}
            <div className="reveal-item stagger-delay-1 flex flex-wrap items-center gap-6 pb-6 border-b border-clay-muted/10">
                <div className="flex items-center gap-2 bg-white/40 p-2 rounded-[24px] border border-white/60 shadow-inner">
                    {statusOptions.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setStatus(opt.value === 'all' ? undefined : (opt.value as TaskStatus))}
                            className={cn(
                                "px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300",
                                (status === opt.value || (!status && opt.value === 'all'))
                                    ? "bg-gradient-to-r from-clay-primary to-clay-secondary text-white shadow-clay-btn"
                                    : "text-clay-muted hover:text-clay-foreground hover:bg-white/50"
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <div className="h-8 w-[1px] bg-clay-muted/20 hidden md:block" />
                <span className="text-xs font-black text-clay-muted uppercase tracking-[0.2em]">
                    共找到 <span className="text-clay-primary text-base ml-1">{filteredTasks.length}</span> 个任务
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
                    <div className="flex flex-col items-center justify-center py-32 bg-clay-cardBg backdrop-blur-md rounded-[3rem] border border-white/50 shadow-clay-card">
                        <div className="w-24 h-24 bg-clay-bg rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <Inbox className="w-10 h-10 text-clay-muted/50" />
                        </div>
                        <h3 className="text-2xl font-black text-clay-foreground mb-2">任务清单净空</h3>
                        <p className="text-clay-muted font-bold uppercase tracking-widest text-sm">所有任务已同步完成</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentTaskList;
