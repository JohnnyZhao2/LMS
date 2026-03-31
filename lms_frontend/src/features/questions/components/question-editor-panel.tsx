/**
 * 题目编辑面板 — 新建 / 编辑 / 预览 三态复用
 */
import React from 'react';
import {
  AlignLeft,
  CheckSquare2,
  CircleDot,
  Loader2,
  ToggleLeft,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TagInput } from '@/features/knowledge/components/shared/tag-input';
import { cn } from '@/lib/utils';
import type { QuestionCreateRequest, QuestionType, Tag } from '@/types/api';

import { AnswerInput, OptionsInput } from './question-form-inputs';

/* ── 题型配置 ── */
const QUESTION_TYPES: Array<{
  value: QuestionType;
  label: string;
  icon: React.ElementType;
}> = [
  { value: 'SINGLE_CHOICE', label: '单选', icon: CircleDot },
  { value: 'MULTIPLE_CHOICE', label: '多选', icon: CheckSquare2 },
  { value: 'TRUE_FALSE', label: '判断', icon: ToggleLeft },
  { value: 'SHORT_ANSWER', label: '简答', icon: AlignLeft },
];

const DEFAULT_CHOICE_OPTIONS = [
  { key: 'A', value: '' },
  { key: 'B', value: '' },
  { key: 'C', value: '' },
  { key: 'D', value: '' },
];

const ensureChoiceOptions = (options?: Array<{ key: string; value: string }>) => {
  const existing = options ?? [];
  if (existing.length >= 4) {
    return existing;
  }
  return [
    ...existing,
    ...DEFAULT_CHOICE_OPTIONS.slice(existing.length).map((option) => ({ ...option })),
  ];
};

/* ── Props ── */
interface QuestionEditorPanelProps {
  questionForm: Partial<QuestionCreateRequest>;
  setQuestionForm: React.Dispatch<React.SetStateAction<Partial<QuestionCreateRequest>>>;
  spaceTypes?: Tag[];
  editingQuestionId: number | null;
  onCancel: () => void;
  onSave: () => void;
  isSaving: boolean;
  readOnly?: boolean;
  showActions?: boolean;
}

