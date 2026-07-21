import { Search, Users } from 'lucide-react';

import { UserSelectableList } from '@/components/common/user-selectable-list';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';
import type { SpotCheckStudent } from '@/features/spot-checks/types/spot-check';

export type SpotCheckDepartmentFilter = 'all' | 'room1' | 'room2';

interface SpotCheckStudentPanelProps {
  students: SpotCheckStudent[];
  /** 当前查看的学员（点行） */
  selectedStudentId: number | null;
  /** 勾选用于批量发起的学员（点勾） */
  checkedStudentIds: number[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSelectStudent: (studentId: number | null) => void;
  onToggleCheckStudent: (studentId: number) => void;
  /** true=全选当前列表，false=清空勾选 */
  onToggleCheckAll: (selectAll: boolean) => void;
  departmentFilter: SpotCheckDepartmentFilter;
  onDepartmentFilterChange: (value: SpotCheckDepartmentFilter) => void;
  isLoading: boolean;
}

export const SpotCheckStudentPanel: React.FC<SpotCheckStudentPanelProps> = ({
  students,
  selectedStudentId,
  checkedStudentIds,
  searchValue,
  onSearchChange,
  onSelectStudent,
  onToggleCheckStudent,
  onToggleCheckAll,
  departmentFilter,
  onDepartmentFilterChange,
  isLoading,
}) => {
  const panelItems = students.map((student) => ({
    id: student.id,
    name: student.username,
    avatarKey: student.avatar_key,
    meta: student.department_name
      ? `${student.employee_id || '未填写工号'} · ${student.department_name}`
      : student.employee_id || '未填写工号',
    indicators: [
      {
        value: student.spot_check_count ?? 0,
        label: '抽查记录',
        tone: 'neutral' as const,
      },
    ],
  }));

  const total = students.length;
  const checkedCount = checkedStudentIds.length;
  const isAllChecked = total > 0 && checkedCount === total;
  const isPartialChecked = checkedCount > 0 && checkedCount < total;
  return (
    <aside className="border-border/60 bg-background flex min-h-[36rem] flex-col overflow-hidden rounded-xl border xl:max-h-full">
      <div className="border-border/60 flex h-11 shrink-0 items-center border-b px-5">
        <div className="flex items-center gap-2">
          <Users className="text-text-muted h-4 w-4" />
          <span className="text-foreground text-[13px] font-semibold">
            学员
          </span>
        </div>
      </div>

      <div className="px-3 py-3">
        <div className="space-y-3">
          <SegmentedControl
            options={[
              { label: '全部', value: 'all' },
              { label: '一室', value: 'room1' },
              { label: '二室', value: 'room2' },
            ]}
            value={departmentFilter}
            onChange={(value) =>
              onDepartmentFilterChange(value as SpotCheckDepartmentFilter)
            }
            size="sm"
            className="w-full [&_button]:px-0 [&>div]:grid [&>div]:h-9 [&>div]:w-full [&>div]:grid-cols-3"
          />

          {/* 搜索 + 全选/清空 */}
          <div className="flex items-center gap-1.5">
            <div className="relative min-w-0 flex-1">
              <Search className="text-text-muted pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
              <Input
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="搜索姓名或工号"
                className="border-border/60 bg-background placeholder:text-text-muted/80 h-9 rounded-lg pr-2 pl-8 text-[12px] shadow-none"
              />
            </div>
            <label
              className={cn(
                'inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg pr-1.5 pl-2 select-none',
                total === 0 && 'cursor-not-allowed opacity-45',
              )}
            >
              <Checkbox
                checked={
                  isAllChecked
                    ? true
                    : isPartialChecked
                      ? 'indeterminate'
                      : false
                }
                disabled={total === 0}
                onCheckedChange={() => onToggleCheckAll(!isAllChecked)}
                className="rounded-[3px]"
                aria-label={isAllChecked ? '清空勾选' : '全选'}
              />
              <span className="text-text-muted text-[10px] font-bold whitespace-nowrap tabular-nums">
                {checkedCount}/{total}
              </span>
            </label>
          </div>
        </div>
      </div>

      <UserSelectableList
        mode="inspect"
        items={panelItems}
        activeId={selectedStudentId}
        checkedIds={checkedStudentIds}
        onActivate={onSelectStudent}
        onToggleCheck={onToggleCheckStudent}
        emptyText={searchValue.trim() ? '没有匹配的学员' : '暂无可查看学员'}
        isLoading={isLoading}
        loadingText="加载学员中..."
        className="px-3 py-2"
      />
    </aside>
  );
};
