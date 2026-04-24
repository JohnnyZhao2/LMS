import { useMemo, useState } from 'react';
import { BookOpen, Calendar, FileText, UserPlus } from 'lucide-react';

import { MicroLabel } from '@/components/common/micro-label';
import { UserSelectList, type UserSelectPanelItem } from '@/components/common/user-select-list';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { GHOST_ACCENT_HOVER_CLASSNAME, QUIET_OUTLINE_FIELD_CLASSNAME } from '@/components/ui/interactive-styles';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import {
  TASK_FORM_PANEL_CLASSNAME,
  TASK_FORM_PANEL_HEADER_CLASSNAME,
  TASK_FORM_SEGMENTED_CONTROL_CLASSNAME,
  TASK_FORM_WARNING_ALERT_CLASSNAME,
  TASK_FORM_WARNING_ALERT_DESCRIPTION_CLASSNAME,
} from './task-form.constants';

interface TaskConfigurationPanelProps {
  deadline: Date | undefined;
  onDeadlineChange: (value: Date | undefined) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  selectedUserIds: number[];
  userPanelItems: UserSelectPanelItem[];
  userSearch: string;
  onUserSearchChange: (value: string) => void;
  onToggleUser: (id: number) => void;
  onToggleUsers: (userIds: number[], checked: boolean) => void;
  isUsersLoading: boolean;
  canRemoveAssignee: boolean;
}

type TaskAssigneeDepartmentFilter = 'all' | 'room1' | 'room2';

function matchesDepartmentFilter(
  item: UserSelectPanelItem,
  filter: TaskAssigneeDepartmentFilter,
) {
  const meta = item.meta ?? '';
  if (filter === 'all') {
    return true;
  }
  if (filter === 'room1') {
    return meta.includes('一室');
  }
  return meta.includes('二室');
}

export function TaskConfigurationPanel({
  deadline,
  onDeadlineChange,
  description,
  onDescriptionChange,
  selectedUserIds,
  userPanelItems,
  userSearch,
  onUserSearchChange,
  onToggleUser,
  onToggleUsers,
  isUsersLoading,
  canRemoveAssignee,
}: TaskConfigurationPanelProps) {
  const [departmentFilter, setDepartmentFilter] = useState<TaskAssigneeDepartmentFilter>('all');
  const filteredUserPanelItems = useMemo(
    () => userPanelItems.filter((item) => matchesDepartmentFilter(item, departmentFilter)),
    [departmentFilter, userPanelItems],
  );
  const selectedFilteredUserCount = filteredUserPanelItems.filter((item) => selectedUserIds.includes(item.id)).length;
  const isAllFilteredUsersSelected =
    filteredUserPanelItems.length > 0 && selectedFilteredUserCount === filteredUserPanelItems.length;

  return (
    <div className={TASK_FORM_PANEL_CLASSNAME}>
      <div className="flex min-h-0 h-full flex-col">
        <div className="shrink-0 border-b border-border">
          <div className={TASK_FORM_PANEL_HEADER_CLASSNAME}>
            <FileText className="h-4 w-4 text-primary-500" />
            <span>任务配置</span>
          </div>

          <div className="space-y-3 px-4 py-3">
            <div className="space-y-2">
              <MicroLabel icon={<Calendar className="h-3.5 w-3.5" />} asLabel>
                截止时间
              </MicroLabel>
              <DatePicker
                date={deadline}
                onDateChange={onDeadlineChange}
                placeholder="选择截止日期"
                className="h-9 rounded-lg px-3 text-[12px]"
                hideLeadingIcon
              />
            </div>

            <div className="space-y-2">
              <MicroLabel icon={<BookOpen className="h-3.5 w-3.5" />} asLabel>
                任务描述
              </MicroLabel>
              <Textarea
                className="min-h-[100px] rounded-lg border-border/60 bg-white px-3 py-2.5 text-[13px] leading-5 shadow-none"
                placeholder="输入任务指引..."
                value={description}
                onChange={(event) => onDescriptionChange(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className={TASK_FORM_PANEL_HEADER_CLASSNAME}>
            <UserPlus className="h-4 w-4 text-primary-500" />
            <span>指派人员</span>
            <Badge variant="secondary" className="ml-auto h-5 border-none bg-muted px-2 font-bold text-text-muted">
              已选 {selectedUserIds.length}
            </Badge>
          </div>

          {!canRemoveAssignee ? (
            <div className="px-4 pb-2 pt-1">
              <Alert variant="warning" className={TASK_FORM_WARNING_ALERT_CLASSNAME}>
                <AlertDescription className={TASK_FORM_WARNING_ALERT_DESCRIPTION_CLASSNAME}>
                  任务已有人员开始执行，无法移除已分配人员
                </AlertDescription>
              </Alert>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 pb-4">
            <div className="flex h-full min-h-0 flex-col">
              <div className={cn('space-y-2.5 px-4 pb-2', canRemoveAssignee ? 'pt-3' : 'pt-0.5')}>
                <SegmentedControl
                  options={[
                    { label: '全部', value: 'all' },
                    { label: '一室', value: 'room1' },
                    { label: '二室', value: 'room2' },
                  ]}
                  value={departmentFilter}
                  onChange={(value) => setDepartmentFilter(value as TaskAssigneeDepartmentFilter)}
                  size="sm"
                  className={`${TASK_FORM_SEGMENTED_CONTROL_CLASSNAME} [&>div]:grid-cols-3`}
                />

                <div className="flex items-center gap-2">
                  <Input
                    value={userSearch}
                    onChange={(event) => onUserSearchChange(event.target.value)}
                    placeholder="搜索姓名或工号..."
                    className={cn(
                      'h-9 min-w-0 flex-1 rounded-lg pl-3 text-[11px] placeholder:text-text-muted/50',
                      QUIET_OUTLINE_FIELD_CLASSNAME,
                    )}
                  />
                  <label className={cn('inline-flex shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-lg px-1.5 py-1', GHOST_ACCENT_HOVER_CLASSNAME)}>
                    <Checkbox
                      checked={isAllFilteredUsersSelected ? true : selectedFilteredUserCount > 0 ? 'indeterminate' : false}
                      onCheckedChange={() => onToggleUsers(filteredUserPanelItems.map((item) => item.id), !isAllFilteredUsersSelected)}
                      className="rounded-[3px]"
                    />
                    <span className="whitespace-nowrap text-[10px] font-bold tabular-nums text-text-muted">
                      {selectedFilteredUserCount}/{filteredUserPanelItems.length}
                    </span>
                  </label>
                </div>
              </div>

              <UserSelectList
                items={filteredUserPanelItems}
                selectedIds={selectedUserIds}
                onSelect={onToggleUser}
                appearance="panel"
                layout="grid"
                density="compact"
                showGridSelectionIndicator={false}
                isLoading={isUsersLoading}
                emptyText="暂无可分配人员"
                loadingText="加载人员列表..."
                className="pb-3 pt-1.5"
                listClassName="px-4"
                itemsClassName="gap-1.5"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