/* ── 组件 ── */
export const QuestionEditorPanel: React.FC<QuestionEditorPanelProps> = ({
  questionForm,
  setQuestionForm,
  spaceTypes,
  editingQuestionId,
  onCancel,
  onSave,
  isSaving,
  readOnly = false,
  showActions = true,
}) => {
  const currentType = questionForm.question_type || 'SINGLE_CHOICE';
  const isChoiceType = currentType === 'SINGLE_CHOICE' || currentType === 'MULTIPLE_CHOICE';
  const typeDisabled = readOnly || !!editingQuestionId;

  return (
    <div className="flex flex-col h-full">
      {/* ─── 题型选择：分段控件 ─── */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex rounded-lg border border-border bg-white p-0.5 gap-0.5">
          {QUESTION_TYPES.map(({ value, label, icon: Icon }) => {
            const active = currentType === value;
            return (
              <button
                key={value}
                type="button"
                disabled={typeDisabled}
                onClick={() =>
                  !typeDisabled &&
                  setQuestionForm((prev) => ({
                    ...prev,
                    question_type: value,
                    options: value === 'MULTIPLE_CHOICE'
                      ? ensureChoiceOptions(prev.options)
                      : prev.options,
                  }))
                }
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 rounded-md py-2',
                  'text-xs font-medium transition-all duration-150',
                  typeDisabled ? 'cursor-default' : 'cursor-pointer',
                  active
                    ? 'bg-background shadow-sm text-foreground'
                    : typeDisabled
                      ? 'text-text-muted/50'
                      : 'text-text-muted hover:text-foreground',
                )}
              >
                <Icon
                  className={cn('w-3.5 h-3.5 shrink-0', active ? 'text-primary-500' : '')}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 元信息行 ─── */}
      <div className="px-5 pb-4 flex items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <Label className="text-[11px] text-text-muted font-medium">
            所属 space
            <span className="ml-1.5 text-[10px] font-normal text-text-muted/50">选填</span>
          </Label>
          <Select
            value={questionForm.space_tag_id == null ? undefined : questionForm.space_tag_id.toString()}
            onValueChange={(val) => {
              if (readOnly) return;
              setQuestionForm((prev) => ({ ...prev, space_tag_id: Number(val) }));
            }}
          >
            <SelectTrigger disabled={readOnly} className="h-8 text-sm">
              <SelectValue placeholder="选择 space" />
              {!readOnly && questionForm.space_tag_id != null && (
                <span
                  role="button"
                  aria-label="清空 space"
                  className="inline-flex h-4 w-4 items-center justify-center rounded text-[14px] leading-none text-text-muted transition-colors hover:text-foreground"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setQuestionForm((prev) => ({ ...prev, space_tag_id: null }));
                  }}
                >
                  ×
                </span>
              )}
            </SelectTrigger>
            <SelectContent>
              {spaceTypes?.map((t) => (
                <SelectItem key={t.id} value={t.id.toString()}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-20 space-y-1.5">
          <Label className="text-[11px] text-text-muted font-medium">分值</Label>
          <Input
            type="number"
            value={questionForm.score}
            onChange={(e) => {
              if (readOnly) return;
              setQuestionForm((prev) => ({ ...prev, score: e.target.value }));
            }}
            readOnly={readOnly}
            className="h-8 text-center text-sm font-semibold"
            min={0}
          />
        </div>
      </div>

      {/* ─── 题目内容 + 选项/答案 + 解析 ─── */}
      <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-4">
        {!readOnly && (
          <div className="space-y-1.5">
            <Label className="text-[11px] text-text-muted font-medium">题目标签</Label>
            <TagInput
              applicableTo="question"
              selectedTags={questionForm.tag_ids?.map((tagId) => ({ id: tagId })) ?? []}
              onAdd={(tag) => {
                setQuestionForm((prev) => ({
                  ...prev,
                  tag_ids: [...new Set([...(prev.tag_ids ?? []), tag.id])],
                }));
              }}
              onRemove={(tagId) => {
                setQuestionForm((prev) => ({
                  ...prev,
                  tag_ids: (prev.tag_ids ?? []).filter((id) => id !== tagId),
                }));
              }}
            />
          </div>
        )}

        {/* 题目内容 */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-text-muted font-medium">题目内容</Label>
          <Textarea
            placeholder="在这里输入题目描述..."
            value={questionForm.content}
            onChange={(e) => {
              if (readOnly) return;
              setQuestionForm((prev) => ({ ...prev, content: e.target.value }));
            }}
            className="min-h-[80px] resize-none text-sm leading-relaxed"
            readOnly={readOnly}
          />
        </div>

        {/* 选项 / 答案 */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-text-muted font-medium">
            {isChoiceType ? '选项与答案' : '参考答案'}
          </Label>
          {isChoiceType ? (
            <>
              <OptionsInput
                questionType={currentType}
                value={questionForm.options || []}
                onChange={(opts) => {
                  if (readOnly) return;
                  setQuestionForm((prev) => ({ ...prev, options: opts }));
                }}
                answer={questionForm.answer || ''}
                onAnswerChange={(ans) => {
                  if (readOnly) return;
                  setQuestionForm((prev) => ({ ...prev, answer: ans }));
                }}
                disabled={readOnly}
              />
              {!readOnly && (
                <p className="text-[10px] text-text-muted/70 pl-0.5">
                  点击字母标签设置正确答案
                </p>
              )}
            </>
          ) : (
            <AnswerInput
              questionType={currentType}
              options={questionForm.options || []}
              value={questionForm.answer || ''}
              onChange={(ans) => {
                if (readOnly) return;
                setQuestionForm((prev) => ({ ...prev, answer: ans }));
              }}
              disabled={readOnly}
            />
          )}
        </div>

        {/* 考点解析 */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-text-muted font-medium">
            考点解析
            <span className="ml-1.5 text-[10px] font-normal text-text-muted/50">选填</span>
          </Label>
          <Textarea
            placeholder="提供给学员的解析说明..."
            value={questionForm.explanation}
            onChange={(e) => {
              if (readOnly) return;
              setQuestionForm((prev) => ({ ...prev, explanation: e.target.value }));
            }}
            className="min-h-[60px] resize-none text-sm"
            readOnly={readOnly}
          />
        </div>
      </div>

      {/* ─── 底部操作栏 ─── */}
      {showActions && (
        <div className="px-5 py-3.5 border-t border-border flex items-center justify-end gap-2 mt-auto">
          <Button variant="ghost" onClick={onCancel} size="sm" className="text-text-muted text-xs h-8">
            取消
          </Button>
          <Button onClick={onSave} disabled={isSaving} size="sm" className="min-w-[88px] text-xs h-8">
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : editingQuestionId ? (
              '保存修改'
            ) : (
              '创建题目'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
