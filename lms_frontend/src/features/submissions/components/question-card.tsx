import { Card, Radio, Checkbox, Input, Typography } from 'antd';
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
}

/**
 * 题目卡片组件
 */
export const QuestionCard: React.FC<QuestionCardProps> = ({
  index,
  answer,
  userAnswer,
  onAnswerChange,
  disabled = false,
  showResult = false,
}) => {
  const renderQuestion = () => {
    const options = (answer as { options?: { A?: string; B?: string; C?: string; D?: string } }).options;

    switch (answer.question_type) {
      case 'SINGLE_CHOICE':
        return (
          <Radio.Group
            value={userAnswer?.value}
            onChange={(e) => onAnswerChange({ value: e.target.value })}
            disabled={disabled}
          >
            {options &&
              Object.entries(options).map(([key, value]) => (
                <Radio key={key} value={key} style={{ display: 'block', margin: '8px 0' }}>
                  {key}. {value}
                </Radio>
              ))}
          </Radio.Group>
        );

      case 'MULTIPLE_CHOICE':
        return (
          <Checkbox.Group
            value={(userAnswer?.value as string[]) || []}
            onChange={(values) => onAnswerChange({ value: values })}
            disabled={disabled}
          >
            {options &&
              Object.entries(options).map(([key, value]) => (
                <Checkbox key={key} value={key} style={{ display: 'block', margin: '8px 0' }}>
                  {key}. {value}
                </Checkbox>
              ))}
          </Checkbox.Group>
        );

      case 'TRUE_FALSE':
        return (
          <Radio.Group
            value={userAnswer?.value}
            onChange={(e) => onAnswerChange({ value: e.target.value })}
            disabled={disabled}
          >
            <Radio value={true} style={{ marginRight: 24 }}>
              正确
            </Radio>
            <Radio value={false}>错误</Radio>
          </Radio.Group>
        );

      case 'SHORT_ANSWER':
        return (
          <TextArea
            value={(userAnswer?.value as string) || ''}
            onChange={(e) => onAnswerChange({ value: e.target.value })}
            rows={4}
            placeholder="请输入答案"
            disabled={disabled}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Card style={{ marginBottom: 16 }}>
      <Title level={5}>
        {index + 1}. {answer.question_content}
        <Text type="secondary" style={{ marginLeft: 8, fontWeight: 'normal' }}>
          ({answer.score}分)
        </Text>
      </Title>
      {renderQuestion()}
      {showResult && (
        <div style={{ marginTop: 16, padding: 12, background: '#f6f6f6', borderRadius: 4 }}>
          <Text type={answer.is_correct ? 'success' : 'danger'}>
            {answer.is_correct ? '✓ 正确' : '✗ 错误'} (得分: {answer.obtained_score || 0}/{answer.score})
          </Text>
          {answer.explanation && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">解析: {answer.explanation}</Text>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

