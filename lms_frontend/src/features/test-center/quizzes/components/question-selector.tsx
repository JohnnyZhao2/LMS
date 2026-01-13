/**
 * 题库选择器组件
 */
import { useState } from 'react';

import { Eye, CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

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
            const isSelected = selectedIds.includes(q.id);
            return (
              <div
                key={q.id}
                className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 transition-colors group ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'
                  }`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelect(q.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="w-20 shrink-0">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${typeStyle.bg} ${typeStyle.color}`}>
                    {typeStyle.label}
                  </span>
                </div>
                <div
                  className="flex-1 text-sm text-gray-700 truncate cursor-pointer hover:text-blue-600 flex items-center gap-2"
                  onClick={() => setPreviewQuestion(q)}
                >
                  <span className="truncate">{q.content}</span>
                  <Eye className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="w-20 text-sm text-gray-500 shrink-0">{q.line_type?.name || '-'}</div>
                <div className="w-14 text-sm text-gray-700 shrink-0">{q.score}</div>
              </div>
            );
          })
        ) : (
          <div className="py-10 text-center text-gray-400">暂无可添加的题目</div>
        )}
      </div>

      {/* 题目预览弹窗 */}
      <Dialog open={!!previewQuestion} onOpenChange={(open) => !open && setPreviewQuestion(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${previewQuestion ? getQuestionTypeStyle(previewQuestion.question_type).bg : ''} ${previewQuestion ? getQuestionTypeStyle(previewQuestion.question_type).color : ''}`}>
                {previewQuestion ? getQuestionTypeStyle(previewQuestion.question_type).label : ''}
              </span>
              题目详情
            </DialogTitle>
          </DialogHeader>

          {previewQuestion && (
            <div className="space-y-6 py-4">
              {/* 题干 */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">题目内容</h4>
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100">
                  {previewQuestion.content}
                </div>
              </div>

              {/* 选项 (如果是选择题) */}
              {(previewQuestion.question_type === 'SINGLE_CHOICE' || previewQuestion.question_type === 'MULTIPLE_CHOICE') && previewQuestion.options && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">选项内容</h4>
                  <div className="grid gap-2">
                    {previewQuestion.options.map((opt) => {
                      const isCorrect = Array.isArray(previewQuestion.answer)
                        ? previewQuestion.answer.includes(opt.key)
                        : previewQuestion.answer === opt.key;
                      return (
                        <div
                          key={opt.key}
                          className={`flex items-start gap-3 p-3 rounded-lg border text-sm transition-all ${isCorrect ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-white'
                            }`}
                        >
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold shrink-0 ${isCorrect ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'
                            }`}>
                            {opt.key}
                          </span>
                          <span className="flex-1 pt-0.5">{opt.value}</span>
                          {isCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 判断题答案 */}
              {previewQuestion.question_type === 'TRUE_FALSE' && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">正确答案</h4>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full border border-green-100 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    {previewQuestion.answer === 'TRUE' ? '正确' : '错误'}
                  </div>
                </div>
              )}

              {/* 答案解析 */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">专家解析 (Expert Insight)</h4>
                <div className="text-sm text-gray-600 bg-amber-50/50 p-4 rounded-lg border border-amber-100 italic">
                  {previewQuestion.explanation || '暂无解析'}
                </div>
              </div>

              {/* 分项信息 */}
              <div className="flex items-center gap-6 pt-2 border-t border-gray-100">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">分值权重</span>
                  <span className="text-sm font-semibold text-gray-900">{previewQuestion.score} 分</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">题目版本</span>
                  <span className="text-sm font-semibold text-gray-900">V{previewQuestion.version_number}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
