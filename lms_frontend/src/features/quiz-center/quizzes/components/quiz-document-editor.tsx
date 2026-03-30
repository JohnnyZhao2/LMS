import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Plus, Trash2, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getQuestionTypeLabel, getQuestionTypeStyle } from '@/features/questions/constants';
import { AnswerInput, OptionsInput } from '@/features/questions/components/question-form-inputs';
import type { QuestionType } from '@/types/api';
import type { InlineQuestionItem } from '../types';

const QUESTION_TYPES: Array<{ value: QuestionType; label: string }> = [
  { value: 'SINGLE_CHOICE', label: '单选' },
  { value: 'MULTIPLE_CHOICE', label: '多选' },
  { value: 'TRUE_FALSE', label: '判断' },
  { value: 'SHORT_ANSWER', label: '简答' },
];

interface QuizDocumentEditorProps {
  items: InlineQuestionItem[];
  activeKey: string | null;
  onUpdateItem: (key: string, patch: Partial<InlineQuestionItem>) => void;
  onRemoveItem: (key: string) => void;
  onMoveItem: (key: string, direction: 'up' | 'down') => void;
  onAddBlank: (questionType?: QuestionType) => void;
  onFocusItem: (key: string) => void;
}

/**
 * 试卷文档流内联编辑：题目内容、分值、选项与解析。不展示 space 编辑，space 归属在题库中心维护。
 */
