import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, Button, Row, Col, Typography, Modal, message, Spin, Affix } from 'antd';
import { useStartPractice } from '../api/start-practice';
import { useStartExam } from '../api/start-exam';
import { useSaveAnswer } from '../api/save-answer';
import { useSubmit } from '../api/submit';
import { QuestionCard } from './question-card';
import { Timer } from './timer';
import type { SubmissionDetail } from '@/types/api';

const { Text } = Typography;

interface QuizPlayerProps {
  type: 'practice' | 'exam';
}

/**
 * 答题界面组件
 */
export const QuizPlayer: React.FC<QuizPlayerProps> = ({ type }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const assignmentId = Number(searchParams.get('assignment'));

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Record<string, unknown>>>({});

  const startPractice = useStartPractice();
  const startExam = useStartExam();
  const saveAnswer = useSaveAnswer();
  const submit = useSubmit();

  useEffect(() => {
    const start = async () => {
      try {
        const result = type === 'practice' 
          ? await startPractice.mutateAsync(assignmentId)
          : await startExam.mutateAsync(assignmentId);
        setSubmission(result);
        
        // 初始化已有答案
        const existingAnswers: Record<number, Record<string, unknown>> = {};
        result.answers.forEach((a) => {
          if (a.user_answer) {
            existingAnswers[a.question] = a.user_answer;
          }
        });
        setAnswers(existingAnswers);
      } catch (error) {
        message.error('开始答题失败');
        navigate(-1);
      }
    };
    
    if (assignmentId) {
      start();
    }
  }, [assignmentId, type]);

  const handleAnswerChange = async (questionId: number, value: Record<string, unknown>) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    
    // 自动保存
    try {
      await saveAnswer.mutateAsync({
        assignmentId,
        type,
        data: { question_id: questionId, user_answer: value },
      });
    } catch (error) {
      console.error('保存答案失败:', error);
    }
  };

  const handleSubmit = () => {
    Modal.confirm({
      title: '确认提交',
      content: type === 'exam' ? '考试提交后无法重做，确定要提交吗？' : '确定要提交吗？',
      onOk: async () => {
        try {
          await submit.mutateAsync({ assignmentId, type });
          message.success('提交成功');
          navigate(`/tasks`);
        } catch (error) {
          message.error('提交失败');
        }
      },
    });
  };

  const handleTimeUp = () => {
    Modal.warning({
      title: '时间到',
      content: '考试时间已结束，系统将自动提交',
      onOk: async () => {
        await submit.mutateAsync({ assignmentId, type });
        navigate(`/tasks`);
      },
    });
  };

  if (!submission) {
    return <Spin />;
  }

  const currentQuestion = submission.answers[currentIndex];

  return (
    <Row gutter={24}>
      {/* 题目导航 */}
      <Col xs={24} lg={6}>
        <Affix offsetTop={24}>
          <Card title="题目导航" size="small">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {submission.answers.map((a, i) => (
                <Button
                  key={a.question}
                  size="small"
                  type={currentIndex === i ? 'primary' : answers[a.question] ? 'default' : 'dashed'}
                  onClick={() => setCurrentIndex(i)}
                  style={{ width: 40 }}
                >
                  {i + 1}
                </Button>
              ))}
            </div>
            {type === 'exam' && submission.remaining_seconds && (
              <div style={{ marginTop: 16 }}>
                <Timer remainingSeconds={submission.remaining_seconds} onTimeUp={handleTimeUp} />
              </div>
            )}
          </Card>
        </Affix>
      </Col>

      {/* 答题区域 */}
      <Col xs={24} lg={18}>
        <Card
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{submission.quiz_title}</span>
              <Text type="secondary">
                总分: {submission.total_score}分
              </Text>
            </div>
          }
        >
          {currentQuestion && (
            <QuestionCard
              index={currentIndex}
              answer={currentQuestion}
              userAnswer={answers[currentQuestion.question]}
              onAnswerChange={(value) => handleAnswerChange(currentQuestion.question, value)}
            />
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <Button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => prev - 1)}
            >
              上一题
            </Button>
            <div>
              {currentIndex < submission.answers.length - 1 ? (
                <Button type="primary" onClick={() => setCurrentIndex((prev) => prev + 1)}>
                  下一题
                </Button>
              ) : (
                <Button type="primary" danger onClick={handleSubmit} loading={submit.isPending}>
                  提交答卷
                </Button>
              )}
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

