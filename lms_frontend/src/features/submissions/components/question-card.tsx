import { CheckCircle, XCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Answer } from '@/types/api';

type OptionItem = { key: string; label: string };

const hasValueProp = (data: unknown): data is { value?: unknown } =>
  typeof data === 'object' && data !== null && 'value' in data;

interface QuestionCardProps {
  answer: Answer;
  userAnswer?: unknown;
  onAnswerChange: (value: unknown) => void;
  disabled?: boolean;
  showResult?: boolean;

}

/**
 * 题目卡片组件
 * 支持明暗模式
 */
export const QuestionCard: React.FC<QuestionCardProps> = ({
  answer,
  userAnswer,
  onAnswerChange,
  disabled = false,
  showResult = false,

}) => {
  const questionScore = (answer.question_score as string | number | undefined) ?? answer.score;

  const normalizeOptions = (): OptionItem[] => {
    if (!answer.question_options) {
      return [];
    }
    if (Array.isArray(answer.question_options)) {
      return answer.question_options
        .filter((opt): opt is { key?: string; value?: string } => !!opt)
        .map((opt, index) => ({
          key: opt.key ?? String.fromCharCode(65 + index),
          label: opt.value ?? '',
        }));
    }
    return Object.entries(answer.question_options).map(([key, value]) => ({
      key,
      label: typeof value === 'string' ? value : String(value ?? ''),
    }));
  };

  const optionItems = normalizeOptions();

  const getSingleChoiceValue = (): string | undefined => {
    if (userAnswer == null) {
      return undefined;
    }
    if (typeof userAnswer === 'string') {
      return userAnswer;
    }
    if (Array.isArray(userAnswer) && userAnswer.length > 0) {
      return userAnswer[0] as string;
    }
    if (hasValueProp(userAnswer)) {
      const val = userAnswer.value;
      if (typeof val === 'string') {
        return val;
      }
    }
    return undefined;
  };

  const getMultipleChoiceValue = (): string[] => {
    if (userAnswer == null) {
      return [];
    }
    if (Array.isArray(userAnswer)) {
      return userAnswer as string[];
    }
    if (hasValueProp(userAnswer)) {
      const val = userAnswer.value;
      if (Array.isArray(val)) {
        return val as string[];
      }
    }
    if (typeof userAnswer === 'string') {
      return [userAnswer];
    }
    return [];
  };

  const getTrueFalseValue = (): 'TRUE' | 'FALSE' | undefined => {
    if (userAnswer == null) {
      return undefined;
    }
    if (typeof userAnswer === 'string') {
      return userAnswer as 'TRUE' | 'FALSE';
    }
    if (typeof userAnswer === 'boolean') {
      return userAnswer ? 'TRUE' : 'FALSE';
    }
    if (hasValueProp(userAnswer)) {
      const val = userAnswer.value;
      if (typeof val === 'string') {
        return val as 'TRUE' | 'FALSE';
      }
      if (typeof val === 'boolean') {
        return val ? 'TRUE' : 'FALSE';
      }
    }
    return undefined;
  };

  const getShortAnswerValue = (): string => {
    if (userAnswer == null) {
      return '';
    }
    if (typeof userAnswer === 'string') {
      return userAnswer;
    }
    if (hasValueProp(userAnswer)) {
      const val = userAnswer.value;
      if (typeof val === 'string') {
        return val;
      }
    }
    return '';
  };

  const handleMultipleChoiceChange = (key: string, checked: boolean) => {
    const currentValues = getMultipleChoiceValue();
    if (checked) {
      onAnswerChange([...currentValues, key]);
    } else {
      onAnswerChange(currentValues.filter((v) => v !== key));
    }
  };

  /* 保持 Light Mode 样式 */
  const renderQuestion = () => {
    switch (answer.question_type) {
      case 'SINGLE_CHOICE': {
        const singleValue = getSingleChoiceValue();
        return (
          <RadioGroup
            value={singleValue}
            onValueChange={onAnswerChange}
            disabled={disabled}
            className="flex flex-col gap-2"
          >
            {optionItems.map(({ key, label }) => {
              const isSelected = singleValue === key;
              return (
                <label
                  key={key}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg border transition-all cursor-pointer bg-gray-50 border-gray-200 hover:bg-gray-100',
                    isSelected && 'border-primary-500 bg-primary-50',
                    disabled && 'cursor-not-allowed opacity-60'
                  )}
                >
                  <RadioGroupItem value={key} id={`option-${answer.id}-${key}`} />
                  <span className="flex-1 text-gray-900">
                    <span className="font-medium">{key}.</span>{' '}
                    <span>{label}</span>
                  </span>
                </label>
              );
            })}
          </RadioGroup>
        );
      }

      case 'MULTIPLE_CHOICE': {
        const multipleValue = getMultipleChoiceValue();
        return (
          <div className="flex flex-col gap-2">
            {optionItems.map(({ key, label }) => {
              const isSelected = multipleValue.includes(key);
              return (
                <label
                  key={key}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg border transition-all cursor-pointer bg-gray-50 border-gray-200 hover:bg-gray-100',
                    isSelected && 'border-primary-500 bg-primary-50',
                    disabled && 'cursor-not-allowed opacity-60'
                  )}
                >
                  <Checkbox
                    id={`option-${answer.id}-${key}`}
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      handleMultipleChoiceChange(key, checked === true)
                    }
                    disabled={disabled}
                  />
                  <span className="flex-1 text-gray-900">
                    <span className="font-medium">{key}.</span>{' '}
                    <span>{label}</span>
                  </span>
                </label>
              );
            })}
          </div>
        );
      }

      case 'TRUE_FALSE': {
        const trueFalseValue = getTrueFalseValue();
        return (
          <RadioGroup
            value={trueFalseValue}
            onValueChange={onAnswerChange}
            disabled={disabled}
            className="flex gap-4"
          >
            <label
              className={cn(
                'flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border transition-all cursor-pointer bg-gray-50 border-gray-200 hover:bg-gray-100',
                trueFalseValue === 'TRUE' && 'border-secondary-500 bg-secondary-50',
                disabled && 'cursor-not-allowed opacity-60'
              )}
            >
              <RadioGroupItem value="TRUE" id={`true-${answer.id}`} />
              <Label
                htmlFor={`true-${answer.id}`}
                className="font-medium cursor-pointer text-gray-900"
              >
                ✓ 正确
              </Label>
            </label>
            <label
              className={cn(
                'flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border transition-all cursor-pointer bg-gray-50 border-gray-200 hover:bg-gray-100',
                trueFalseValue === 'FALSE' && 'border-destructive-500 bg-destructive-50',
                disabled && 'cursor-not-allowed opacity-60'
              )}
            >
              <RadioGroupItem value="FALSE" id={`false-${answer.id}`} />
              <Label
                htmlFor={`false-${answer.id}`}
                className="font-medium cursor-pointer text-gray-900"
              >
                ✗ 错误
              </Label>
            </label>
          </RadioGroup>
        );
      }

      case 'SHORT_ANSWER':
        return (
          <Textarea
            value={getShortAnswerValue()}
            onChange={(e) => onAnswerChange(e.target.value)}
            rows={6}
            placeholder="请在此输入您的答案..."
            disabled={disabled}
            className="text-base bg-gray-50 border-gray-200 text-gray-900"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div>
      {/* 题目内容 */}
      <div className="mb-5">
        <h5 className="text-base font-medium leading-relaxed m-0 text-gray-900">
          {answer.question_content}
        </h5>
      </div>

      {/* 答题区 */}
      <div>{renderQuestion()}</div>

      {/* 结果展示 */}
      {showResult && (
        <div
          className={cn(
            'mt-5 p-4 rounded-lg border',
            answer.is_correct
              ? 'bg-secondary-50 border-secondary-300'
              : 'bg-destructive-50 border-destructive-300'
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            {answer.is_correct ? (
              <CheckCircle className="w-4.5 h-4.5 text-secondary-500" />
            ) : (
              <XCircle className="w-4.5 h-4.5 text-destructive-500" />
            )}
            <span
              className={cn(
                'font-semibold',
                answer.is_correct ? 'text-secondary-600' : 'text-destructive-600'
              )}
            >
              {answer.is_correct ? '回答正确' : '回答错误'}
            </span>
            <span className="ml-auto text-gray-600">
              得分: {answer.obtained_score || 0}/{questionScore ?? '--'}
            </span>
          </div>
          {answer.explanation && (
            <div className="mt-2">
              <span className="text-gray-600">
                💡 解析: {answer.explanation}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
