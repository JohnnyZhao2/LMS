/**
 * 题目表单输入组件 — 选项输入 + 答案输入
 * 设计：卡片式选项行，正确答案高亮，hover 显示删除
 */
import { Check, GripVertical, Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
    const keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const nextKey = keys[value.length] || String.fromCharCode(65 + value.length);
    onChange([...value, { key: nextKey, value: '' }]);
  };

  const handleChange = (index: number, val: string) => {
    if (disabled) return;
    const newOptions = [...value];
    newOptions[index] = { ...newOptions[index], value: val };
    onChange(newOptions);
  };

  const handleRemove = (index: number) => {
    if (disabled) return;
    const removedKey = value[index]?.key;
    const remaining = value.filter((_, i) => i !== index);
    // 重新编号
    const reKeyed = remaining.map((opt, i) => ({
      ...opt,
      key: String.fromCharCode(65 + i),
    }));
    onChange(reKeyed);

    // 同步更新答案
    if (questionType === 'MULTIPLE_CHOICE' && Array.isArray(answer)) {
      const newAnswer = answer
        .filter((k) => k !== removedKey)
        .map((k) => {
          const oldIndex = value.findIndex((o) => o.key === k);
          const newIndex = oldIndex > index ? oldIndex - 1 : oldIndex;
          return String.fromCharCode(65 + newIndex);
        });
      onAnswerChange(newAnswer);
    } else if (answer === removedKey) {
      onAnswerChange('');
    } else if (typeof answer === 'string' && answer) {
      const oldIndex = value.findIndex((o) => o.key === answer);
      if (oldIndex > index) {
        onAnswerChange(String.fromCharCode(65 + oldIndex - 1));
      }
    }
  };

  const handleToggleAnswer = (key: string) => {
    if (disabled) return;
    if (questionType === 'SINGLE_CHOICE') {
      onAnswerChange(key);
    } else if (questionType === 'MULTIPLE_CHOICE') {
      const selectedKeys = Array.isArray(answer) ? answer : [];
      if (selectedKeys.includes(key)) {
        onAnswerChange(selectedKeys.filter((k) => k !== key));
      } else {
        onAnswerChange([...selectedKeys, key]);
      }
    }
  };

  const isSelected = (key: string) => {
    if (Array.isArray(answer)) return answer.includes(key);
    return answer === key;
  };

  return (
    <div className="space-y-1.5">
      {value.map((opt, index) => {
        const selected = isSelected(opt.key);
        return (
          <div
            key={opt.key}
            className={`
              group relative flex items-center gap-2 rounded-lg border px-3 py-2.5
              transition-all duration-150
              ${selected
                ? 'border-secondary-300 bg-secondary-50/60 ring-1 ring-secondary-200'
                : 'border-border bg-background hover:border-gray-300'
              }
            `}
          >
            {/* 拖拽手柄占位（视觉层次） */}
            <GripVertical className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />

            {/* 选项字母标签 */}
            <button
              type="button"
              onClick={() => handleToggleAnswer(opt.key)}
              disabled={disabled}
              className={`
                shrink-0 w-7 h-7 rounded-md flex items-center justify-center
                text-xs font-bold transition-all duration-150 cursor-pointer
                ${selected
                  ? 'bg-secondary-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }
              `}
            >
              {selected ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : opt.key}
            </button>

            {/* 选项内容输入 */}
            <Input
              value={opt.value}
              onChange={(e) => handleChange(index, e.target.value)}
              placeholder={`选项 ${opt.key} 的内容`}
              className="flex-1 h-8 border-0 bg-transparent shadow-none focus-visible:ring-0 px-2 text-sm"
              readOnly={disabled}
            />

            {/* 删除按钮 — hover 时显示 */}
            {!disabled && value.length > 2 && (
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="shrink-0 w-6 h-6 rounded flex items-center justify-center
                  opacity-0 group-hover:opacity-100 transition-opacity
                  text-gray-400 hover:text-destructive-500 hover:bg-destructive-50"
              >
                <X className="w-3.5 h-3.5" />
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
          className="h-9 w-full border border-dashed border-gray-200 text-text-muted
            hover:border-gray-300 hover:bg-gray-50 hover:text-foreground transition-all"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          添加选项
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
          { val: 'TRUE', label: '正确' },
          { val: 'FALSE', label: '错误' },
        ].map(({ val, label }) => (
          <button
            key={val}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(val)}
            className={`
              flex-1 h-10 rounded-lg border text-sm font-semibold
              transition-all duration-150 cursor-pointer
              ${current === val
                ? val === 'TRUE'
                  ? 'border-secondary-300 bg-secondary-50 text-secondary-700 ring-1 ring-secondary-200'
                  : 'border-destructive-300 bg-destructive-50 text-destructive-700 ring-1 ring-destructive-200'
                : 'border-border bg-background text-text-muted hover:border-gray-300'
              }
            `}
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
        className="resize-none"
      />
    );
  }

  // 选择题不使用此组件（由 OptionsInput 直接处理答案）
  return null;
};
