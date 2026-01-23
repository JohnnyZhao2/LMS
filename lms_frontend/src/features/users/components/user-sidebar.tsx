/**
 * 用户管理 Sidebar 组件
 * 支持部门视图和师徒视图切换
 */
import { cn } from '@/lib/utils';
import { Building2, Users, UserCircle } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { motion, AnimatePresence } from 'framer-motion';
import type { Department, Mentor } from '@/types/api';

export type ViewMode = 'department' | 'mentorship';

export interface HierarchyItem {
    id: number | 'all';
    name: string;
    subtitle?: string;
    count?: number;
}

interface UserSidebarProps {
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    departments: Department[];
    mentors: Mentor[];
    selectedId: number | 'all' | null;
    onSelect: (id: number | 'all') => void;
    className?: string;
}

export const UserSidebar: React.FC<UserSidebarProps> = ({
    viewMode,
    onViewModeChange,
    departments,
    mentors,
    selectedId,
    onSelect,
    className,
}) => {
    const viewOptions = [
        { label: '部门', value: 'department' },
        { label: '师徒', value: 'mentorship' },
    ];

    // 构建部门层级列表
    const departmentItems: HierarchyItem[] = [
        { id: 'all', name: '全部' },
        ...departments.map(d => ({
            id: d.id,
            name: d.name,
        })),
    ];

    // 构建导师列表
    const mentorItems: HierarchyItem[] = mentors.map(m => ({
        id: m.id,
        name: m.username,
    }));

    const items = viewMode === 'department' ? departmentItems : mentorItems;

    return (
        <div className={cn('w-64 shrink-0 flex flex-col gap-6', className)}>
            {/* 视图切换 */}
            <SegmentedControl
                options={viewOptions}
                value={viewMode}
                onChange={(v) => onViewModeChange(v as ViewMode)}
                activeColor="blue"
            />

            {/* 层级列表标题 */}
            <div className="flex items-center gap-2 px-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {viewMode === 'department' ? '部门架构' : '师徒列表'}
                </span>
            </div>

            {/* 层级列表 */}
            <div className="flex flex-col gap-2 relative">
                <AnimatePresence mode="popLayout" initial={false}>
                    {items.map((item, index) => {
                        const isSelected = selectedId === item.id;
                        const Icon = viewMode === 'department'
                            ? (item.id === 'all' ? Building2 : Users)
                            : UserCircle;

                        return (
                            <motion.button
                                key={item.id}
                                layout
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10, scale: 0.95 }}
                                transition={{
                                    duration: 0.2,
                                    delay: index * 0.03,
                                    layout: { duration: 0.2 }
                                }}
                                onClick={() => onSelect(item.id)}
                                className={cn(
                                    'group relative flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors duration-200',
                                    isSelected
                                        ? 'text-primary-700'
                                        : 'bg-white hover:bg-gray-50 text-gray-700'
                                )}
                            >
                                {isSelected && (
                                    <motion.div
                                        layoutId="user-sidebar-active"
                                        className="absolute inset-0 bg-primary-50 rounded-lg -z-10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                                    />
                                )}

                                <div className={cn(
                                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                                    isSelected
                                        ? 'bg-primary-100 text-primary-700'
                                        : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                                )}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className={cn(
                                        'text-sm font-semibold truncate',
                                        isSelected ? 'text-primary-700' : 'text-gray-900'
                                    )}>
                                        {item.name}
                                    </span>
                                    {item.subtitle && (
                                        <span className={cn(
                                            'text-[10px] font-medium uppercase tracking-wider truncate',
                                            isSelected ? 'text-primary/80' : 'text-gray-400'
                                        )}>
                                            {item.subtitle}
                                        </span>
                                    )}
                                </div>
                            </motion.button>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
};
