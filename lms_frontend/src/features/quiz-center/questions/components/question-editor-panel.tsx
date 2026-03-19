/**
 * 题目编辑面板 — 新建 / 编辑 / 预览 三态复用
 * 设计：卡片式分区、视觉化题型切换、清晰的层次结构
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { QuestionCreateRequest, QuestionType, Tag } from '@/types/api';

import { AnswerInput, OptionsInput } from './question-form-inputs';

/* ── 题型配置 ── */
const QUESTION_TYPES: Array<{
  value: QuestionType;
  label: string;
  icon: React.ElementType;
  description: string;
}> = [
  { value: 'SINGLE_CHOICE', label: '单选', icon: CircleDot, description: '选择唯一答案' },
  { value: 'MULTIPLE_CHOICE', label: '多选', icon: CheckSquare2, description: '可选多个答案' },
  { value: 'TRUE_FALSE', label: '判断', icon: ToggleLeft, description: '正确或错误' },
  { value: 'SHORT_ANSWER', label: '简答', icon: AlignLeft, description: '文字作答' },
];

/* ── Props ── */
interface QuestionEditorPanelProps {
  questionForm: Partial<QuestionCreateRequest>;
  setQuestionForm: React.Dispatch<React.SetStateAction<Partial<QuestionCreateRequest>>>;
  lineTypes?: Tag[];
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
  lineTypes,
  editingQuestionId,
  onCancel,
  onSave,
  isSaving,
  readOnly = false,
  showActions = true,
}) => {
  const currentType = questionForm.question_type || 'SINGLE_CHOICE';
  const isChoiceType = currentType === 'SINGLE_CHOICE' || currentType === 'MULTIPLE_CHOICE';

  return (
    <div className="flex flex-col">
      {/* ─── 第一区：题型选择 ─── */}
      <div className="px-6 pt-5 pb-4">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          题型
        </p>
        <div className="grid grid-cols-4 gap-2">
          {QUESTION_TYPES.map(({ value, label, icon: Icon }) => {
            const active = currentType === value;
            const isDisabled = readOnly || !!editingQuestionId;
            return (
              <button
                key={value}
                type="button"
                disabled={isDisabled}
                onClick={() =>
                  !isDisabled &&
                  setQuestionForm((prev) => ({ ...prev, question_type: value }))
                }
                className={`
                  relative flex flex-col items-center gap-1.5 rounded-lg py-3 px-2
                  text-xs font-semibold transition-all duration-150
                  ${isDisabled ? 'cursor-default' : 'cursor-pointer'}
                  ${active
                    ? 'bg-primary-50 text-primary-600 ring-1.5 ring-primary-200 shadow-sm'
                    : isDisabled
                      ? 'bg-muted text-text-muted'
                      : 'bg-muted/60 text-text-muted hover:bg-muted hover:text-foreground'
                  }
                `}
              >
                <Icon className="w-4.5 h-4.5" strokeWidth={active ? 2.5 : 2} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 分隔线 ─── */}
      <div className="border-t border-border" />

      {/* ─── 第二区：元信息行（条线 + 分值） ─── */}
      <div className="px-6 pt-4 pb-3">
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              所属条线
            </p>
            <Select
              value={questionForm.line_tag_id?.toString()}
              onValueChange={(val) => {
                if (readOnly) return;
                setQuestionForm((prev) => ({ ...prev, line_tag_id: Number(val) }));
              }}
            >
              <SelectTrigger disabled={readOnly} className="h-9">
                <SelectValue placeholder="选择条线" />
              </SelectTrigger>
              <SelectContent>
                {lineTypes?.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-24 space-y-1.5">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              分值
            </p>
            <Input
              type="number"
              value={questionForm.score}
              onChange={(e) => {
                if (readOnly) return;
                setQuestionForm((prev) => ({ ...prev, score: e.target.value }));
              }}
              readOnly={readOnly}
              className="h-9 text-center font-semibold"
              min={0}
            />
          </div>
        </div>
      </div>

      {/* ─── 分隔线 ─── */}
      <div className="border-t border-border" />

      {/* ─── 第三区：题目内容 + 选项/答案 ─── */}
      <div className="px-6 pt-4 pb-4 space-y-4">
        {/* 题目内容 */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            题目内容
          </p>
          <Textarea
            placeholder="在这里输入题目描述..."
            value={questionForm.content}
            onChange={(e) => {
              if (readOnly) return;
              setQuestionForm((prev) => ({ ...prev, content: e.target.value }));
            }}
            className="min-h-[88px] resize-none text-sm leading-relaxed"
            readOnly={readOnly}
          />
        </div>

        {/* 选项 / 答案 */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            {isChoiceType ? '选项与答案' : '参考答案'}
          </p>
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
                <p className="text-[10px] text-text-muted pl-0.5">
                  点击字母标签设置正确答案，绿色高亮为已选答案
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

        {/* 考点解析（选填） */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            考点解析
            <span className="ml-1 font-normal normal-case tracking-normal text-gray-400">选填</span>
          </p>
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
        <div className="px-6 py-4 border-t border-border bg-muted/40 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} className="text-text-muted">
            取消
          </Button>
          <Button onClick={onSave} disabled={isSaving} className="min-w-[100px]">
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
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
