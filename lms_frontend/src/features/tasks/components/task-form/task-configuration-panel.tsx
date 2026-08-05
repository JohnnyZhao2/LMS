import { useMemo, useState, type ReactNode } from 'react';
import { BookOpen, FileText, PencilLine, UserPlus } from 'lucide-react';

import { UserSelectList, type UserSelectPanelItem } from '@/components/common/user-select-list';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { GHOST_ACCENT_HOVER_CLASSNAME, QUIET_OUTLINE_FIELD_CLASSNAME } from '@/components/ui/interactive-styles';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';

import {
  TASK_FORM_PANEL_CLASSNAME,
  TASK_FORM_PANEL_HEADER_CLASSNAME,
  TASK_FORM_SEGMENTED_CONTROL_CLASSNAME,
  TASK_FORM_WARNING_ALERT_CLASSNAME,
  TASK_FORM_WARNING_ALERT_DESCRIPTION_CLASSNAME,
} from './task-form.constants';

const TASK_CONFIG_SOFT_FIELD_CLASSNAME = [
  'h-9 rounded-lg border-0 bg-muted/55 px-3 pr-9 text-[12px] font-semibold shadow-none',
  'placeholder:text-text-muted/50',
  'hover:bg-muted/70 focus:border-0 focus:bg-muted/70 focus:shadow-none focus-visible:ring-0',
].join(' ');

/** 左侧栏内容块统一上下间距 */
const TASK_CONFIG_STACK_GAP_CLASSNAME = 'space-y-4';
const TASK_CONFIG_SECTION_GAP_CLASSNAME = 'pt-4';

/**
 * 右侧图标的背景色输入框。
 */
function SoftIconField({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      {children}
      <span className="pointer-events-none absolute inset-y-0 right-0 flex w-9 items-center justify-center text-text-muted">
        {icon}
      </span>
    </div>
  );
}

interface TaskConfigurationPanelProps {
  title: string;
  onTitleChange: (value: string) => void;
  deadlineDays: number;
  onDeadlineDaysChange: (value: number) => void;
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
  title,
  onTitleChange,
  deadlineDays,
  onDeadlineDaysChange,
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
        <div className="shrink-0">
          <div className={TASK_FORM_PANEL_HEADER_CLASSNAME}>
            <FileText className="h-4 w-4 text-primary-500" />
            <span>任务配置</span>
          </div>

          <div className={cn(TASK_CONFIG_STACK_GAP_CLASSNAME, 'px-4 py-4')}>
            <SoftIconField icon={<PencilLine className="h-3.5 w-3.5" />}>
              <Input
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder="请输入任务标题..."
                interactionStyle="minimal"
                className={TASK_CONFIG_SOFT_FIELD_CLASSNAME}
              />
            </SoftIconField>

            <SoftIconField icon={<span className="text-[11px] font-semibold">天</span>}>
              <Input
                type="number"
                min={1}
                step={1}
                value={deadlineDays}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  if (!Number.isFinite(nextValue)) {
                    return;
                  }
                  onDeadlineDaysChange(Math.max(1, Math.floor(nextValue)));
                }}
                placeholder="7"
                interactionStyle="minimal"
                className={TASK_CONFIG_SOFT_FIELD_CLASSNAME}
              />
            </SoftIconField>

            <SoftIconField icon={<BookOpen className="h-3.5 w-3.5" />}>
              <Input
                value={description}
                onChange={(event) => onDescriptionChange(event.target.value)}
                placeholder="请输入任务描述..."
                interactionStyle="minimal"
                className={TASK_CONFIG_SOFT_FIELD_CLASSNAME}
              />
            </SoftIconField>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className={TASK_FORM_PANEL_HEADER_CLASSNAME}>
            <UserPlus className="h-4 w-4 text-primary-500" />
            <span>指派人员</span>
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
              <div className={cn(TASK_CONFIG_STACK_GAP_CLASSNAME, 'px-4', canRemoveAssignee ? 'pt-4' : 'pt-1')}>
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
                className={cn('pb-3', TASK_CONFIG_SECTION_GAP_CLASSNAME)}
                listClassName="px-4"
                itemsClassName="gap-2.5"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
