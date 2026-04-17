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
import { BookOpen, ClipboardList, LayoutList, Trophy } from 'lucide-react';

import { ScrollContainer } from '@/components/ui/scroll-container';
import { cn } from '@/lib/utils';

import { getTaskResourceGroup } from './use-task-form.helpers';
import { TASK_FORM_PANEL_CLASSNAME, TASK_FORM_PANEL_HEADER_CLASSNAME } from './task-form.constants';
import { SortableResourceItem } from './sortable-resource-item';
import type { ResourceGroup, SelectedResource } from './task-form.types';

interface TaskPipelinePanelProps {
  selectedResources: SelectedResource[];
  resourcesDisabled: boolean;
  onDragEnd: (event: DragEndEvent) => void;
  onRemoveResource: (uid: number) => void;
  embedded?: boolean;
}

const SECTION_ORDER: ResourceGroup[] = ['DOCUMENT', 'PRACTICE', 'EXAM'];

const SECTION_CONFIG: Record<ResourceGroup, {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  DOCUMENT: { title: '学习资料', icon: BookOpen },
  PRACTICE: { title: '测验', icon: ClipboardList },
  EXAM: { title: '考试', icon: Trophy },
};

export function TaskPipelinePanel({
  selectedResources,
  resourcesDisabled,
  onDragEnd,
  onRemoveResource,
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

      <ScrollContainer className="min-h-0 flex-1 overflow-y-auto bg-muted/15 p-5">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragCancel={clearDragState}
          onDragEnd={handleDragEnd}
        >
          <div className="flex min-h-full w-full flex-col gap-4">
            {groupedResources.map(({ group, items }) => (
              <TaskPipelineSection
                key={group}
                group={group}
                items={items}
                resourcesDisabled={resourcesDisabled}
                onRemoveResource={onRemoveResource}
              />
            ))}
          </div>

          <DragOverlay>
            {draggingItem ? (
              <div style={draggingItemWidth ? { width: draggingItemWidth } : undefined}>
                <SortableResourceItem
                  item={draggingItem}
                  indexInGroup={groupedResources.find(({ group }) => group === getTaskResourceGroup(draggingItem))?.items
                    .findIndex((item) => item.uid === draggingItem.uid) ?? 0}
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
  onRemoveResource: (uid: number) => void;
}

const TaskPipelineSection: React.FC<TaskPipelineSectionProps> = ({
  group,
  items,
  resourcesDisabled,
  onRemoveResource,
}) => {
  const { title, icon: Icon } = SECTION_CONFIG[group];

  return (
    <section className="flex min-h-[calc((100%-2rem)/3)] flex-none flex-col overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-text-muted" />
          <span className="text-[13px] font-semibold text-foreground">{title}</span>
        </div>
        <span className="text-[11px] font-medium text-text-muted">{items.length}</span>
      </div>

      <div className="px-4 py-3">
        <SortableContext items={items.map((item) => String(item.uid))} strategy={rectSortingStrategy}>
          {items.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {items.map((item, index) => (
                <SortableResourceItem
                  key={item.uid}
                  item={item}
                  indexInGroup={index}
                  removeResource={onRemoveResource}
                  disabled={resourcesDisabled}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[92px] items-center justify-center rounded-lg border border-dashed border-border/80 text-[12px] font-medium text-text-muted">
              点击左侧资源添加
            </div>
          )}
        </SortableContext>
      </div>
    </section>
  );
};
