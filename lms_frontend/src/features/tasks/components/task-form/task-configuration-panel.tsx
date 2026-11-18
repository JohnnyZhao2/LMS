import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { BookOpen, Calendar, FileText, Loader2, Send, Type, UserPlus } from 'lucide-react';

import { MicroLabel } from '@/components/common/micro-label';
import { UserSelectList, type UserSelectPanelItem } from '@/components/common/user-select-list';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { GHOST_ACCENT_HOVER_CLASSNAME, QUIET_OUTLINE_FIELD_CLASSNAME } from '@/components/ui/interactive-styles';
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

            <div className="space-y-2">
              <MicroLabel icon={<Calendar className="h-3.5 w-3.5" />} asLabel>
                截止时间
              </MicroLabel>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-9 shrink-0 items-center justify-center rounded-lg border px-4 text-[12px] font-medium tabular-nums',
                    deadline
                      ? 'border-border/70 bg-white text-foreground'
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
                  value={DEADLINE_DAY_PRESETS.includes(deadlineDays as (typeof DEADLINE_DAY_PRESETS)[number]) ? deadlineDays : null}
                  onChange={onDeadlineDaysChange}
                  trailing={(
                    <div className="flex shrink-0 items-center">
                      <div className="mx-1 h-4 w-px bg-border/80" />
                      <div
                        className={cn(
                          'flex h-full w-16 items-center rounded-md border border-border/70 bg-white px-2 transition-[border-color,box-shadow] duration-200',
                          'focus-within:border-primary-300 focus-within:shadow-[inset_0_0_0_1px_var(--theme-interaction-outline)]',
                        )}
                      >
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          interactionStyle="minimal"
                          value={deadlineDays}
                          onChange={(event) => onDeadlineDaysChange(event.target.value)}
                          placeholder="天数"
                          className="h-6 w-full border-0 bg-transparent p-0 text-center text-[12px] tabular-nums shadow-none placeholder:text-[11px] placeholder:text-text-muted/50"
                        />
                        <span className="ml-0.5 shrink-0 text-[11px] font-medium text-text-muted">
                          天
                        </span>
                      </div>
                    </div>
                  )}
                />
              </div>
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

          <div className="min-h-0 flex-1 pb-2">
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

        <div className="flex shrink-0 items-center justify-end px-4 py-3">
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
