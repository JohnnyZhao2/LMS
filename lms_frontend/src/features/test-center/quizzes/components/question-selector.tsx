/**
 * 题库选择器组件
 */
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { Question, QuestionType } from '@/types/api';
import { QUESTION_TYPE_FILTER_OPTIONS, getQuestionTypeStyle } from '@/features/test-center/questions/constants';

interface QuestionSelectorProps {
  availableQuestions: Question[];
  onConfirm: (ids: number[]) => void;
  onCancel: () => void;
}

export const QuestionSelector: React.FC<QuestionSelectorProps> = ({
  availableQuestions,
  onConfirm,
  onCancel,
}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [filterType, setFilterType] = useState<QuestionType | 'ALL'>('ALL');

  const filteredQuestions =
    filterType === 'ALL'
      ? availableQuestions
      : availableQuestions.filter((q) => q.question_type === filterType);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredQuestions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredQuestions.map((q) => q.id));
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <SegmentedControl
          options={QUESTION_TYPE_FILTER_OPTIONS}
          value={filterType}
          onChange={(val) => setFilterType(val as QuestionType | 'ALL')}
          label="题目类型"
          activeColor="blue"
        />
        <span className="text-sm text-gray-500 self-end pb-2">共 {filteredQuestions.length} 道题目</span>
      </div>

      <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
        {/* 表头 */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200 sticky top-0">
          <Checkbox
            checked={selectedIds.length === filteredQuestions.length && filteredQuestions.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <div className="w-20 text-xs font-medium text-gray-500">题目类型</div>
          <div className="flex-1 text-xs font-medium text-gray-500">题目内容</div>
          <div className="w-20 text-xs font-medium text-gray-500">条线类型</div>
          <div className="w-14 text-xs font-medium text-gray-500">分值</div>
        </div>

        {/* 题目列表 */}
        {filteredQuestions.length > 0 ? (
          filteredQuestions.map((q) => {
            const typeStyle = getQuestionTypeStyle(q.question_type);
            return (
              <div
                key={q.id}
                onClick={() => toggleSelect(q.id)}
                className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 cursor-pointer transition-colors ${
                  selectedIds.includes(q.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <Checkbox checked={selectedIds.includes(q.id)} onCheckedChange={() => toggleSelect(q.id)} />
                <div className="w-20">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${typeStyle.bg} ${typeStyle.color}`}>
                    {typeStyle.label}
                  </span>
                </div>
                <div className="flex-1 text-sm text-gray-700 truncate">{q.content}</div>
                <div className="w-20 text-sm text-gray-500">{q.line_type?.name || '-'}</div>
                <div className="w-14 text-sm text-gray-700">{q.score}</div>
              </div>
            );
          })
        ) : (
          <div className="py-10 text-center text-gray-400">暂无可添加的题目</div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button
          type="button"
          disabled={selectedIds.length === 0}
          onClick={() => onConfirm(selectedIds)}
          style={{ background: 'rgb(77, 108, 255)' }}
        >
          添加已选 ({selectedIds.length})
        </Button>
      </div>
    </div>
  );
};
