import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BookOpen,
  ClipboardList,
  ChevronUp,
  ChevronDown,
  Trash2,
  GripVertical,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SelectedResource } from './task-form.types';

interface SortableResourceItemProps {
  item: SelectedResource;
  idx: number;
  moveResource: (idx: number, direction: 'up' | 'down') => void;
  removeResource: (idx: number) => void;
  totalResources: number;
  disabled?: boolean;
}

export const SortableResourceItem: React.FC<SortableResourceItemProps> = ({
  item,
  idx,
  moveResource,
  removeResource,
  totalResources,
  disabled = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.uid });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex gap-4 animate-fadeInUp ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="absolute -left-12 top-0 flex flex-col items-center">
        <div
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110",
            item.resourceType === 'DOCUMENT'
              ? 'bg-secondary'
              : item.quizType === 'EXAM'
                ? 'bg-destructive'
                : 'bg-primary'
          )}
        >
          {item.resourceType === 'DOCUMENT' ? (
            <BookOpen className="w-4 h-4" />
          ) : (
            <ClipboardList className="w-4 h-4" />
          )}
        </div>
      </div>
      <div
        className={`flex-1 flex flex-col gap-2 p-4 bg-background border rounded-xl transition-all ${
          item.isMissingSource
            ? 'border-warning-300 bg-warning-50/30'
            : item.quizType === 'EXAM'
              ? 'border-destructive-100 hover:border-destructive-200'
              : 'border-border hover:border-primary-300'
        }`}
      >
        {item.isMissingSource && (
          <div className="flex items-center gap-2 text-xs text-warning-600">
            <span>原始资源已删除，需要手动替换</span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <div
            {...(disabled ? {} : attributes)}
            {...(disabled ? {} : listeners)}
            className={disabled ? 'p-1 -ml-2 text-text-muted cursor-not-allowed' : 'cursor-grab active:cursor-grabbing p-1 -ml-2 text-text-muted hover:text-text-muted'}
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <Badge
              variant={item.resourceType === 'DOCUMENT' ? 'default' : 'secondary'}
              className={`mb-2 font-bold ${item.resourceType === 'DOCUMENT'
                ? 'bg-secondary-100 text-secondary-700 hover:bg-secondary-100'
                : item.quizType === 'EXAM'
                  ? 'bg-destructive-500 text-white hover:bg-destructive-500'
                  : 'bg-primary-100 text-primary-700 hover:bg-primary-100'
                }`}
            >
              步骤 {idx + 1} {item.quizType === 'EXAM' && '• 考试'}
            </Badge>
            <div className="text-base font-bold text-foreground truncate">{item.title}</div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={disabled || idx === 0}
              onClick={() => moveResource(idx, 'up')}
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={disabled || idx === totalResources - 1}
              onClick={() => moveResource(idx, 'down')}
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive-500 hover:text-destructive-600 hover:bg-destructive-50"
              disabled={disabled}
              onClick={() => removeResource(idx)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
