/**
 * 可排序的题目行组件
 */
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';

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
      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 ${
        isDragging ? 'bg-blue-50' : 'bg-white'
      }`}
      {...attributes}
    >
      {/* 拖拽手柄 */}
      <div {...listeners} className="cursor-grab text-gray-400 p-1">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* 序号 */}
      <div className="w-8 text-gray-600 font-medium text-sm">{index + 1}.</div>

      {/* 题型标签 */}
      <div className="w-20">
        <span className={`px-2 py-1 rounded text-xs font-medium ${tagStyle.bg} ${tagStyle.color}`}>
          {tagStyle.label}
        </span>
      </div>

      {/* 题目内容 */}
      <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-gray-700">
        {item.content}
      </div>

      {/* 分值 */}
      <div className="w-24">
        <Input
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={Number(item.score)}
          onChange={(e) => onScoreChange(item.id, Number(e.target.value) || 0)}
          className="h-8 text-sm w-20"
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isFirst}
          onClick={() => onMoveUp(index)}
          className="h-7 w-7 p-0"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isLast}
          onClick={() => onMoveDown(index)}
          className="h-7 w-7 p-0"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(item.id)}
          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};
