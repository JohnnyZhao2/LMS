/**
 * 题目编辑面板 — 新建 / 编辑 / 预览 三态复用
 */
import React from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TagInput } from '@/features/knowledge/components/shared/tag-input';
import { QUESTION_TYPE_PICKER_OPTIONS } from '@/features/questions/constants';
import { cn } from '@/lib/utils';
import type { QuestionCreateRequest, QuestionType, Tag } from '@/types/api';

import { AnswerInput, OptionsInput } from './question-form-inputs';

/* ── 题型配置 ── */
const QUESTION_TYPES = QUESTION_TYPE_PICKER_OPTIONS;

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

const QuestionTypeOptionContent: React.FC<{
  icon: React.ElementType;
  label: string;
  active?: boolean;
}> = ({ icon: Icon, label, active = false }) => (
  <span className="flex min-w-0 items-center gap-2.5">
    <span
      className={cn(
        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px] bg-muted/72 text-text-muted/80 transition-colors',
        active && 'bg-primary-50 text-primary-500',
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={active ? 2.4 : 2} />
    </span>
    <span className="h-3.5 w-px shrink-0 bg-border/80" aria-hidden="true" />
    <span className="truncate text-[12.5px] font-semibold tracking-[-0.01em] text-foreground/88">
      {label}
    </span>
  </span>
);

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
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 lg:px-7 lg:py-6">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold tracking-[0.04em] text-text-muted/88">
                题目内容
              </Label>
              <Textarea
                placeholder="在这里输入题目描述..."
                value={questionForm.content}
                onChange={(e) => {
                  if (readOnly) return;
                  setQuestionForm((prev) => ({ ...prev, content: e.target.value }));
                }}
                className="min-h-[180px] resize-none text-sm leading-relaxed"
                readOnly={readOnly}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold tracking-[0.04em] text-text-muted/88">
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
                    <p className="pl-0.5 text-[10px] text-text-muted/70">
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

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold tracking-[0.04em] text-text-muted/88">
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
                className="min-h-[120px] resize-none text-sm"
                readOnly={readOnly}
              />
            </div>
          </div>
        </div>

        <aside className="border-t border-border/80 bg-muted/20 px-5 py-5 lg:min-h-0 lg:w-[320px] lg:shrink-0 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:px-5 lg:py-6">
          <div className="flex h-full flex-col gap-5">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold tracking-[0.04em] text-text-muted/88">
                题型
              </Label>
              <Select
                value={currentType}
                onValueChange={(value) => {
                  if (typeDisabled) return;
                  setQuestionForm((prev) => ({
                    ...prev,
                    question_type: value as QuestionType,
                    options: value === 'MULTIPLE_CHOICE'
                      ? ensureChoiceOptions(prev.options)
                      : prev.options,
                  }));
                }}
              >
                <SelectTrigger disabled={typeDisabled} className="h-10">
                  <SelectValue placeholder="选择题型" />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map(({ value, label, icon }) => (
                    <SelectItem key={value} value={value}>
                      <QuestionTypeOptionContent
                        icon={icon}
                        label={label}
                        active={currentType === value}
                      />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold tracking-[0.04em] text-text-muted/88">
                  所属空间
                  <span className="ml-1.5 text-[10px] font-normal text-text-muted/50">选填</span>
                </Label>
                <Select
                  value={questionForm.space_tag_id == null ? undefined : questionForm.space_tag_id.toString()}
                  onValueChange={(val) => {
                    if (readOnly) return;
                    setQuestionForm((prev) => ({ ...prev, space_tag_id: Number(val) }));
                  }}
                >
                  <SelectTrigger disabled={readOnly} className="h-10">
                    <SelectValue placeholder="选择所属空间" />
                    {!readOnly && questionForm.space_tag_id != null && (
                      <span
                        role="button"
                        aria-label="清空所属空间"
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

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold tracking-[0.04em] text-text-muted/88">
                  分值
                </Label>
                <Input
                  type="number"
                  value={questionForm.score ?? ''}
                  onChange={(e) => {
                    if (readOnly) return;
                    setQuestionForm((prev) => ({ ...prev, score: e.target.value }));
                  }}
                  readOnly={readOnly}
                  min={0}
                  className="h-10 px-3 text-center text-sm font-semibold"
                />
              </div>
            </div>

            {!readOnly && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold tracking-[0.04em] text-text-muted/88">
                  题目标签
                </Label>
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
          </div>
        </aside>
      </div>

      {/* ─── 底部操作栏 ─── */}
      {showActions && (
        <div className="mt-auto flex items-center justify-end gap-2 border-t border-border px-6 py-3.5">
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