export const QuizDocumentEditor: React.FC<QuizDocumentEditorProps> = ({
  items,
  activeKey,
  onUpdateItem,
  onRemoveItem,
  onMoveItem,
  onAddBlank,
  onFocusItem,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [showAddMenu, setShowAddMenu] = useState(false);

  useEffect(() => {
    if (!showAddMenu) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddMenu]);

  useEffect(() => {
    if (!activeKey) return;

    const node = itemRefs.current[activeKey];
    if (!node) return;

    node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeKey]);

  const handleCreateQuestion = (questionType: QuestionType) => {
    onAddBlank(questionType);
    setShowAddMenu(false);
  };

  return (
    <div ref={containerRef} className="relative flex min-w-0 flex-1 flex-col border-r border-border bg-background">
      <div className="flex-1 overflow-y-auto scrollbar-subtle px-10 py-10">
        {items.length > 0 ? (
          <div className="mx-auto flex max-w-[820px] flex-col gap-6 pb-28">
            {items.map((item, index) => (
              <div
                key={item.key}
                ref={(node) => {
                  itemRefs.current[item.key] = node;
                }}
              >
                <InlineQuestionCard
                  item={item}
                  index={index}
                  total={items.length}
                  isActive={item.key === activeKey}
                  onUpdate={(patch) => onUpdateItem(item.key, patch)}
                  onRemove={() => onRemoveItem(item.key)}
                  onMove={(dir) => onMoveItem(item.key, dir)}
                  onFocus={() => onFocusItem(item.key)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-text-muted">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-background">
              <FileText className="h-8 w-8 opacity-30" />
            </div>
            <div className="space-y-1 text-center">
              <p className="text-[13px] font-medium text-foreground/60">暂无题目</p>
              <p className="text-[12px] text-text-muted">从右侧题库添加，或创建空白题目</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAddMenu(true)} className="mt-1 gap-1.5 rounded-full border-border bg-background px-4 text-[12px] font-medium">
              <Plus className="h-3.5 w-3.5" />
              新建题目
            </Button>
          </div>
        )}
      </div>

      {showAddMenu && (
        <div className="pointer-events-none absolute inset-x-0 bottom-8 z-20 flex flex-col items-center">
          <div className="pointer-events-auto mb-3 w-[184px] rounded-[22px] border border-border bg-background px-4 pt-4 pb-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
            <div className="mb-2 text-center text-[11px] font-semibold text-text-muted">选择题型</div>
            <div className="space-y-0.5">
              {[
                { value: 'SINGLE_CHOICE' as QuestionType, label: '单选题' },
                { value: 'MULTIPLE_CHOICE' as QuestionType, label: '多选题' },
                { value: 'TRUE_FALSE' as QuestionType, label: '判断题' },
                { value: 'SHORT_ANSWER' as QuestionType, label: '简答题' },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleCreateQuestion(type.value)}
                  className="flex h-11 w-full items-center justify-center rounded-xl px-3 text-[13px] font-semibold text-foreground transition-all hover:bg-muted"
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={() => setShowAddMenu(false)} className="pointer-events-auto h-11 rounded-full bg-foreground px-6 text-[13px] font-semibold text-background shadow-[0_10px_22px_rgba(15,23,42,0.14)] hover:bg-foreground/92">
            <X className="mr-2 h-4 w-4" />
            取消添加
          </Button>
        </div>
      )}

      {!showAddMenu && items.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-8 z-20 flex justify-center">
          <Button onClick={() => setShowAddMenu(true)} className="pointer-events-auto h-[42px] rounded-full border border-border bg-background px-5 text-[12px] font-semibold text-foreground shadow-[0_8px_24px_rgba(15,23,42,0.12)] hover:bg-muted">
            <Plus className="mr-1.5 h-4 w-4" />
            添加新题
          </Button>
        </div>
      )}
    </div>
  );
};

interface InlineQuestionCardProps {
  item: InlineQuestionItem;
  index: number;
  total: number;
  isActive: boolean;
  onUpdate: (patch: Partial<InlineQuestionItem>) => void;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onFocus: () => void;
}

const InlineQuestionCard: React.FC<InlineQuestionCardProps> = ({
  item,
  index,
  total,
  isActive,
  onUpdate,
  onRemove,
  onMove,
  onFocus,
}) => {
  const isChoiceType = item.questionType === 'SINGLE_CHOICE' || item.questionType === 'MULTIPLE_CHOICE';
  const style = getQuestionTypeStyle(item.questionType);

  return (
    <div
      onClick={onFocus}
      className={cn(
        'overflow-hidden rounded-2xl border shadow-sm transition-all',
        isActive
          ? 'border-border bg-background'
          : 'border-border/70 bg-muted opacity-72 saturate-50 hover:opacity-90 hover:saturate-75',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between border-b px-8 py-5',
          isActive ? 'border-border bg-background' : 'border-border/70 bg-transparent',
        )}
      >
        <div className="flex items-center gap-3">
          {item.questionId ? (
            <Badge className={cn('h-6 rounded-md px-2.5 text-[10px] font-semibold', style.bg, style.color)}>
              {getQuestionTypeLabel(item.questionType)}
            </Badge>
          ) : (
            <Select
              value={item.questionType}
              onValueChange={(value) => onUpdate({ questionType: value as QuestionType })}
            >
              <SelectTrigger
                className="h-7 w-[110px] rounded-md border-border bg-muted text-[11px] font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map(({ value, label }) => (
                  <SelectItem key={value} value={value} className="text-[11px]">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 shadow-sm">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">分值</span>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={item.score}
              onChange={(e) => onUpdate({ score: e.target.value })}
              className="h-6 w-10 border-0 bg-transparent p-0 text-center text-[13px] font-semibold shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-foreground" disabled={index === 0} onClick={(e) => { e.stopPropagation(); onMove('up'); }}>
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-foreground" disabled={index === total - 1} onClick={(e) => { e.stopPropagation(); onMove('down'); }}>
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:bg-destructive-50 hover:text-destructive-500" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-8 px-8 py-8">
          <div className="space-y-3">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">题目内容</Label>
            <Textarea
              placeholder="输入题目描述..."
              value={item.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              className="min-h-[64px] resize-none border-0 bg-transparent p-0 text-[15px] font-semibold leading-relaxed shadow-none placeholder:text-text-muted/35 focus-visible:ring-0"
            />
          </div>

          <div className="space-y-4">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              {isChoiceType ? '选项配置' : '参考答案'}
            </Label>
            {isChoiceType ? (
              <>
                <OptionsInput
                  questionType={item.questionType}
                  value={item.options}
                  onChange={(opts) => onUpdate({ options: opts })}
                  answer={item.answer}
                  onAnswerChange={(ans) => onUpdate({ answer: ans })}
                />
                <p className="pl-0.5 text-[11px] text-text-muted/60">点击字母标签设置正确答案</p>
              </>
            ) : (
              <AnswerInput
                questionType={item.questionType}
                options={item.options}
                value={item.answer}
                onChange={(ans) => onUpdate({ answer: ans })}
              />
            )}
          </div>

          <div className="border-t border-border pt-6 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              答案解析 <span className="normal-case font-normal text-text-muted/50">选填</span>
            </div>
            <Textarea
              placeholder="提供给学员的解析说明..."
              value={item.explanation}
              onChange={(e) => onUpdate({ explanation: e.target.value })}
              className="min-h-[56px] resize-none border-0 bg-transparent p-0 text-[13px] leading-relaxed shadow-none placeholder:text-text-muted/35 focus-visible:ring-0"
            />
          </div>
      </div>
    </div>
  );
};
