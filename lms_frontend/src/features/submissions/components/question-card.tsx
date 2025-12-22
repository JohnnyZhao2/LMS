import { Radio, Checkbox, Input, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { Answer } from '@/types/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface QuestionCardProps {
  index: number;
  answer: Answer;
  userAnswer?: Record<string, unknown> | null;
  onAnswerChange: (value: Record<string, unknown>) => void;
  disabled?: boolean;
  showResult?: boolean;
  isDarkMode?: boolean;
}

/**
 * 题目卡片组件
 * 支持明暗模式
 */
export const QuestionCard: React.FC<QuestionCardProps> = ({
  index,
  answer,
  userAnswer,
  onAnswerChange,
  disabled = false,
  showResult = false,
  isDarkMode = false,
}) => {
  const textColor = isDarkMode ? 'white' : 'var(--color-gray-900)';
  const secondaryColor = isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'var(--color-gray-600)';
  const optionBg = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'var(--color-gray-50)';
  const optionHoverBg = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'var(--color-gray-100)';
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

  const renderQuestion = () => {
    const options = (answer as { options?: { A?: string; B?: string; C?: string; D?: string } }).options;

    switch (answer.question_type) {
      case 'SINGLE_CHOICE':
        return (
          <Radio.Group
            value={userAnswer?.value}
            onChange={(e) => onAnswerChange({ value: e.target.value })}
            disabled={disabled}
            style={{ width: '100%' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              {options &&
                Object.entries(options).map(([key, value]) => (
                  <label
                    key={key}
                    style={{
                      ...optionStyle,
                      borderColor: userAnswer?.value === key ? 'var(--color-primary-500)' : optionBorder,
                      background: userAnswer?.value === key ? (isDarkMode ? 'rgba(77, 108, 255, 0.15)' : 'var(--color-primary-50)') : optionBg,
                    }}
                  >
                    <Radio value={key} style={{ color: textColor }}>
                      <span style={{ color: textColor, fontWeight: 500 }}>{key}.</span>{' '}
                      <span style={{ color: textColor }}>{value}</span>
                    </Radio>
                  </label>
                ))}
            </div>
          </Radio.Group>
        );

      case 'MULTIPLE_CHOICE':
        return (
          <Checkbox.Group
            value={(userAnswer?.value as string[]) || []}
            onChange={(values) => onAnswerChange({ value: values })}
            disabled={disabled}
            style={{ width: '100%' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              {options &&
                Object.entries(options).map(([key, value]) => {
                  const isSelected = ((userAnswer?.value as string[]) || []).includes(key);
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
                        <span style={{ color: textColor }}>{value}</span>
                      </Checkbox>
                    </label>
                  );
                })}
            </div>
          </Checkbox.Group>
        );

      case 'TRUE_FALSE':
        return (
          <Radio.Group
            value={userAnswer?.value}
            onChange={(e) => onAnswerChange({ value: e.target.value })}
            disabled={disabled}
            style={{ width: '100%' }}
          >
            <div style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
              <label
                style={{
                  ...optionStyle,
                  flex: 1,
                  justifyContent: 'center',
                  borderColor: userAnswer?.value === true ? 'var(--color-success-500)' : optionBorder,
                  background: userAnswer?.value === true ? (isDarkMode ? 'rgba(16, 183, 89, 0.15)' : 'var(--color-success-50)') : optionBg,
                }}
              >
                <Radio value={true}>
                  <span style={{ color: textColor, fontWeight: 500 }}>✓ 正确</span>
                </Radio>
              </label>
              <label
                style={{
                  ...optionStyle,
                  flex: 1,
                  justifyContent: 'center',
                  borderColor: userAnswer?.value === false ? 'var(--color-error-500)' : optionBorder,
                  background: userAnswer?.value === false ? (isDarkMode ? 'rgba(255, 61, 113, 0.15)' : 'var(--color-error-50)') : optionBg,
                }}
              >
                <Radio value={false}>
                  <span style={{ color: textColor, fontWeight: 500 }}>✗ 错误</span>
                </Radio>
              </label>
            </div>
          </Radio.Group>
        );

      case 'SHORT_ANSWER':
        return (
          <TextArea
            value={(userAnswer?.value as string) || ''}
            onChange={(e) => onAnswerChange({ value: e.target.value })}
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
              得分: {answer.obtained_score || 0}/{answer.score}
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
