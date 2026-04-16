import {
  DndContext,
  type DragEndEvent,
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
import { Send } from 'lucide-react';

import { ScrollContainer } from '@/components/ui/scroll-container';
import { cn } from '@/lib/utils';
import { TASK_FORM_PANEL_CLASSNAME, TASK_FORM_PANEL_HEADER_CLASSNAME } from './task-form.constants';
import { SortableResourceItem } from './sortable-resource-item';
import type { SelectedResource } from './task-form.types';

interface TaskPipelinePanelProps {
  selectedResources: SelectedResource[];
  resourcesDisabled: boolean;
  onDragEnd: (event: DragEndEvent) => void;
  onMoveResource: (index: number, direction: 'up' | 'down') => void;
  onRemoveResource: (index: number) => void;
  embedded?: boolean;
}

export function TaskPipelinePanel({
  selectedResources,
  resourcesDisabled,
  onDragEnd,
  onMoveResource,
  onRemoveResource,
  embedded = false,
}: TaskPipelinePanelProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <div className={cn(embedded ? 'flex min-h-0 flex-1 flex-col overflow-hidden bg-background' : TASK_FORM_PANEL_CLASSNAME)}>
      {embedded ? null : (
        <div className={TASK_FORM_PANEL_HEADER_CLASSNAME}>
          <Send className="h-4 w-4 -rotate-45 text-primary-500" />
          <span>任务流程</span>
        </div>
      )}

      <ScrollContainer className="min-h-0 flex-1 overflow-y-auto bg-muted/35 p-6">
        {selectedResources.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-xl border border-border/60 bg-background shadow-sm">
              <Send className="h-9 w-9 -rotate-45 text-primary-500" />
            </div>
            <h3 className="mb-3 text-xl font-bold tracking-tight text-foreground">开启你的学习任务</h3>
            <p className="max-w-sm text-sm font-medium leading-relaxed text-text-muted">
              从左侧资源库中挑选内容，通过拖动确定步骤顺序。
            </p>
            <div className="mt-8 rounded-full border border-primary-100 bg-primary-50 px-4 py-2">
              <span className="text-xs font-bold text-primary-600">点击左侧资源开始</span>
            </div>
          </div>
        ) : (
          <div className="relative mx-auto w-full max-w-[520px] pl-12">
            {selectedResources.length > 1 ? (
              <div
                className="absolute left-[17px] top-[18px] w-0.5 bg-border"
                style={{ height: 'calc(100% - 36px)' }}
              />
            ) : null}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={selectedResources.map((item) => item.uid)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {selectedResources.map((item, index) => (
                    <SortableResourceItem
                      key={item.uid}
                      item={item}
                      idx={index}
                      moveResource={onMoveResource}
                      removeResource={onRemoveResource}
                      totalResources={selectedResources.length}
                      disabled={resourcesDisabled}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </ScrollContainer>
    </div>
  );
}
