import { useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  FileText,
  PencilLine,
  UserPlus,
} from 'lucide-react';

import { MicroLabel } from '@/components/common/micro-label';
import {
  UserSelectableList,
  type UserSelectableListItem,
} from '@/components/common/user-selectable-list';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  GHOST_ACCENT_HOVER_CLASSNAME,
  QUIET_OUTLINE_FIELD_CLASSNAME,
} from '@/components/ui/interactive-styles';
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
} from '@/features/tasks/components/task-form/task-form.constants';

const TASK_CONFIG_FIELD_TEXT_CLASSNAME =
  'text-[12px] font-semibold placeholder:text-text-muted/50';

interface TaskConfigurationPanelProps {
  title: string;
  onTitleChange: (value: string) => void;
  deadline: Date | undefined;
  onDeadlineChange: (value: Date | undefined) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  selectedUserIds: number[];
  userPanelItems: UserSelectableListItem[];
  userSearch: string;
  onUserSearchChange: (value: string) => void;
  onToggleUser: (id: number) => void;
  onToggleUsers: (userIds: number[], checked: boolean) => void;
  isUsersLoading: boolean;
  canRemoveAssignee: boolean;
}

type TaskAssigneeDepartmentFilter = 'all' | 'room1' | 'room2';

function matchesDepartmentFilter(
  item: UserSelectableListItem,
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
  title,
  onTitleChange,
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
  const [departmentFilter, setDepartmentFilter] =
    useState<TaskAssigneeDepartmentFilter>('all');
  const filteredUserPanelItems = useMemo(
    () =>
      userPanelItems.filter((item) =>
        matchesDepartmentFilter(item, departmentFilter),
      ),
    [departmentFilter, userPanelItems],
  );
  const selectedFilteredUserCount = filteredUserPanelItems.filter((item) =>
    selectedUserIds.includes(item.id),
  ).length;
  const isAllFilteredUsersSelected =
    filteredUserPanelItems.length > 0 &&
    selectedFilteredUserCount === filteredUserPanelItems.length;

  return (
    <div className={TASK_FORM_PANEL_CLASSNAME}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-border shrink-0 border-b">
          <div className={TASK_FORM_PANEL_HEADER_CLASSNAME}>
            <FileText className="text-primary-500 h-4 w-4" />
            <span>任务配置</span>
          </div>

          <div className="space-y-3 px-4 py-3">
            <div className="space-y-2">
              <MicroLabel icon={<PencilLine className="h-3.5 w-3.5" />} asLabel>
                任务标题
              </MicroLabel>
              <Input
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder="输入任务标题..."
                className={cn(
                  'h-9 rounded-lg px-3',
                  TASK_CONFIG_FIELD_TEXT_CLASSNAME,
                  QUIET_OUTLINE_FIELD_CLASSNAME,
                )}
              />
            </div>

            <div className="space-y-2">
              <MicroLabel icon={<Calendar className="h-3.5 w-3.5" />} asLabel>
                截止时间
              </MicroLabel>
              <DatePicker
                date={deadline}
                onDateChange={onDeadlineChange}
                placeholder="选择截止日期"
                className={cn(
                  'h-9 rounded-lg px-3',
                  TASK_CONFIG_FIELD_TEXT_CLASSNAME,
                )}
                hideLeadingIcon
              />
            </div>

            <div className="space-y-2">
              <MicroLabel icon={<BookOpen className="h-3.5 w-3.5" />} asLabel>
                任务描述
              </MicroLabel>
              <Textarea
                className={cn(
                  'border-border/60 min-h-[100px] rounded-lg bg-white px-3 py-2.5 leading-5 shadow-none',
                  TASK_CONFIG_FIELD_TEXT_CLASSNAME,
                )}
                placeholder="输入任务指引..."
                value={description}
                onChange={(event) => onDescriptionChange(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className={TASK_FORM_PANEL_HEADER_CLASSNAME}>
            <UserPlus className="text-primary-500 h-4 w-4" />
            <span>指派人员</span>
            <Badge
              variant="secondary"
              className="bg-muted text-text-muted ml-auto h-5 border-none px-2 font-bold"
            >
              已选 {selectedUserIds.length}
            </Badge>
          </div>

          {!canRemoveAssignee ? (
            <div className="px-4 pt-1 pb-2">
              <Alert
                variant="warning"
                className={TASK_FORM_WARNING_ALERT_CLASSNAME}
              >
                <AlertDescription
                  className={TASK_FORM_WARNING_ALERT_DESCRIPTION_CLASSNAME}
                >
                  任务已有人员开始执行，无法移除已分配人员
                </AlertDescription>
              </Alert>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 pb-4">
            <div className="flex h-full min-h-0 flex-col">
              <div
                className={cn(
                  'space-y-2.5 px-4 pb-2',
                  canRemoveAssignee ? 'pt-3' : 'pt-0.5',
                )}
              >
                <SegmentedControl
                  options={[
                    { label: '全部', value: 'all' },
                    { label: '一室', value: 'room1' },
                    { label: '二室', value: 'room2' },
                  ]}
                  value={departmentFilter}
                  onChange={(value) =>
                    setDepartmentFilter(value as TaskAssigneeDepartmentFilter)
                  }
                  size="sm"
                  className={`${TASK_FORM_SEGMENTED_CONTROL_CLASSNAME} [&>div]:grid-cols-3`}
                />

                <div className="flex items-center gap-2">
                  <Input
                    value={userSearch}
                    onChange={(event) => onUserSearchChange(event.target.value)}
                    placeholder="搜索姓名或工号..."
                    className={cn(
                      'placeholder:text-text-muted/50 h-9 min-w-0 flex-1 rounded-lg pl-3 text-[11px]',
                      QUIET_OUTLINE_FIELD_CLASSNAME,
                    )}
                  />
                  <label
                    className={cn(
                      'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-1 select-none',
                      GHOST_ACCENT_HOVER_CLASSNAME,
                    )}
                  >
                    <Checkbox
                      checked={
                        isAllFilteredUsersSelected
                          ? true
                          : selectedFilteredUserCount > 0
                            ? 'indeterminate'
                            : false
                      }
                      onCheckedChange={() => {
                        onToggleUsers(
                          filteredUserPanelItems.map((item) => item.id),
                          !isAllFilteredUsersSelected,
                        );
                      }}
                      className="rounded-[3px]"
                    />
                    <span className="text-text-muted text-[10px] font-bold whitespace-nowrap tabular-nums">
                      {selectedFilteredUserCount}/
                      {filteredUserPanelItems.length}
                    </span>
                  </label>
                </div>
              </div>

              <UserSelectableList
                mode="select"
                layout="grid"
                className="pt-1.5 pb-3"
                listClassName="px-4"
                itemsClassName="gap-1.5"
                items={filteredUserPanelItems}
                selectedIds={selectedUserIds}
                onToggle={onToggleUser}
                isLoading={isUsersLoading}
                emptyText="暂无可分配人员"
                loadingText="加载人员列表..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
