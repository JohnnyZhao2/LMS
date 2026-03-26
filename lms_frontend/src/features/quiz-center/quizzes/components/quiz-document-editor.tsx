/**
 * 文档流式试卷编辑器 — 每道题都是内联可编辑卡片
 *
 * Design: 编辑器采用文档流布局，中间区域使用微妙的点阵背景纹理
 * 增加层次感。卡片使用精致的序号标记和分段式题型选择器。
 */
import React, { useRef } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  FileText,
  Plus,
  Trash2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getQuestionTypeLabel, getQuestionTypeStyle } from '@/features/quiz-center/questions/constants';
import { AnswerInput, OptionsInput } from '@/features/quiz-center/questions/components/question-form-inputs';
import type { QuestionType, Tag } from '@/types/api';
import type { InlineQuestionItem } from '../types';

const QUESTION_TYPES: Array<{ value: QuestionType; label: string }> = [
  { value: 'SINGLE_CHOICE', label: '单选' },
  { value: 'MULTIPLE_CHOICE', label: '多选' },
  { value: 'TRUE_FALSE', label: '判断' },
  { value: 'SHORT_ANSWER', label: '简答' },
];

interface QuizDocumentEditorProps {
  items: InlineQuestionItem[];
  lineTypes?: Tag[];
  activeKey: string | null;
  onUpdateItem: (key: string, patch: Partial<InlineQuestionItem>) => void;
  onRemoveItem: (key: string) => void;
  onMoveItem: (key: string, direction: 'up' | 'down') => void;
  onToggleCollapse: (key: string) => void;
  onAddBlank: () => void;
  onFocusItem: (key: string) => void;
}

