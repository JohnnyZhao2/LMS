import { useSearchParams } from 'react-router-dom';
import { Card, Typography, Spin, Statistic, Row, Col } from 'antd';
import { usePracticeResult, useExamResult } from '../api/get-result';
import { QuestionCard } from './question-card';

const { Title } = Typography;

interface AnswerReviewProps {
  type: 'practice' | 'exam';
}

/**
 * 答题回顾组件
 */
export const AnswerReview: React.FC<AnswerReviewProps> = ({ type }) => {
  const [searchParams] = useSearchParams();
  const assignmentId = Number(searchParams.get('assignment'));

  const { data, isLoading } = type === 'practice' 
    ? usePracticeResult(assignmentId)
    : useExamResult(assignmentId);

  if (isLoading) {
    return <Spin />;
  }

  if (!data) {
    return <div>结果不存在</div>;
  }

  const correctCount = data.answers.filter((a) => a.is_correct).length;

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Title level={3}>{data.quiz_title}</Title>
        <Row gutter={24}>
          <Col>
            <Statistic title="总分" value={data.obtained_score || 0} suffix={`/ ${data.total_score}`} />
          </Col>
          <Col>
            <Statistic title="答对题数" value={correctCount} suffix={`/ ${data.answers.length}`} />
          </Col>
          <Col>
            <Statistic title="答题次数" value={data.attempt_number} />
          </Col>
        </Row>
      </Card>

      <Card title="答题详情">
        {data.answers.map((answer, index) => (
          <QuestionCard
            key={answer.id}
            index={index}
            answer={answer}
            userAnswer={answer.user_answer}
            onAnswerChange={() => {}}
            disabled
            showResult
          />
        ))}
      </Card>
    </div>
  );
};

