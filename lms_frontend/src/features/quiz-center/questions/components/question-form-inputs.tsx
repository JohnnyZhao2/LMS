/**
 * 题目表单输入组件 — 选项输入 + 答案输入
 */
import { Check, Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { QuestionType } from '@/types/api';

/* ─────────────────────────────────────────────
   选项输入组件
   ───────────────────────────────────────────── */
interface OptionsInputProps {
  questionType: QuestionType;
  value: Array<{ key: string; value: string }>;
  onChange: (value: Array<{ key: string; value: string }>) => void;
  answer: string | string[];
  onAnswerChange: (answer: string | string[]) => void;
  disabled?: boolean;
}

export const OptionsInput: React.FC<OptionsInputProps> = ({
  questionType,
  value = [],
  onChange,
  answer,
  onAnswerChange,
  disabled = false,
}) => {
  const handleAdd = () => {
    if (disabled) return;
    const nextKey = String.fromCharCode(65 + value.length);
    onChange([...value, { key: nextKey, value: '' }]);
  };

  const handleChange = (index: number, val: string) => {
    if (disabled) return;
    const next = [...value];
    next[index] = { ...next[index], value: val };
    onChange(next);
  };

  const handleRemove = (index: number) => {
    if (disabled) return;
    const removedKey = value[index]?.key;
    const remaining = value
      .filter((_, i) => i !== index)
      .map((opt, i) => ({ ...opt, key: String.fromCharCode(65 + i) }));
    onChange(remaining);

    if (questionType === 'MULTIPLE_CHOICE' && Array.isArray(answer)) {
      const newAnswer = answer
        .filter((k) => k !== removedKey)
        .map((k) => {
          const oldIndex = value.findIndex((o) => o.key === k);
          return String.fromCharCode(65 + (oldIndex > index ? oldIndex - 1 : oldIndex));
        });
      onAnswerChange(newAnswer);
    } else if (answer === removedKey) {
      onAnswerChange('');
    } else if (typeof answer === 'string' && answer) {
      const oldIndex = value.findIndex((o) => o.key === answer);
      if (oldIndex > index) onAnswerChange(String.fromCharCode(65 + oldIndex - 1));
    }
  };

  const handleToggleAnswer = (key: string) => {
    if (disabled) return;
    if (questionType === 'SINGLE_CHOICE') {
      onAnswerChange(key);
    } else {
      const selected = Array.isArray(answer) ? answer : [];
      onAnswerChange(
        selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key],
      );
    }
  };

  const isSelected = (key: string) =>
    Array.isArray(answer) ? answer.includes(key) : answer === key;

  return (
    <div className="space-y-1">
      {value.map((opt, index) => {
        const selected = isSelected(opt.key);
        return (
          <div
            key={opt.key}
            className="group flex items-center gap-3 transition-all duration-100"
          >
            {/* 答案标签 */}
            <button
              type="button"
              onClick={() => handleToggleAnswer(opt.key)}
              disabled={disabled}
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border',
                'text-[11px] font-semibold transition-all duration-150',
                disabled ? 'cursor-default' : 'cursor-pointer',
                selected
                  ? 'border-primary-500 bg-primary-500 text-white'
                  : 'border-border bg-background text-text-muted hover:border-border/80 hover:bg-muted/40',
              )}
            >
              {selected ? <Check className="w-3 h-3" strokeWidth={3} /> : opt.key}
            </button>

            {/* 选项内容 */}
            <Input
              value={opt.value}
              onChange={(e) => handleChange(index, e.target.value)}
              placeholder={`选项 ${opt.key}`}
              className={cn(
                'h-10 flex-1 rounded-xl border px-3 text-[13px] shadow-none focus-visible:ring-0',
                selected
                  ? 'border-primary-100 bg-primary-50/40'
                  : 'border-border bg-muted/20',
              )}
              readOnly={disabled}
            />

            {/* 删除按钮 */}
            {!disabled && value.length > 2 && (
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                  'text-text-muted/50 hover:text-destructive hover:bg-destructive/10',
                )}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}

      {!disabled && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAdd}
          className={cn(
            'h-8 w-fit px-1 text-[12px] font-medium text-primary-600 hover:bg-transparent hover:text-primary-700',
          )}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          增加候选项
        </Button>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   答案输入组件（判断题 / 简答题）
   ───────────────────────────────────────────── */
interface AnswerInputProps {
  questionType: QuestionType;
  options: Array<{ key: string; value: string }>;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  disabled?: boolean;
}

export const AnswerInput: React.FC<AnswerInputProps> = ({
  questionType,
  value,
  onChange,
  disabled = false,
}) => {
  if (questionType === 'TRUE_FALSE') {
    const current = value as string;
    return (
      <div className="flex gap-2">
        {[
          { val: 'TRUE', label: '✓ 正确' },
          { val: 'FALSE', label: '✗ 错误' },
        ].map(({ val, label }) => (
          <button
            key={val}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(val)}
            className={cn(
              'flex-1 h-9 rounded-lg border text-[13px] font-medium transition-all duration-150',
              disabled ? 'cursor-default' : 'cursor-pointer',
              current === val
                ? val === 'TRUE'
                  ? 'border-primary-200 bg-primary-50 text-primary-700'
                  : 'border-destructive/30 bg-destructive/5 text-destructive/80'
                : 'border-border bg-background text-text-muted hover:border-border/80 hover:bg-muted/30',
            )}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  if (questionType === 'SHORT_ANSWER') {
    return (
      <Textarea
        value={value as string}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
          if (!disabled) onChange(e.target.value);
        }}
        placeholder="输入参考答案..."
        readOnly={disabled}
        rows={3}
        className="resize-none text-[13px]"
      />
    );
  }

  return null;
};
