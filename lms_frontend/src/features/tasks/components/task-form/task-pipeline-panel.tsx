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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { LayoutList, Plus } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import {
  TASK_FORM_PANEL_CLASSNAME,
  TASK_FORM_PANEL_HEADER_CLASSNAME,
  TASK_FORM_WARNING_ALERT_CLASSNAME,
  TASK_FORM_WARNING_ALERT_DESCRIPTION_CLASSNAME,
} from './task-form.constants';
import { SortableResourceItem } from './sortable-resource-item';
import type { ResourceFilterType, SelectedResource } from './task-form.types';

interface TaskPipelinePanelProps {
  selectedResources: SelectedResource[];
  resourcesDisabled: boolean;
  isEdit?: boolean;
  onDragEnd: (event: DragEndEvent) => void;
  onRemoveResource: (uid: number) => void;
  onToggleQuizType?: (uid: number, nextQuizType: 'PRACTICE' | 'EXAM') => void;
  onUpdateExamConfig?: (uid: number, patch: { duration?: string; passScore?: string }) => void;
  onAddResource?: (initialType?: ResourceFilterType, insertIndex?: number) => void;
  embedded?: boolean;
}

export function TaskPipelinePanel({
  selectedResources,
  resourcesDisabled,
  isEdit = false,
  onDragEnd,
  onRemoveResource,
  onToggleQuizType,
  onUpdateExamConfig,
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
      <div className={TASK_FORM_PANEL_HEADER_CLASSNAME}>
        <LayoutList className="h-4 w-4 text-primary-500" />
        <span>任务资源</span>
        <Badge variant="secondary" className="h-5 border-none bg-muted px-2 font-bold text-text-muted">
          已选 {selectedResources.length}
        </Badge>
      </div>

      <ScrollContainer className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-muted/15 p-5">
        {resourcesDisabled ? (
          <Alert variant="warning" className={`${TASK_FORM_WARNING_ALERT_CLASSNAME} mb-4`}>
            <AlertDescription className={TASK_FORM_WARNING_ALERT_DESCRIPTION_CLASSNAME}>
              {selectedResources.some((item) => item.quizType === 'EXAM')
                ? '任务创建后无法修改资源结构与考试参考时间，仅可修改考试及格分'
                : '任务创建后无法修改资源，请创建新任务'}
            </AlertDescription>
          </Alert>
        ) : null}

        {selectedResources.length === 0 ? (
          resourcesDisabled ? null : (
            <div className="flex flex-1 items-center justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-xl bg-background px-4 text-[13px] font-semibold shadow-2xs hover:border-interaction-border hover:bg-interaction-surface"
                onClick={() => onAddResource?.('ALL')}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                添加资源
              </Button>
            </div>
          )
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragCancel={clearDragState}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={selectedResources.map((item) => String(item.uid))} strategy={verticalListSortingStrategy}>
              <div className="mx-auto flex w-full max-w-[676px] flex-col px-7">
                {selectedResources.map((item, index) => (
                  <React.Fragment key={item.uid}>
                    {index > 0 ? (
                      <div className="flex flex-col items-center py-0.5" aria-hidden={resourcesDisabled ? 'true' : undefined}>
                        {resourcesDisabled ? (
                          <div className="h-5 w-px border-l border-dashed border-border" />
                        ) : (
                          <>
                            <div className="h-2.5 w-px border-l border-dashed border-border" />
                            <Tooltip title="在此处插入资源">
                              <button
                                type="button"
                                aria-label={`在第 ${index} 项和第 ${index + 1} 项之间插入资源`}
                                onClick={() => onAddResource?.('ALL', index)}
                                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-text-muted transition-[scale,border-color,background-color,color] duration-150 hover:scale-110 hover:border-primary/40 hover:bg-primary-50 hover:text-primary active:scale-95"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </Tooltip>
                            <div className="h-2.5 w-px border-l border-dashed border-border" />
                          </>
                        )}
                      </div>
                    ) : null}
                    <SortableResourceItem
                      item={item}
                      removeResource={onRemoveResource}
                      onToggleQuizType={onToggleQuizType}
                      onUpdateExamConfig={onUpdateExamConfig}
                      isEdit={isEdit}
                      disabled={resourcesDisabled}
                    />
                  </React.Fragment>
                ))}

                {resourcesDisabled ? null : (
                  <div className="flex flex-col items-center pt-0.5">
                    <div className="h-4 w-px border-l border-dashed border-border" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-full bg-background px-4 text-[12px] font-semibold text-text-muted hover:border-interaction-border hover:bg-interaction-surface hover:text-foreground"
                      onClick={() => onAddResource?.('ALL', selectedResources.length)}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      添加资源
                    </Button>
                  </div>
                )}
              </div>
            </SortableContext>

            <DragOverlay>
              {draggingItem ? (
                <div style={draggingItemWidth ? { width: draggingItemWidth } : undefined}>
                  <SortableResourceItem
                    item={draggingItem}
                    removeResource={onRemoveResource}
                    onToggleQuizType={onToggleQuizType}
                    onUpdateExamConfig={onUpdateExamConfig}
                    isEdit={isEdit}
                    disabled={resourcesDisabled}
                    isOverlay
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </ScrollContainer>
    </div>
  );
}
