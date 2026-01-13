/**
 * 题目表单输入组件（选项输入和答案输入）
 */
import { Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { QuestionType } from '@/types/api';

/**
 * 选项输入组件
 */
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

  const handleChange = (index: number, field: 'key' | 'value', val: string) => {
    if (disabled) return;
    const newOptions = [...value];
    newOptions[index] = { ...newOptions[index], [field]: val };
    onChange(newOptions);
  };

  const handleRemove = (index: number) => {
    if (disabled) return;
    const removedKey = value[index]?.key;
    onChange(value.filter((_, i) => i !== index));

    // 同步更新答案
    if (questionType === 'MULTIPLE_CHOICE' && Array.isArray(answer)) {
      onAnswerChange(answer.filter((k) => k !== removedKey));
    } else if (answer === removedKey) {
      onAnswerChange('');
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
    if (Array.isArray(answer)) {
      return answer.includes(key);
    }
    return answer === key;
  };

  return (
    <div className="mt-1.5 space-y-2">
      {value.map((opt, index) => (
        <div
          key={index}
          className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${isSelected(opt.key) ? 'border-green-200 bg-green-50/50' : 'border-gray-100 bg-gray-50/50'
            }`}
        >
          {/* 选择控件 */}
          <div className="flex-shrink-0 flex items-center justify-center w-8">
            {questionType === 'SINGLE_CHOICE' ? (
              <RadioGroup value={isSelected(opt.key) ? opt.key : ''} onValueChange={() => handleToggleAnswer(opt.key)}>
                <RadioGroupItem value={opt.key} className="border-gray-300" disabled={disabled} />
              </RadioGroup>
            ) : (
              <Checkbox
                checked={isSelected(opt.key)}
                onCheckedChange={() => handleToggleAnswer(opt.key)}
                className="border-gray-300"
                disabled={disabled}
              />
            )}
          </div>

          <Input
            value={opt.key}
            onChange={(e) => handleChange(index, 'key', e.target.value)}
            placeholder="选项"
            className="w-12 h-8 text-center font-bold bg-white"
            readOnly={disabled}
          />
          <Input
            value={opt.value}
            onChange={(e) => handleChange(index, 'value', e.target.value)}
            placeholder="输入选项内容..."
            className="flex-1 h-8 bg-white border-transparent focus:border-gray-200"
            readOnly={disabled}
          />
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRemove(index)}
              className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      ))}
      {!disabled && (
        <Button type="button" variant="outline" size="sm" onClick={handleAdd} className="h-8">
          <Plus className="w-3 h-3 mr-1" />
          添加选项
        </Button>
      )}
    </div>
  );
};

/**
 * 答案输入组件
 */
interface AnswerInputProps {
  questionType: QuestionType;
  options: Array<{ key: string; value: string }>;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  disabled?: boolean;
}

export const AnswerInput: React.FC<AnswerInputProps> = ({ questionType, options, value, onChange, disabled = false }) => {
  if (questionType === 'SINGLE_CHOICE') {
    return (
      <Select value={value as string} onValueChange={(val) => { if (!disabled) onChange(val); }}>
        <SelectTrigger className="mt-1.5" disabled={disabled}>
          <SelectValue placeholder="请选择答案" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.key} value={opt.key}>
              {opt.key}: {opt.value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (questionType === 'MULTIPLE_CHOICE') {
    const selectedKeys = Array.isArray(value) ? value : [];
    return (
      <div className="mt-1.5 space-y-2">
        {options.map((opt) => (
          <div key={opt.key} className="flex items-center gap-2">
            <Checkbox
              checked={selectedKeys.includes(opt.key)}
              onCheckedChange={(checked) => {
                if (disabled) return;
                if (checked) {
                  onChange([...selectedKeys, opt.key]);
                } else {
                  onChange(selectedKeys.filter((k) => k !== opt.key));
                }
              }}
              disabled={disabled}
            />
            <span className="text-sm">
              {opt.key}: {opt.value}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (questionType === 'TRUE_FALSE') {
    return (
      <Select value={value as string} onValueChange={(val) => { if (!disabled) onChange(val); }}>
        <SelectTrigger className="mt-1.5" disabled={disabled}>
          <SelectValue placeholder="请选择答案" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TRUE">正确</SelectItem>
          <SelectItem value="FALSE">错误</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Textarea
      value={value as string}
      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (!disabled) onChange(e.target.value);
      }}
      placeholder="请输入参考答案"
      className="mt-1.5"
      readOnly={disabled}
      rows={2}
    />
  );
};
