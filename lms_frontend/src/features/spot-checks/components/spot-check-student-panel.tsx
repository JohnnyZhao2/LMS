import { Plus, Search, Users } from 'lucide-react';

import { UserSelectList } from '@/components/common/user-select-list';
import { Checkbox } from '@/components/ui/checkbox';
import { CircleButton } from '@/components/ui/circle-button';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { SpotCheckStudent } from '@/types/spot-check';

export type SpotCheckDepartmentFilter = 'all' | 'room1' | 'room2';

interface SpotCheckStudentPanelProps {
  students: SpotCheckStudent[];
  /** 当前查看的学员（点行） */
  selectedStudentId: number | null;
  /** 勾选用于批量发起的学员（点勾） */
  checkedStudentIds: number[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSelectStudent: (studentId: number) => void;
  onToggleCheckStudent: (studentId: number) => void;
  /** true=全选当前列表，false=清空勾选 */
  onToggleCheckAll: (selectAll: boolean) => void;
  canCreateSpotCheck?: boolean;
  onCreateSpotCheck?: () => void;
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
  canCreateSpotCheck = false,
  onCreateSpotCheck,
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
      : (student.employee_id || '未填写工号'),
  }));

  const total = students.length;
  const checkedCount = checkedStudentIds.length;
  const isAllChecked = total > 0 && checkedCount === total;
  const isPartialChecked = checkedCount > 0 && checkedCount < total;
  const showCreateFab = canCreateSpotCheck && checkedCount > 0 && !!onCreateSpotCheck;

  return (
    <aside className="flex min-h-[36rem] flex-col overflow-hidden rounded-xl border border-border/60 bg-background xl:max-h-full">
      <div className="flex h-14 items-center border-b border-border/60 px-5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-text-muted" />
          <span className="text-[13px] font-semibold text-foreground">学员</span>
        </div>
      </div>

      <div className="border-b border-border/60 px-3 py-3">
        <div className="space-y-3">
          <SegmentedControl
            options={[
              { label: '全部', value: 'all' },
              { label: '一室', value: 'room1' },
              { label: '二室', value: 'room2' },
            ]}
            value={departmentFilter}
            onChange={(value) => onDepartmentFilterChange(value as SpotCheckDepartmentFilter)}
            size="sm"
            className="w-full [&>div]:w-full [&>div]:grid [&>div]:grid-cols-3 [&_button]:px-0"
          />

          {/* 搜索 + 全选/清空 + 有勾选时显示发起 */}
          <div className="flex items-center gap-1.5">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <Input
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="搜索姓名或工号"
                className="h-9 rounded-lg border-border/60 bg-background pl-8 pr-2 text-[12px] shadow-none placeholder:text-text-muted/80"
              />
            </div>
            <label
              className={cn(
                'inline-flex h-9 shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-lg px-1.5',
                total === 0 && 'cursor-not-allowed opacity-45',
              )}
            >
              <Checkbox
                checked={isAllChecked ? true : isPartialChecked ? 'indeterminate' : false}
                disabled={total === 0}
                onCheckedChange={() => onToggleCheckAll(!isAllChecked)}
                className="rounded-[3px]"
                aria-label={isAllChecked ? '清空勾选' : '全选'}
              />
              <span className="whitespace-nowrap text-[10px] font-bold tabular-nums text-text-muted">
                {checkedCount}/{total}
              </span>
            </label>
            {showCreateFab ? (
              <Tooltip title={`向 ${checkedCount} 人发起`}>
                <CircleButton
                  onClick={onCreateSpotCheck}
                  label="发起抽查"
                  className="h-7 w-7 shrink-0 bg-primary-600 text-white shadow-none hover:translate-y-0 hover:bg-primary-700 hover:shadow-none"
                  icon={<Plus className="h-3.5 w-3.5" strokeWidth={2.5} />}
                />
              </Tooltip>
            ) : null}
          </div>
        </div>
      </div>

      <UserSelectList
        items={panelItems}
        selectedIds={selectedStudentId ? [selectedStudentId] : []}
        onSelect={onSelectStudent}
        checkedIds={checkedStudentIds}
        onToggleCheck={onToggleCheckStudent}
        selectionMode="multiple"
        appearance="panel"
        emptyText={searchValue.trim() ? '没有匹配的学员' : '暂无可查看学员'}
        isLoading={isLoading}
        loadingText="加载学员中..."
        className="max-h-none"
        listClassName="space-y-2"
      />
    </aside>
  );
};
