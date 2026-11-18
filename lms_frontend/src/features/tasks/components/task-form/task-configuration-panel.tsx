import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { BookOpen, Calendar, FileText, Loader2, Send, Type, UserPlus } from 'lucide-react';

import { MicroLabel } from '@/components/common/micro-label';
import { UserSelectList, type UserSelectPanelItem } from '@/components/common/user-select-list';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QUIET_OUTLINE_FIELD_CLASSNAME } from '@/components/ui/interactive-styles';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import {
  TASK_FORM_PANEL_CLASSNAME,
  TASK_FORM_PANEL_HEADER_CLASSNAME,
  TASK_FORM_WARNING_ALERT_CLASSNAME,
  TASK_FORM_WARNING_ALERT_DESCRIPTION_CLASSNAME,
} from './task-form.constants';

interface TaskConfigurationPanelProps {
  title: string;
  onTitleChange: (value: string) => void;
  deadline: Date | undefined;
  deadlineDays: string;
  onDeadlineDaysChange: (value: string) => void;
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
  isEdit: boolean;
  isSubmitting: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
}

type TaskAssigneeDepartmentFilter = 'all' | 'room1' | 'room2';

const DEADLINE_DAY_PRESETS = ['7', '14', '20'] as const;
const DEPARTMENT_FILTER_OPTIONS: Array<{ label: string; value: TaskAssigneeDepartmentFilter }> = [
  { label: '全部', value: 'all' },
  { label: '一室', value: 'room1' },
  { label: '二室', value: 'room2' },
];

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
  deadline,
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
  isEdit,
  isSubmitting,
  canSubmit,
  onSubmit,
}: TaskConfigurationPanelProps) {
  const [departmentFilter, setDepartmentFilter] = useState<TaskAssigneeDepartmentFilter>('all');
  const isPresetDeadline = DEADLINE_DAY_PRESETS.includes(
    deadlineDays as (typeof DEADLINE_DAY_PRESETS)[number],
  );
  const filteredUserPanelItems = useMemo(
    () => userPanelItems.filter((item) => matchesDepartmentFilter(item, departmentFilter)),
    [departmentFilter, userPanelItems],
  );

  const handleDepartmentDoubleClick = (value: string) => {
    const targetFilter = value as TaskAssigneeDepartmentFilter;
    const targetUsers = userPanelItems.filter((item) => matchesDepartmentFilter(item, targetFilter));
    if (targetUsers.length === 0) {
      return;
    }
    const allSelected = targetUsers.every((item) => selectedUserIds.includes(item.id));
    onToggleUsers(targetUsers.map((item) => item.id), !allSelected);
  };

  return (
    <div className={TASK_FORM_PANEL_CLASSNAME}>
      <div className="flex min-h-0 h-full flex-col">
        <div className="shrink-0">
          <div className={TASK_FORM_PANEL_HEADER_CLASSNAME}>
            <FileText className="h-4 w-4 text-primary-500" />
            <span>任务配置</span>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div className="space-y-1.5">
              <MicroLabel icon={<Type className="h-3.5 w-3.5" />} asLabel>
                任务标题
              </MicroLabel>
              <Input
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder="输入任务标题..."
                className={cn(
                  'h-9 rounded-lg px-3 text-[13px] placeholder:text-text-muted/50',
                  QUIET_OUTLINE_FIELD_CLASSNAME,
                )}
              />
            </div>

            <div className="space-y-1.5">
              <MicroLabel icon={<Calendar className="h-3.5 w-3.5" />} asLabel>
                截止时间（天）
              </MicroLabel>
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    'flex h-9 shrink-0 items-center justify-center rounded-lg border px-3.5 text-[12px] font-medium tabular-nums',
                    deadline
                      ? 'border-border/70 bg-muted/25 text-text-muted'
                      : 'border-warning-300 bg-warning-50/50 text-warning-700',
                  )}
                >
                  <span>{deadline ? format(deadline, 'yyyy-MM-dd HH:mm') : '无效天数'}</span>
                </div>

                <SegmentedControl
                  size="sm"
                  fill
                  className="min-w-0 flex-1 [&>div]:h-9 [&>div]:rounded-lg [&>div]:p-0.5 [&>div>button]:rounded-md [&>div>button]:px-1.5"
                  options={DEADLINE_DAY_PRESETS.map((preset) => ({
                    label: preset,
                    value: preset,
                  }))}
                  value={isPresetDeadline ? deadlineDays : null}
                  onChange={onDeadlineDaysChange}
                  trailing={(
                    <div className="flex shrink-0 items-center">
                      <div className="mx-1 h-4 w-px bg-border/80" />
                      <div
                        className={cn(
                          'flex h-full w-14 items-center rounded-md px-1.5 transition-all duration-200',
                          !isPresetDeadline
                            ? 'bg-white text-foreground shadow-sm'
                            : 'bg-transparent text-text-muted hover:text-foreground focus-within:bg-white focus-within:text-foreground focus-within:shadow-sm',
                        )}
                      >
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          interactionStyle="minimal"
                          value={isPresetDeadline ? '' : deadlineDays}
                          onChange={(event) => onDeadlineDaysChange(event.target.value)}
                          placeholder="自定义"
                          className="h-6 w-full border-0 bg-transparent p-0 text-center text-[12px] tabular-nums shadow-none placeholder:text-[11px] placeholder:text-text-muted/60"
                        />
                      </div>
                    </div>
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <MicroLabel icon={<BookOpen className="h-3.5 w-3.5" />} asLabel>
                任务描述
              </MicroLabel>
              <Textarea
                rows={2}
                className={cn(
                  'min-h-[72px] rounded-lg px-3 py-2 text-[13px] leading-5 shadow-none placeholder:text-text-muted/50',
                  QUIET_OUTLINE_FIELD_CLASSNAME,
                )}
                placeholder="输入任务指引..."
                value={description}
                onChange={(event) => onDescriptionChange(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col border-t border-border/70">
          <div className="flex items-center justify-between px-6 pt-5 pb-3.5">
            <MicroLabel icon={<UserPlus className="h-3.5 w-3.5" />}>
              指派人员
            </MicroLabel>
            <Badge variant="secondary" className="h-5 border-none bg-muted px-2 text-[11px] font-bold text-text-muted">
              已选 {selectedUserIds.length}
            </Badge>
          </div>

          {!canRemoveAssignee ? (
            <div className="px-6 pb-3">
              <Alert variant="warning" className={TASK_FORM_WARNING_ALERT_CLASSNAME}>
                <AlertDescription className={TASK_FORM_WARNING_ALERT_DESCRIPTION_CLASSNAME}>
                  任务已有人员开始执行，无法移除已分配人员
                </AlertDescription>
              </Alert>
            </div>
          ) : null}

          <div className="min-h-0 flex-1">
            <div className="flex h-full min-h-0 flex-col">
              <div className="grid grid-cols-2 items-center gap-3 px-6 pb-3.5">
                <Input
                  value={userSearch}
                  onChange={(event) => onUserSearchChange(event.target.value)}
                  placeholder="搜索姓名或工号..."
                  className={cn(
                    'h-9 w-full rounded-lg pl-3 text-[12px] placeholder:text-text-muted/50',
                    QUIET_OUTLINE_FIELD_CLASSNAME,
                  )}
                />

                <Tooltip title="双击全选或取消">
                  <div className="w-full">
                    <SegmentedControl
                      options={DEPARTMENT_FILTER_OPTIONS}
                      value={departmentFilter}
                      onChange={(value) => setDepartmentFilter(value as TaskAssigneeDepartmentFilter)}
                      onOptionDoubleClick={handleDepartmentDoubleClick}
                      size="sm"
                      fill
                      className="w-full [&>div]:h-9 [&>div]:w-full [&>div]:rounded-lg [&>div]:p-0.5 [&>div>button]:rounded-md [&>div>button]:px-2"
                    />
                  </div>
                </Tooltip>
              </div>

              <UserSelectList
                items={filteredUserPanelItems}
                selectedIds={selectedUserIds}
                onSelect={onToggleUser}
                appearance="panel"
                layout="grid"
                density="regular"
                showGridSelectionIndicator={false}
                minimalGridCard
                isLoading={isUsersLoading}
                emptyText="暂无可分配人员"
                loadingText="加载人员列表..."
                className="pb-5"
                listClassName="px-6"
                itemsClassName="gap-3"
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end px-6 py-4">
          <Button
            onClick={onSubmit}
            disabled={!canSubmit || isSubmitting}
            className="h-9 shrink-0 rounded-lg bg-foreground px-3.5 text-[12px] font-semibold text-background hover:bg-foreground/90"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {isEdit ? '保存修改' : '发布任务'}
          </Button>
        </div>
      </div>
    </div>
  );
}
