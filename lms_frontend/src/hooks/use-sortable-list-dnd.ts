import * as React from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

interface SortableListItem {
  key: string;
}

interface UseSortableListDndOptions<T extends SortableListItem> {
  items: T[];
  onSelectItem: (key: string) => void;
  onReorderItems: (activeKey: string, overKey: string) => void;
}

export const useSortableListDnd = <T extends SortableListItem>({
  items,
  onSelectItem,
  onReorderItems,
}: UseSortableListDndOptions<T>) => {
  const dragCleanupFrameRef = React.useRef<number | null>(null);
  const [draggingItemKey, setDraggingItemKey] = React.useState<string | null>(null);
  const [draggingItemWidth, setDraggingItemWidth] = React.useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
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
    () => items.find((item) => item.key === draggingItemKey) ?? null,
    [draggingItemKey, items],
  );

  const clearDragState = React.useCallback(() => {
    if (dragCleanupFrameRef.current !== null) {
      cancelAnimationFrame(dragCleanupFrameRef.current);
      dragCleanupFrameRef.current = null;
    }

    setDraggingItemKey(null);
    setDraggingItemWidth(null);
  }, []);

  const handleDragStart = React.useCallback(({ active }: DragStartEvent) => {
    setDraggingItemKey(String(active.id));
    setDraggingItemWidth(active.rect.current.initial?.width ?? null);
    onSelectItem(String(active.id));
  }, [onSelectItem]);

  const handleDragEnd = React.useCallback(({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      clearDragState();
      return;
    }

    onReorderItems(String(active.id), String(over.id));
    dragCleanupFrameRef.current = requestAnimationFrame(clearDragState);
  }, [clearDragState, onReorderItems]);

  return {
    sensors,
    draggingItem,
    draggingItemWidth,
    clearDragState,
    handleDragStart,
    handleDragEnd,
  };
};
