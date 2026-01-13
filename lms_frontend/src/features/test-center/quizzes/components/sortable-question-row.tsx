/**
 * 可排序的题目行组件
 */
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ArrowUp, ArrowDown, Trash2, FileEdit } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { QuestionType } from '@/types/api';
import { getQuestionTypeStyle } from '@/features/test-center/questions/constants';

export interface QuizQuestionItem {
  id: number;
  content: string;
  question_type: QuestionType;
  question_type_display: string;
  score: string;
  order: number;
}

interface SortableQuestionRowProps {
  item: QuizQuestionItem;
  index: number;
  onRemove: (id: number) => void;
  onScoreChange: (id: number, score: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onEdit?: (item: QuizQuestionItem) => void;
  isFirst: boolean;
  isLast: boolean;
}

export const SortableQuestionRow: React.FC<SortableQuestionRowProps> = ({
  item,
  index,
  onRemove,
  onScoreChange,
  onMoveUp,
  onMoveDown,
  onEdit,
  isFirst,
  isLast,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const tagStyle = getQuestionTypeStyle(item.question_type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border ${isDragging ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'
        }`}
      {...attributes}
    >
      {/* 拖拽手柄 */}
      <div {...listeners} className="cursor-grab text-gray-300 hover:text-gray-400 shrink-0">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* 序号 */}
      <div className="w-6 text-gray-500 font-medium text-xs shrink-0">{index + 1}.</div>

      {/* 题型标签 */}
      <div className="shrink-0">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${tagStyle.bg} ${tagStyle.color}`}>
          {tagStyle.label}
        </span>
      </div>

      {/* 题目内容 - 显示多行 */}
      <div className="flex-1 min-w-0 text-sm text-gray-700 line-clamp-3">
        {item.content}
      </div>

      {/* 分值 */}
      <div className="shrink-0">
        <Input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={Number(item.score)}
          onChange={(e) => onScoreChange(item.id, Number(e.target.value) || 0)}
          className="h-7 text-xs w-14 text-center"
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isFirst}
          onClick={() => onMoveUp(index)}
          className="h-6 w-6 p-0"
        >
          <ArrowUp className="w-3 h-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isLast}
          onClick={() => onMoveDown(index)}
          className="h-6 w-6 p-0"
        >
          <ArrowDown className="w-3 h-3" />
        </Button>
        {onEdit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onEdit(item)}
            className="h-6 w-6 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
          >
            <FileEdit className="w-3 h-3" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(item.id)}
          className="h-6 w-6 p-0 text-red-400 hover:text-red-500 hover:bg-red-50"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};
