import { Radio, Checkbox, Input, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { Answer } from '@/types/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

type OptionItem = { key: string; label: string };

const hasValueProp = (data: unknown): data is { value?: unknown } =>
  typeof data === 'object' && data !== null && 'value' in data;

interface QuestionCardProps {
  answer: Answer;
  userAnswer?: unknown;
  onAnswerChange: (value: unknown) => void;
  disabled?: boolean;
  showResult?: boolean;
  isDarkMode?: boolean;
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
  isDarkMode = false,
}) => {
  const textColor = isDarkMode ? 'white' : 'var(--color-gray-900)';
  const questionScore = (answer.question_score as string | number | undefined) ?? answer.score;
  const secondaryColor = isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'var(--color-gray-600)';
  const optionBg = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'var(--color-gray-50)';
  const optionBorder = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'var(--color-gray-200)';

  const optionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    padding: 'var(--spacing-4)',
    marginBottom: 'var(--spacing-2)',
    borderRadius: 'var(--radius-lg)',
    background: optionBg,
    border: `1px solid ${optionBorder}`,
    transition: 'all var(--transition-fast)',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };

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

  const renderQuestion = () => {

    switch (answer.question_type) {
      case 'SINGLE_CHOICE': {
        const singleValue = getSingleChoiceValue();
        return (
          <Radio.Group
            value={singleValue}
            onChange={(e) => onAnswerChange(e.target.value)}
            disabled={disabled}
            style={{ width: '100%' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              {optionItems.map(({ key, label }) => (
                  <label
                    key={key}
                    style={{
                      ...optionStyle,
                      borderColor: singleValue === key ? 'var(--color-primary-500)' : optionBorder,
                      background: singleValue === key
                        ? (isDarkMode ? 'rgba(77, 108, 255, 0.15)' : 'var(--color-primary-50)')
                        : optionBg,
                    }}
                  >
                    <Radio value={key} style={{ color: textColor }}>
                      <span style={{ color: textColor, fontWeight: 500 }}>{key}.</span>{' '}
                      <span style={{ color: textColor }}>{label}</span>
                    </Radio>
                  </label>
                ))}
            </div>
          </Radio.Group>
        );
      }

      case 'MULTIPLE_CHOICE': {
        const multipleValue = getMultipleChoiceValue();
        return (
          <Checkbox.Group
            value={multipleValue}
            onChange={(values) => onAnswerChange(values)}
            disabled={disabled}
            style={{ width: '100%' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              {optionItems.map(({ key, label }) => {
                  const isSelected = multipleValue.includes(key);
                  return (
                    <label
                      key={key}
                      style={{
                        ...optionStyle,
                        borderColor: isSelected ? 'var(--color-primary-500)' : optionBorder,
                        background: isSelected ? (isDarkMode ? 'rgba(77, 108, 255, 0.15)' : 'var(--color-primary-50)') : optionBg,
                      }}
                    >
                      <Checkbox value={key} style={{ color: textColor }}>
                        <span style={{ color: textColor, fontWeight: 500 }}>{key}.</span>{' '}
                        <span style={{ color: textColor }}>{label}</span>
                      </Checkbox>
                    </label>
                  );
                })}
            </div>
          </Checkbox.Group>
        );
      }

      case 'TRUE_FALSE':
        return (
          <Radio.Group
            value={getTrueFalseValue()}
            onChange={(e) => onAnswerChange(e.target.value)}
            disabled={disabled}
            style={{ width: '100%' }}
          >
            <div style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
              <label
                style={{
                  ...optionStyle,
                  flex: 1,
                  justifyContent: 'center',
                  borderColor: getTrueFalseValue() === 'TRUE' ? 'var(--color-success-500)' : optionBorder,
                  background: getTrueFalseValue() === 'TRUE'
                    ? (isDarkMode ? 'rgba(16, 183, 89, 0.15)' : 'var(--color-success-50)')
                    : optionBg,
                }}
              >
                <Radio value="TRUE">
                  <span style={{ color: textColor, fontWeight: 500 }}>✓ 正确</span>
                </Radio>
              </label>
              <label
                style={{
                  ...optionStyle,
                  flex: 1,
                  justifyContent: 'center',
                  borderColor: getTrueFalseValue() === 'FALSE' ? 'var(--color-error-500)' : optionBorder,
                  background: getTrueFalseValue() === 'FALSE'
                    ? (isDarkMode ? 'rgba(255, 61, 113, 0.15)' : 'var(--color-error-50)')
                    : optionBg,
                }}
              >
                <Radio value="FALSE">
                  <span style={{ color: textColor, fontWeight: 500 }}>✗ 错误</span>
                </Radio>
              </label>
            </div>
          </Radio.Group>
        );

      case 'SHORT_ANSWER':
        return (
          <TextArea
            value={getShortAnswerValue()}
            onChange={(e) => onAnswerChange(e.target.value)}
            rows={6}
            placeholder="请在此输入您的答案..."
            disabled={disabled}
            style={{
              background: optionBg,
              border: `1px solid ${optionBorder}`,
              borderRadius: 'var(--radius-lg)',
              color: textColor,
              fontSize: 'var(--font-size-base)',
              padding: 'var(--spacing-4)',
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div>
      {/* 题目内容 */}
      <div style={{ marginBottom: 'var(--spacing-5)' }}>
        <Title
          level={5}
          style={{
            color: textColor,
            margin: 0,
            lineHeight: 1.6,
            fontWeight: 500,
          }}
        >
          {answer.question_content}
        </Title>
      </div>

      {/* 答题区 */}
      <div>{renderQuestion()}</div>

      {/* 结果展示 */}
      {showResult && (
        <div
          style={{
            marginTop: 'var(--spacing-5)',
            padding: 'var(--spacing-4)',
            background: answer.is_correct
              ? (isDarkMode ? 'rgba(16, 183, 89, 0.1)' : 'var(--color-success-50)')
              : (isDarkMode ? 'rgba(255, 61, 113, 0.1)' : 'var(--color-error-50)'),
            borderRadius: 'var(--radius-lg)',
            border: `1px solid ${answer.is_correct ? 'var(--color-success-300)' : 'var(--color-error-300)'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-2)' }}>
            {answer.is_correct ? (
              <CheckCircleOutlined style={{ color: 'var(--color-success-500)', fontSize: 18 }} />
            ) : (
              <CloseCircleOutlined style={{ color: 'var(--color-error-500)', fontSize: 18 }} />
            )}
            <Text
              strong
              style={{
                color: answer.is_correct ? 'var(--color-success-600)' : 'var(--color-error-600)',
              }}
            >
              {answer.is_correct ? '回答正确' : '回答错误'}
            </Text>
            <Text style={{ color: secondaryColor, marginLeft: 'auto' }}>
              得分: {answer.obtained_score || 0}/{questionScore ?? '--'}
            </Text>
          </div>
          {answer.explanation && (
            <div style={{ marginTop: 'var(--spacing-2)' }}>
              <Text style={{ color: secondaryColor }}>
                💡 解析: {answer.explanation}
              </Text>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
