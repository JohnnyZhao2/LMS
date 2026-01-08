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
import type { QuestionType } from '@/types/api';

/**
 * 选项输入组件
 */
interface OptionsInputProps {
  value: Array<{ key: string; value: string }>;
  onChange: (value: Array<{ key: string; value: string }>) => void;
}

export const OptionsInput: React.FC<OptionsInputProps> = ({ value = [], onChange }) => {
  const handleAdd = () => {
    const keys = ['A', 'B', 'C', 'D', 'E', 'F'];
    const nextKey = keys[value.length] || String.fromCharCode(65 + value.length);
    onChange([...value, { key: nextKey, value: '' }]);
  };

  const handleChange = (index: number, field: 'key' | 'value', val: string) => {
    const newOptions = [...value];
    newOptions[index] = { ...newOptions[index], [field]: val };
    onChange(newOptions);
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="mt-1.5 space-y-2">
      {value.map((opt, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={opt.key}
            onChange={(e) => handleChange(index, 'key', e.target.value)}
            placeholder="选项"
            className="w-16"
          />
          <Input
            value={opt.value}
            onChange={(e) => handleChange(index, 'value', e.target.value)}
            placeholder="选项内容"
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleRemove(index)}
            className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={handleAdd} className="h-8">
        <Plus className="w-3 h-3 mr-1" />
        添加选项
      </Button>
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
}

export const AnswerInput: React.FC<AnswerInputProps> = ({ questionType, options, value, onChange }) => {
  if (questionType === 'SINGLE_CHOICE') {
    return (
      <Select value={value as string} onValueChange={onChange}>
        <SelectTrigger className="mt-1.5">
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
                if (checked) {
                  onChange([...selectedKeys, opt.key]);
                } else {
                  onChange(selectedKeys.filter((k) => k !== opt.key));
                }
              }}
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
      <Select value={value as string} onValueChange={onChange}>
        <SelectTrigger className="mt-1.5">
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
      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
      placeholder="请输入参考答案"
      className="mt-1.5"
      rows={2}
    />
  );
};
