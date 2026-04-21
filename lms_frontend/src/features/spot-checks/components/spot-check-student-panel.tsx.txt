import { Search, Users } from 'lucide-react';

import { UserSelectList } from '@/components/common/user-select-list';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { SpotCheckStudent } from '@/types/spot-check';

export type SpotCheckDepartmentFilter = 'all' | 'room1' | 'room2';

interface SpotCheckStudentPanelProps {
  students: SpotCheckStudent[];
  selectedStudentId: number | null;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSelectStudent: (studentId: number) => void;
  departmentFilter: SpotCheckDepartmentFilter;
  onDepartmentFilterChange: (value: SpotCheckDepartmentFilter) => void;
  isLoading: boolean;
}

export const SpotCheckStudentPanel: React.FC<SpotCheckStudentPanelProps> = ({
  students,
  selectedStudentId,
  searchValue,
  onSearchChange,
  onSelectStudent,
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

  return (
    <aside className="flex min-h-[36rem] flex-col overflow-hidden rounded-xl border border-border/60 bg-background xl:max-h-full">
      <div className="flex h-14 items-center justify-between border-b border-border/60 px-5">
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

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="搜索姓名或工号"
              className="h-9 rounded-lg border-border/60 bg-background pl-9 pr-3 text-[12px] shadow-none placeholder:text-text-muted/80"
            />
          </div>
        </div>
      </div>

      <UserSelectList
        items={panelItems}
        selectedIds={selectedStudentId ? [selectedStudentId] : []}
        onSelect={onSelectStudent}
        selectionMode="single"
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
