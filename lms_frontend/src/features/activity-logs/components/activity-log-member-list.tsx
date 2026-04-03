import { useMemo, useState } from 'react';
import { UserSelectPanel } from '@/components/common/user-select-panel';
import type { ActivityLogType, ActivityLogUser } from '../types';

interface ActivityLogMemberListProps {
  users: ActivityLogUser[];
  memberActivityCountMap: Record<number, number>;
  selectedMemberIds: number[];
  activeType: ActivityLogType;
  onToggleMember: (memberId: number) => void;
}

const TYPE_LABELS: Record<ActivityLogType, string> = {
  user: '账号',
  content: '内容',
  operation: '行为记录',
};

type ActivityLogDepartmentFilter = 'all' | 'room1' | 'room2';

const matchesDepartmentFilter = (user: ActivityLogUser, filter: ActivityLogDepartmentFilter) => {
  if (filter === 'all') {
    return true;
  }

  const departmentCode = user.department_code?.trim().toUpperCase() ?? '';
  if (filter === 'room1') {
    return departmentCode === 'DEPT1';
  }
  return departmentCode === 'DEPT2';
};

export const ActivityLogMemberList: React.FC<ActivityLogMemberListProps> = ({
  users,
  memberActivityCountMap,
  selectedMemberIds,
  activeType,
  onToggleMember,
}) => {
  const [departmentFilter, setDepartmentFilter] = useState<ActivityLogDepartmentFilter>('all');

  const filteredMembers = useMemo(
    () => users.filter((user) => matchesDepartmentFilter(user, departmentFilter)),
    [departmentFilter, users],
  );

  const panelItems = filteredMembers.map((user) => {
    const activityCount = memberActivityCountMap[user.id] ?? 0;
    const isSelected = selectedMemberIds.includes(user.id);
    return {
      id: user.id,
      name: user.username,
      employeeId: user.employee_id,
      avatarKey: user.avatar_key,
      meta: `${user.employee_id} · ${
        user.department_code === 'DEPT1'
          ? '一室'
          : user.department_code === 'DEPT2'
            ? '二室'
            : (user.department_name ?? '未分组')
      }`,
      count: activityCount,
      disabled: activityCount === 0 && !isSelected,
    };
  });

  const resolvedEmptyText = filteredMembers.length === 0
    ? (departmentFilter === 'all'
      ? '暂无可筛选成员'
      : '当前分组下没有成员')
    : `当前"${TYPE_LABELS[activeType]}"下没有成员记录`;

  return (
    <UserSelectPanel
      title="成员"
      items={panelItems}
      selectedIds={selectedMemberIds}
      onSelect={onToggleMember}
      selectionMode="multiple"
      emptyText={resolvedEmptyText}
      segments={[
        { label: '全部', value: 'all' },
        { label: '一室', value: 'room1' },
        { label: '二室', value: 'room2' },
      ]}
      activeSegment={departmentFilter}
      onSegmentChange={(value) => setDepartmentFilter(value as ActivityLogDepartmentFilter)}
      className="h-full min-h-[38rem] xl:max-h-full"
      listClassName="max-h-none"
    />
  );
};
