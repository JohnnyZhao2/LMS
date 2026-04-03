import { UserSelectPanel } from '@/components/common/user-select-panel';
import type { SpotCheckStudent } from '@/types/api';

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

const buildStudentMeta = (student: SpotCheckStudent) => {
  const employeeId = student.employee_id || '未填写工号';
  return student.department_name ? `${employeeId} · ${student.department_name}` : employeeId;
};

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
    meta: buildStudentMeta(student),
  }));

  return (
    <UserSelectPanel
      title="学员"
      items={panelItems}
      selectedIds={selectedStudentId ? [selectedStudentId] : []}
      onSelect={onSelectStudent}
      selectionMode="single"
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder="搜索姓名或工号"
      emptyText={searchValue.trim() ? '没有匹配的学员' : '暂无可查看学员'}
      isLoading={isLoading}
      loadingText="加载学员中..."
      className="min-h-[36rem] xl:max-h-full"
      controlsClassName="py-3"
      controlsInnerClassName="space-y-3"
      listClassName="max-h-none px-2 pb-2 pt-3"
      itemsClassName="space-y-2"
      segments={[
        { label: '全部', value: 'all' },
        { label: '一室', value: 'room1' },
        { label: '二室', value: 'room2' },
      ]}
      activeSegment={departmentFilter}
      onSegmentChange={(value) => onDepartmentFilterChange(value as SpotCheckDepartmentFilter)}
    />
  );
};