export const QuizDocumentEditor: React.FC<QuizDocumentEditorProps> = ({
  items,
  lineTypes,
  activeKey,
  onUpdateItem,
  onRemoveItem,
  onMoveItem,
  onToggleCollapse,
  onAddBlank,
  onFocusItem,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col min-w-0 overflow-hidden rounded-xl border border-border"
      style={{
        background: 'linear-gradient(135deg, hsl(var(--theme-muted) / 0.3) 0%, hsl(var(--theme-background)) 100%)',
      }}
    >
      <div className="flex-1 overflow-y-auto scrollbar-subtle px-6 py-5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted gap-4">
            <div className="w-20 h-20 rounded-2xl bg-muted/60 flex items-center justify-center">
              <FileText className="w-8 h-8 opacity-30" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground/60">暂无题目</p>
              <p className="text-xs text-text-muted">从右侧题库添加，或创建空白题目</p>
            </div>
            <Button variant="outline" size="sm" onClick={onAddBlank} className="mt-1 gap-1.5 rounded-lg">
              <Plus className="w-3.5 h-3.5" />
              新建空白题目
            </Button>
          </div>
        ) : (
          <div className="space-y-4 max-w-[680px] mx-auto">
            {items.map((item, idx) => (
              <InlineQuestionCard
                key={item.key}
                item={item}
                index={idx}
                total={items.length}
                isActive={item.key === activeKey}
                lineTypes={lineTypes}
                onUpdate={(patch) => onUpdateItem(item.key, patch)}
                onRemove={() => onRemoveItem(item.key)}
                onMove={(dir) => onMoveItem(item.key, dir)}
                onToggleCollapse={() => onToggleCollapse(item.key)}
                onFocus={() => onFocusItem(item.key)}
              />
            ))}
            <button
              onClick={onAddBlank}
              className={cn(
                'w-full py-3.5 rounded-xl border-2 border-dashed border-border/50',
                'text-xs font-medium text-text-muted/50',
                'hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50/40',
                'active:scale-[0.995] transition-all duration-200',
                'flex items-center justify-center gap-2',
              )}
            >
              <Plus className="w-4 h-4" />
              新建空白题目
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ───────────────────────────────────────────────
   InlineQuestionCard — 单题内联编辑卡片
   ─────────────────────────────────────────────── */
interface InlineQuestionCardProps {
  item: InlineQuestionItem;
  index: number;
  total: number;
  isActive: boolean;
  lineTypes?: Tag[];
  onUpdate: (patch: Partial<InlineQuestionItem>) => void;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onToggleCollapse: () => void;
  onFocus: () => void;
}

const InlineQuestionCard: React.FC<InlineQuestionCardProps> = ({
  item,
  index,
  total,
  isActive,
  lineTypes,
  onUpdate,
  onRemove,
  onMove,
  onToggleCollapse,
  onFocus,
}) => {
  const isChoiceType = item.questionType === 'SINGLE_CHOICE' || item.questionType === 'MULTIPLE_CHOICE';
  const style = getQuestionTypeStyle(item.questionType);

  /* ── 折叠态 ── */
  if (item.collapsed) {
    return (
      <div
        onClick={onToggleCollapse}
        className={cn(
          'group flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer',
          'transition-all duration-200 bg-background',
          isActive
            ? 'border-primary-200 shadow-sm'
            : 'border-border hover:border-primary-200 hover:shadow-sm',
        )}
      >
        {/* 序号圆点 */}
        <div className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
          isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-text-muted',
        )}>
          {index + 1}
        </div>
        <Badge className={cn('text-[10px] px-1.5 shrink-0', style.bg, style.color)}>
          {getQuestionTypeLabel(item.questionType)}
        </Badge>
        <span className={cn(
          'text-sm truncate flex-1',
          item.content ? 'text-foreground' : 'text-text-muted/50 italic',
        )}>
          {item.content || '未填写题目'}
        </span>
        <span className="text-[10px] text-text-muted tabular-nums font-medium">{item.score}分</span>
        <ChevronDown className="w-3.5 h-3.5 text-text-muted/40 group-hover:text-text-muted transition-colors shrink-0" />
      </div>
    );
  }

  /* ── 展开态 ── */
  return (
    <div
      onClick={onFocus}
      className={cn(
        'rounded-xl border bg-background transition-all duration-200',
        isActive
          ? 'border-primary-200 shadow-[0_2px_12px_rgba(59,130,246,0.08)] ring-1 ring-primary-50'
          : 'border-border shadow-sm hover:shadow-md',
      )}
    >
      {/* ─── Card header ─── */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border/50 bg-muted/20 rounded-t-xl">
        {/* 序号 */}
        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
          {index + 1}
        </div>

        {/* 题型分段选择器 */}
        <div className="flex rounded-lg border border-border/70 bg-background p-0.5 gap-px">
          {QUESTION_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              disabled={!!item.questionId}
              onClick={(e) => { e.stopPropagation(); onUpdate({ questionType: value }); }}
              className={cn(
                'px-2 py-1 rounded-md text-[11px] font-medium transition-all duration-150',
                item.questionId ? 'cursor-default' : 'cursor-pointer',
                item.questionType === value
                  ? 'bg-primary-50 text-primary-700 shadow-sm'
                  : item.questionId ? 'text-text-muted/30' : 'text-text-muted hover:text-foreground hover:bg-muted/50',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 条线选择 */}
        <Select value={item.lineTagId?.toString()} onValueChange={(val) => onUpdate({ lineTagId: Number(val) })}>
          <SelectTrigger className="h-7 w-24 text-[11px] border-border/70"><SelectValue placeholder="条线" /></SelectTrigger>
          <SelectContent>
            {lineTypes?.map((t) => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* 分值 */}
        <div className="flex items-center gap-1">
          <Input
            type="number" min={0} max={100} step={0.5}
            value={item.score}
            onChange={(e) => onUpdate({ score: e.target.value })}
            className="w-14 h-7 text-[11px] text-center font-medium border-border/70"
          />
          <span className="text-[10px] text-text-muted">分</span>
        </div>

        {/* 操作按钮 */}
        <div className="ml-auto flex items-center gap-px">
          <Button variant="ghost" size="icon" className="h-6 w-6 text-text-muted/50 hover:text-foreground" disabled={index === 0} onClick={(e) => { e.stopPropagation(); onMove('up'); }}>
            <ChevronUp className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-text-muted/50 hover:text-foreground" disabled={index === total - 1} onClick={(e) => { e.stopPropagation(); onMove('down'); }}>
            <ChevronDown className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-text-muted/50 hover:text-foreground" onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}>
            <ChevronsUpDown className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-text-muted/40 hover:text-destructive-500 hover:bg-destructive-50" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* ─── Card body ─── */}
      <div className="px-4 py-4 space-y-4">
        {/* 题目内容 */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-text-muted font-medium tracking-wide uppercase">题目内容</Label>
          <Textarea
            placeholder="输入题目描述..."
            value={item.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            className="min-h-[64px] resize-none text-sm leading-relaxed"
          />
        </div>

        {/* 选项 / 答案 */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-text-muted font-medium tracking-wide uppercase">
            {isChoiceType ? '选项与答案' : '参考答案'}
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
              <p className="text-[10px] text-text-muted/60 pl-0.5">点击字母标签设置正确答案</p>
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

        {/* 解析 */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-text-muted font-medium tracking-wide uppercase">
            考点解析 <span className="text-[10px] font-normal normal-case text-text-muted/40">选填</span>
          </Label>
          <Textarea
            placeholder="提供给学员的解析说明..."
            value={item.explanation}
            onChange={(e) => onUpdate({ explanation: e.target.value })}
            className="min-h-[48px] resize-none text-sm"
          />
        </div>
      </div>
    </div>
  );
};
