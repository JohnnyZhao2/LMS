import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Typography, InputNumber, Input, Spin, message, Row, Col, Descriptions } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { useGradingDetail } from '../api/get-grading-detail';
import { useSubmitGrade } from '../api/submit-grade';
import type { Answer } from '@/types/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

/**
 * 评分表单组件
 */
export const GradingForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useGradingDetail(Number(id));
  const submitGrade = useSubmitGrade();

  const [grades, setGrades] = useState<Record<number, { score: string; comment?: string }>>({});

  const handleGrade = (answerId: number, score: string, comment?: string) => {
    setGrades((prev) => ({
      ...prev,
      [answerId]: { score, comment },
    }));
  };

  const handleSubmit = async (answerId: number) => {
    const grade = grades[answerId];
    if (!grade) {
      message.error('请填写分数');
      return;
    }

    try {
      await submitGrade.mutateAsync({
        submissionId: Number(id),
        data: {
          answer_id: answerId,
          obtained_score: grade.score,
          comment: grade.comment,
        },
      });
      message.success('评分成功');
    } catch (error) {
      message.error('评分失败');
    }
  };

  const handleFullScore = (answer: Answer) => {
    handleGrade(answer.id, answer.score || '0');
  };

  if (isLoading) {
    return <Spin />;
  }

  if (!data) {
    return <div>提交记录不存在</div>;
  }

  // 筛选出需要评分的主观题
  const subjectiveAnswers = data.answers.filter((a) => a.question_type === 'SHORT_ANSWER');

  return (
    <div>
      <Title level={2}>评分详情</Title>
      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={2}>
          <Descriptions.Item label="学员">{data.user_name}</Descriptions.Item>
          <Descriptions.Item label="试卷">{data.quiz_title}</Descriptions.Item>
          <Descriptions.Item label="任务">{data.task_title}</Descriptions.Item>
          <Descriptions.Item label="总分">{data.total_score}</Descriptions.Item>
        </Descriptions>
      </Card>

      {subjectiveAnswers.length === 0 ? (
        <Card>
          <Text>没有需要评分的主观题</Text>
        </Card>
      ) : (
        subjectiveAnswers.map((answer, index) => (
          <Card key={answer.id} style={{ marginBottom: 16 }}>
            <Title level={5}>
              {index + 1}. {answer.question_content}
              <Text type="secondary" style={{ marginLeft: 8, fontWeight: 'normal' }}>
                ({answer.score}分)
              </Text>
            </Title>
            <div
              style={{
                padding: 12,
                background: '#f6f6f6',
                borderRadius: 4,
                marginTop: 8,
                marginBottom: 16,
              }}
            >
              <Text strong>学员答案:</Text>
              <div style={{ marginTop: 8 }}>
                {(answer.user_answer?.value as string) || '未作答'}
              </div>
            </div>
            <Row gutter={16} align="middle">
              <Col>
                <Text>得分:</Text>
                <InputNumber
                  min={0}
                  max={Number(answer.score)}
                  value={grades[answer.id]?.score ? Number(grades[answer.id].score) : undefined}
                  onChange={(value) => handleGrade(answer.id, String(value || 0), grades[answer.id]?.comment)}
                  style={{ marginLeft: 8, width: 80 }}
                />
                <Text type="secondary" style={{ marginLeft: 4 }}>
                  / {answer.score}
                </Text>
              </Col>
              <Col>
                <Button size="small" onClick={() => handleFullScore(answer)}>
                  一键满分
                </Button>
              </Col>
            </Row>
            <div style={{ marginTop: 12 }}>
              <Text>评语:</Text>
              <TextArea
                rows={2}
                placeholder="输入评语（可选）"
                value={grades[answer.id]?.comment || ''}
                onChange={(e) =>
                  handleGrade(answer.id, grades[answer.id]?.score || '0', e.target.value)
                }
                style={{ marginTop: 8 }}
              />
            </div>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleSubmit(answer.id)}
              loading={submitGrade.isPending}
              style={{ marginTop: 12 }}
            >
              确认评分
            </Button>
          </Card>
        ))
      )}

      <Button onClick={() => navigate('/grading')}>返回列表</Button>
    </div>
  );
};


