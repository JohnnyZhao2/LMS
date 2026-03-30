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
            />

            {/* 层级列表标题 */}
            <div className="flex items-center gap-2 px-2">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    {viewMode === 'department' ? '部门架构' : '师徒列表'}
                </span>
            </div>

            {/* 层级列表 */}
            <div className="flex flex-col gap-2 relative">
                {items.map((item) => {
                    const isSelected = selectedId === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onSelect(item.id)}
                            className={cn(
                                'group relative flex items-center gap-3 rounded-lg px-4 py-3 text-left outline-none transition-all duration-200 focus-visible:outline-none focus-visible:ring-0',
                                isSelected
                                    ? 'bg-background text-primary-700 shadow-[0_4px_16px_rgba(var(--primary),0.08)]'
                                    : 'bg-muted text-text-muted'
                            )}
                        >
                            <div className="flex flex-col min-w-0">
                                <span className={cn(
                                    'text-sm font-semibold truncate',
                                    isSelected ? 'text-primary-700' : 'text-text-muted'
                                )}>
                                    {item.name}
                                </span>
                                {item.subtitle && (
                                    <span className={cn(
                                        'text-[10px] font-medium uppercase tracking-wider truncate',
                                        isSelected ? 'text-primary/80' : 'text-text-muted'
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
    );
};
