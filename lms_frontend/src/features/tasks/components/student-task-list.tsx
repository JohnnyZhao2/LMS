"use client"

import React, { useState } from 'react';
import { Inbox, Activity, Search } from 'lucide-react';
import { useStudentTasks } from '../api/get-tasks';
import { TaskCard } from './task-card';
import { Skeleton } from '@/components/ui';
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
 * 学员任务列表组件 - Flat Design 版本
 * 
 * 设计规范：
 * - 无阴影 (shadow-none)
 * - 无渐变 (no gradient)
 * - 实心背景色
 * - hover:scale 交互反馈
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
        <div className="space-y-10">
            {/* 顶部标题栏 - Flat Design */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4">
                    <h2 className="text-4xl sm:text-5xl font-bold text-[#111827] tracking-tight flex items-center gap-4">
                        <div className="w-14 h-14 bg-[#3B82F6] rounded-md flex items-center justify-center text-white">
                            <Activity className="w-8 h-8" />
                        </div>
                        任务治理中心
                    </h2>
                    <p className="text-lg font-semibold text-[#6B7280] uppercase tracking-widest flex items-center gap-3">
                        <span className="w-8 h-[3px] bg-[#3B82F6] rounded-full" />
                        战略学习任务
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative group min-w-[320px]">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280] group-focus-within:text-[#3B82F6] transition-colors" />
                        <Input
                            className="pl-14"
                            placeholder="搜索任务标题或编号..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* 分段筛选器 - Flat Design */}
            <div className="flex flex-wrap items-center gap-6 pb-6 border-b-2 border-[#F3F4F6]">
                <div className="flex items-center gap-1 bg-[#F3F4F6] p-1 rounded-lg">
                    {statusOptions.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setStatus(opt.value === 'all' ? undefined : (opt.value as TaskStatus))}
                            className={cn(
                                "px-6 py-3 rounded-md text-xs font-bold uppercase tracking-widest transition-all duration-200",
                                (status === opt.value || (!status && opt.value === 'all'))
                                    ? "bg-[#3B82F6] text-white hover:bg-[#2563EB]"
                                    : "text-[#6B7280] hover:text-[#111827] hover:bg-[#E5E7EB]",
                                "hover:scale-105 active:scale-95"
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <div className="h-8 w-[2px] bg-[#E5E7EB] hidden md:block" />
                <span className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">
                    共找到 <span className="text-[#3B82F6] text-base ml-1">{filteredTasks.length}</span> 个任务
                </span>
            </div>

            {/* 任务列表网格 */}
            <div>
                {isLoading ? (
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
                    <div className="flex flex-col items-center justify-center py-32 bg-[#F3F4F6] rounded-lg">
                        <div className="w-24 h-24 bg-[#E5E7EB] rounded-md flex items-center justify-center mb-6">
                            <Inbox className="w-10 h-10 text-[#9CA3AF]" />
                        </div>
                        <h3 className="text-2xl font-bold text-[#111827] mb-2">任务清单净空</h3>
                        <p className="text-[#6B7280] font-semibold uppercase tracking-widest text-sm">所有任务已同步完成</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentTaskList;
