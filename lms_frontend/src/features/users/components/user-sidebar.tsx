/**
 * 用户管理 Sidebar 组件
 * 支持部门视图和师徒视图切换
 */
import { cn } from '@/lib/utils';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { Department, Mentor } from '@/types/api';

export type ViewMode = 'department' | 'mentorship';

interface HierarchyItem {
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
    const sidebarWidthClass = 'w-[9.5rem]';
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
        <div className={cn(sidebarWidthClass, 'shrink-0 flex min-h-0 flex-col gap-6', className)}>
            {/* 视图切换 */}
            <SegmentedControl
                className={cn(
                    'w-full',
                    'flex [&>div]:grid [&>div]:w-full [&>div]:grid-cols-2 [&_button]:flex-1'
                )}
                options={viewOptions}
                value={viewMode}
                onChange={(v) => onViewModeChange(v as ViewMode)}
            />

            {/* 层级列表标题 */}
            <div className="flex items-center gap-2 px-2">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    {viewMode === 'department' ? '部门架构' : '师徒列表'}
                </span>
            </div>

            {/* 层级列表 */}
            <div className="min-h-0 flex-1 overflow-hidden">
                <div className="scrollbar-subtle relative flex max-h-full flex-col gap-1.5 overflow-y-auto rounded-2xl bg-muted/70 p-2">
                    {items.map((item) => {
                        const isSelected = selectedId === item.id;

                        return (
                            <button
                                key={item.id}
                                onClick={() => onSelect(item.id)}
                                className={cn(
                                    'w-full',
                                    'group relative flex items-center gap-3 rounded-xl border px-4 py-3 text-left outline-none transition-all duration-200 focus-visible:outline-none focus-visible:ring-0',
                                    isSelected
                                        ? 'border-border/80 bg-white text-foreground shadow-sm'
                                        : 'border-transparent bg-transparent text-text-muted hover:bg-white/70 hover:text-foreground'
                                )}
                            >
                                <div className="flex min-w-0 flex-col">
                                    <span className={cn(
                                        'truncate text-sm font-semibold',
                                        isSelected ? 'text-foreground' : 'text-text-muted group-hover:text-foreground'
                                    )}>
                                        {item.name}
                                    </span>
                                    {item.subtitle && (
                                        <span className={cn(
                                            'truncate text-[10px] font-medium uppercase tracking-wider',
                                            isSelected ? 'text-text-muted' : 'text-text-muted/80'
                                        )}>
                                            {item.subtitle}
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
