import React from 'react';
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { BookOpen, ClipboardList, LayoutList, Plus, Trophy } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { cn } from '@/lib/utils';

import { getTaskResourceGroup } from './use-task-form.helpers';
import {
  TASK_FORM_PANEL_CLASSNAME,
  TASK_FORM_PANEL_HEADER_CLASSNAME,
  TASK_FORM_WARNING_ALERT_CLASSNAME,
  TASK_FORM_WARNING_ALERT_DESCRIPTION_CLASSNAME,
} from './task-form.constants';
import { SortableResourceItem } from './sortable-resource-item';
import { TaskResourcePickerPopover } from './task-resource-picker-popover';
import type { ResourceGroup, ResourceItem, SelectedResource } from './task-form.types';

interface TaskPipelinePanelProps {
  selectedResources: SelectedResource[];
  resourcesDisabled: boolean;
  excludeDocumentIds: number[];
  excludeQuizIds: number[];
  onDragEnd: (event: DragEndEvent) => void;
  onRemoveResource: (uid: number) => void;
  onAddResource: (resource: ResourceItem) => void;
  embedded?: boolean;
}

const SECTION_ORDER: ResourceGroup[] = ['DOCUMENT', 'PRACTICE', 'EXAM'];

const SECTION_CONFIG: Record<ResourceGroup, {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
}> = {
  DOCUMENT: { title: '学习资料', icon: BookOpen, iconClassName: 'text-secondary' },
  PRACTICE: { title: '测验', icon: ClipboardList, iconClassName: 'text-primary' },
  EXAM: { title: '考试', icon: Trophy, iconClassName: 'text-destructive' },
};

export function TaskPipelinePanel({
  selectedResources,
  resourcesDisabled,
  excludeDocumentIds,
  excludeQuizIds,
  onDragEnd,
  onRemoveResource,
  onAddResource,
  embedded = false,
}: TaskPipelinePanelProps) {
  const dragCleanupFrameRef = React.useRef<number | null>(null);
  const [draggingItemUid, setDraggingItemUid] = React.useState<number | null>(null);
  const [draggingItemWidth, setDraggingItemWidth] = React.useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  React.useEffect(() => () => {
    if (dragCleanupFrameRef.current !== null) {
      cancelAnimationFrame(dragCleanupFrameRef.current);
    }
  }, []);

  const groupedResources = React.useMemo(
    () => SECTION_ORDER.map((group) => ({
      group,
      items: selectedResources.filter((item) => getTaskResourceGroup(item) === group),
    })),
    [selectedResources],
  );

  const draggingItem = React.useMemo(
    () => selectedResources.find((item) => item.uid === draggingItemUid) ?? null,
    [draggingItemUid, selectedResources],
  );

  const clearDragState = React.useCallback(() => {
    if (dragCleanupFrameRef.current !== null) {
      cancelAnimationFrame(dragCleanupFrameRef.current);
      dragCleanupFrameRef.current = null;
    }
    setDraggingItemUid(null);
    setDraggingItemWidth(null);
  }, []);

  const handleDragStart = React.useCallback(({ active }: DragStartEvent) => {
    setDraggingItemUid(Number(active.id));
    setDraggingItemWidth(active.rect.current.initial?.width ?? null);
  }, []);

  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    onDragEnd(event);
    dragCleanupFrameRef.current = requestAnimationFrame(clearDragState);
  }, [clearDragState, onDragEnd]);

  return (
    <div className={cn(embedded ? 'flex min-h-0 flex-1 flex-col overflow-hidden bg-background' : TASK_FORM_PANEL_CLASSNAME)}>
      {embedded ? null : (
        <div className={TASK_FORM_PANEL_HEADER_CLASSNAME}>
          <LayoutList className="h-4 w-4 text-foreground" />
          <span>任务结构</span>
        </div>
      )}

      <ScrollContainer className="min-h-0 flex-1 overflow-y-auto bg-background p-5">
        {resourcesDisabled ? (
          <Alert variant="warning" className={cn(TASK_FORM_WARNING_ALERT_CLASSNAME, 'mb-4')}>
            <AlertDescription className={TASK_FORM_WARNING_ALERT_DESCRIPTION_CLASSNAME}>
              任务已有人员开始执行，无法修改资源
            </AlertDescription>
          </Alert>
        ) : null}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragCancel={clearDragState}
          onDragEnd={handleDragEnd}
        >
          <div className="flex min-h-full w-full flex-col gap-8">
            {groupedResources.map(({ group, items }) => (
              <TaskPipelineSection
                key={group}
                group={group}
                items={items}
                resourcesDisabled={resourcesDisabled}
                excludeDocumentIds={excludeDocumentIds}
                excludeQuizIds={excludeQuizIds}
                onRemoveResource={onRemoveResource}
                onAddResource={onAddResource}
              />
            ))}
          </div>

          <DragOverlay>
            {draggingItem ? (
              <div style={draggingItemWidth ? { width: draggingItemWidth } : undefined}>
                <SortableResourceItem
                  item={draggingItem}
                  removeResource={onRemoveResource}
                  disabled={resourcesDisabled}
                  isOverlay
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </ScrollContainer>
    </div>
  );
}

interface TaskPipelineSectionProps {
  group: ResourceGroup;
  items: SelectedResource[];
  resourcesDisabled: boolean;
  excludeDocumentIds: number[];
  excludeQuizIds: number[];
  onRemoveResource: (uid: number) => void;
  onAddResource: (resource: ResourceItem) => void;
}

const TaskPipelineSection: React.FC<TaskPipelineSectionProps> = ({
  group,
  items,
  resourcesDisabled,
  excludeDocumentIds,
  excludeQuizIds,
  onRemoveResource,
  onAddResource,
}) => {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const { title, icon: Icon, iconClassName } = SECTION_CONFIG[group];

  return (
    <section className="group/section flex flex-none flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Icon className={cn('h-4 w-4', iconClassName)} />
          <span className="text-[13px] font-semibold text-foreground">{title}</span>
          <span className="text-[11px] font-medium text-text-muted">{items.length}</span>
        </div>
        <TaskResourcePickerPopover
          group={group}
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          excludeDocumentIds={excludeDocumentIds}
          excludeQuizIds={excludeQuizIds}
          onAdd={onAddResource}
          disabled={resourcesDisabled}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={resourcesDisabled}
            aria-label={`添加${title}`}
            className={cn(
              'h-7 w-7 text-text-muted opacity-0 transition-opacity hover:text-foreground group-hover/section:opacity-100',
              pickerOpen && 'bg-muted text-foreground opacity-100',
            )}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </TaskResourcePickerPopover>
      </div>

      {/* 内容区默认高度 = 两行卡片（76px × 2 + gap-3） */}
      <div className="px-4 pb-4 pt-1">
        <SortableContext items={items.map((item) => String(item.uid))} strategy={rectSortingStrategy}>
          {items.length > 0 ? (
            <div className="grid min-h-[164px] grid-cols-3 content-start gap-3">
              {items.map((item) => (
                <SortableResourceItem
                  key={item.uid}
                  item={item}
                  removeResource={onRemoveResource}
                  disabled={resourcesDisabled}
                />
              ))}
            </div>
          ) : (
            <button
              type="button"
              disabled={resourcesDisabled}
              onClick={() => setPickerOpen(true)}
              className="flex h-[164px] w-full items-center justify-center rounded-lg text-[12px] font-medium text-text-muted transition-colors hover:bg-muted/30 hover:text-foreground disabled:pointer-events-none disabled:opacity-60"
            >
              点击添加{title}
            </button>
          )}
        </SortableContext>
      </div>
    </section>
  );
};
