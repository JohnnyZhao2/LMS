import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { Button, Row, Col, Typography, Modal, message, Spin, Affix, Progress, Card } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  SendOutlined,
  CheckCircleFilled,
  FileTextOutlined,
} from '@ant-design/icons';
import { useStartPractice } from '../api/start-practice';
import { useStartExam } from '../api/start-exam';
import { useSaveAnswer } from '../api/save-answer';
import { useSubmit } from '../api/submit';
import { QuestionCard } from './question-card';
import { Timer } from './timer';
import { StatusBadge } from '@/components/ui';
import { showApiError } from '@/utils/error-handler';
import type { SubmissionDetail } from '@/types/api';

const { Text, Title } = Typography;

interface QuizPlayerProps {
  type: 'practice' | 'exam';
}

/**
 * 答题界面组件
 * 全新设计，更现代、更沉浸
 */
export const QuizPlayer: React.FC<QuizPlayerProps> = ({ type }) => {
  const { id: quizIdStr } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const assignmentId = Number(searchParams.get('assignment') ?? NaN);
  const quizId = Number(quizIdStr ?? NaN);

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, unknown>>({});

  const { mutateAsync: startPracticeMutation } = useStartPractice();
  const { mutateAsync: startExamMutation } = useStartExam();
  const { mutateAsync: saveAnswerMutation } = useSaveAnswer();
  const { mutateAsync: submitMutation, isPending: isSubmitPending } = useSubmit();

  const startAttemptKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${assignmentId}-${quizId}-${type}`;
    if (startAttemptKeyRef.current === key) {
      return;
    }
    
    const start = async () => {
      try {
        const result = type === 'practice' 
          ? await startPracticeMutation({ assignmentId, quizId })
          : await startExamMutation({ assignmentId });
        setSubmission(result);
        
        // 初始化已有答案
        const existingAnswers: Record<number, unknown> = {};
        result.answers.forEach((a) => {
          if (a.user_answer !== null && a.user_answer !== undefined) {
            existingAnswers[a.question] = a.user_answer;
          }
        });
        setAnswers(existingAnswers);
      } catch (error) {
        console.error('开始答题失败:', error);
        showApiError(error, '开始答题失败');
        navigate(-1);
      }
    };
    
    if (!Number.isFinite(assignmentId) || (type === 'practice' && !Number.isFinite(quizId))) {
      message.error('缺少必要的任务参数');
      navigate(-1);
      return;
    }
    startAttemptKeyRef.current = key;
    start();
  }, [assignmentId, navigate, quizId, startExamMutation, startPracticeMutation, type]);

  const handleAnswerChange = async (questionId: number, value: unknown) => {
    if (!submission) {
      return;
    }
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    
    // 自动保存
    try {
      await saveAnswerMutation({
        submissionId: submission.id,
        data: { question_id: questionId, user_answer: value },
      });
    } catch (error) {
      console.error('保存答案失败:', error);
    }
  };

  const handleSubmit = () => {
    const answeredCount = Object.keys(answers).length;
    const totalCount = submission?.answers.length || 0;
    const unansweredCount = totalCount - answeredCount;

    Modal.confirm({
      title: '确认提交',
      content: (
        <div>
          {unansweredCount > 0 && (
            <div style={{ marginBottom: 'var(--spacing-3)', color: 'var(--color-warning-500)' }}>
              ⚠️ 还有 {unansweredCount} 道题未作答
            </div>
          )}
          <div>
            {type === 'exam' ? '考试提交后无法重做，确定要提交吗？' : '确定要提交吗？'}
          </div>
        </div>
      ),
      okText: '确认提交',
      cancelText: '继续答题',
      okButtonProps: { danger: type === 'exam' },
      onOk: async () => {
        if (!submission) {
          return;
        }
        try {
          await submitMutation({ submissionId: submission.id, type });
          message.success('提交成功');
          navigate(`/tasks`);
        } catch (error) {
          console.error('提交答卷失败:', error);
          showApiError(error, '提交失败');
        }
      },
    });
  };

  const handleTimeUp = () => {
    Modal.warning({
      title: '⏰ 时间到',
      content: '考试时间已结束，系统将自动提交',
      okText: '查看结果',
      onOk: async () => {
        if (!submission) {
          return;
        }
        await submitMutation({ submissionId: submission.id, type });
        navigate(`/tasks`);
      },
    });
  };

  if (!submission) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  const currentQuestion = submission.answers[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / submission.answers.length) * 100);
  const isExam = type === 'exam';

  return (
    <div
      className="animate-fadeIn"
      style={{
        margin: 'calc(-1 * var(--spacing-6))',
        minHeight: 'calc(100vh - var(--header-height))',
        background: isExam
          ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)'
          : 'var(--color-gray-50)',
        padding: 'var(--spacing-6)',
      }}
    >
      {/* 顶部信息栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--spacing-6)',
          padding: 'var(--spacing-4) var(--spacing-5)',
          background: isExam ? 'rgba(255, 255, 255, 0.05)' : 'var(--color-white)',
          borderRadius: 'var(--radius-xl)',
          backdropFilter: isExam ? 'blur(10px)' : 'none',
          border: isExam ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid var(--color-gray-100)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-lg)',
              background: isExam
                ? 'linear-gradient(135deg, var(--color-error-500) 0%, var(--color-pink-500) 100%)'
                : 'linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-purple-500) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 20,
            }}
          >
            <FileTextOutlined />
          </div>
          <div>
            <Title
              level={4}
              style={{
                margin: 0,
                color: isExam ? 'white' : 'var(--color-gray-900)',
              }}
            >
              {submission.quiz_title}
            </Title>
            <Text style={{ color: isExam ? 'rgba(255, 255, 255, 0.6)' : 'var(--color-gray-500)' }}>
              总分：{submission.total_score}分 · {submission.answers.length} 道题
            </Text>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
          <StatusBadge
            status={isExam ? 'error' : 'info'}
            text={isExam ? '正式考试' : '练习模式'}
          />
          {isExam && submission.remaining_seconds && (
            <Timer remainingSeconds={submission.remaining_seconds} onTimeUp={handleTimeUp} />
          )}
        </div>
      </div>

      <Row gutter={24}>
        {/* 题目导航 */}
        <Col xs={24} lg={6}>
          <Affix offsetTop={88}>
            <Card
              style={{
                background: isExam ? 'rgba(255, 255, 255, 0.05)' : 'var(--color-white)',
                border: isExam ? '1px solid rgba(255, 255, 255, 0.1)' : undefined,
              }}
            >
              <div style={{ marginBottom: 'var(--spacing-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-2)' }}>
                  <Text style={{ color: isExam ? 'rgba(255, 255, 255, 0.6)' : 'var(--color-gray-600)', fontSize: 'var(--font-size-sm)' }}>
                    答题进度
                  </Text>
                  <Text strong style={{ color: isExam ? 'white' : 'var(--color-primary-500)' }}>
                    {answeredCount}/{submission.answers.length}
                  </Text>
                </div>
                <Progress
                  percent={progressPercent}
                  showInfo={false}
                  strokeColor={isExam ? 'var(--color-error-500)' : 'var(--color-primary-500)'}
                  trailColor={isExam ? 'rgba(255, 255, 255, 0.1)' : 'var(--color-gray-100)'}
                />
              </div>

              <Text style={{ color: isExam ? 'rgba(255, 255, 255, 0.5)' : 'var(--color-gray-500)', fontSize: 'var(--font-size-xs)', display: 'block', marginBottom: 'var(--spacing-3)' }}>
                题目导航
              </Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
                {submission.answers.map((a, i) => {
                  const isAnswered = !!answers[a.question];
                  const isCurrent = currentIndex === i;
                  
                  return (
                    <Button
                      key={a.question}
                      size="small"
                      type={isCurrent ? 'primary' : 'default'}
                      onClick={() => setCurrentIndex(i)}
                      style={{
                        width: 40,
                        height: 40,
                        padding: 0,
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 600,
                        background: isCurrent
                          ? (isExam ? 'var(--color-error-500)' : 'var(--color-primary-500)')
                          : isAnswered
                            ? (isExam ? 'rgba(16, 183, 89, 0.2)' : 'var(--color-success-50)')
                            : (isExam ? 'rgba(255, 255, 255, 0.05)' : 'var(--color-gray-50)'),
                        border: isCurrent
                          ? 'none'
                          : isAnswered
                            ? `1px solid ${isExam ? 'rgba(16, 183, 89, 0.4)' : 'var(--color-success-300)'}`
                            : `1px solid ${isExam ? 'rgba(255, 255, 255, 0.1)' : 'var(--color-gray-200)'}`,
                        color: isCurrent
                          ? 'white'
                          : isAnswered
                            ? 'var(--color-success-500)'
                            : (isExam ? 'rgba(255, 255, 255, 0.6)' : 'var(--color-gray-500)'),
                      }}
                    >
                      {isAnswered && !isCurrent ? <CheckCircleFilled /> : i + 1}
                    </Button>
                  );
                })}
              </div>
            </Card>
          </Affix>
        </Col>

        {/* 答题区域 */}
        <Col xs={24} lg={18}>
          <Card
            style={{
              background: isExam ? 'rgba(255, 255, 255, 0.05)' : 'var(--color-white)',
              border: isExam ? '1px solid rgba(255, 255, 255, 0.1)' : undefined,
            }}
          >
            {/* 题号指示 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--spacing-5)',
                paddingBottom: 'var(--spacing-4)',
                borderBottom: `1px solid ${isExam ? 'rgba(255, 255, 255, 0.1)' : 'var(--color-gray-100)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-md)',
                    background: isExam
                      ? 'linear-gradient(135deg, var(--color-error-500) 0%, var(--color-pink-500) 100%)'
                      : 'linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-purple-500) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: 'var(--font-size-lg)',
                  }}
                >
                  {currentIndex + 1}
                </div>
                <Text style={{ color: isExam ? 'rgba(255, 255, 255, 0.6)' : 'var(--color-gray-500)' }}>
                  第 {currentIndex + 1} 题 / 共 {submission.answers.length} 题
                </Text>
              </div>
              {currentQuestion && (
                <Text style={{ color: isExam ? 'rgba(255, 255, 255, 0.6)' : 'var(--color-gray-500)' }}>
                  分值：{currentQuestion.question_score ?? currentQuestion.score ?? '--'} 分
                </Text>
              )}
            </div>

            {/* 题目内容 */}
            {currentQuestion && (
              <div style={{ color: isExam ? 'white' : undefined }}>
                <QuestionCard
                  answer={currentQuestion}
                  userAnswer={answers[currentQuestion.question]}
                  onAnswerChange={(value) => handleAnswerChange(currentQuestion.question, value)}
                  isDarkMode={isExam}
                />
              </div>
            )}

            {/* 底部操作栏 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 'var(--spacing-8)',
                paddingTop: 'var(--spacing-5)',
                borderTop: `1px solid ${isExam ? 'rgba(255, 255, 255, 0.1)' : 'var(--color-gray-100)'}`,
              }}
            >
              <Button
                size="large"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => prev - 1)}
                icon={<LeftOutlined />}
                style={{
                  height: 48,
                  paddingLeft: 'var(--spacing-5)',
                  paddingRight: 'var(--spacing-5)',
                  borderRadius: 'var(--radius-lg)',
                  background: isExam ? 'rgba(255, 255, 255, 0.05)' : undefined,
                  border: isExam ? '1px solid rgba(255, 255, 255, 0.2)' : undefined,
                  color: isExam ? 'white' : undefined,
                }}
              >
                上一题
              </Button>
              <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
                {currentIndex < submission.answers.length - 1 ? (
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => setCurrentIndex((prev) => prev + 1)}
                    style={{
                      height: 48,
                      paddingLeft: 'var(--spacing-6)',
                      paddingRight: 'var(--spacing-6)',
                      borderRadius: 'var(--radius-lg)',
                      fontWeight: 600,
                      background: isExam
                        ? 'linear-gradient(135deg, var(--color-error-500) 0%, var(--color-pink-500) 100%)'
                        : undefined,
                      border: 'none',
                    }}
                  >
                    下一题
                    <RightOutlined />
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    size="large"
                    danger={isExam}
                    onClick={handleSubmit}
                    loading={isSubmitPending}
                    icon={<SendOutlined />}
                    style={{
                      height: 48,
                      paddingLeft: 'var(--spacing-6)',
                      paddingRight: 'var(--spacing-6)',
                      borderRadius: 'var(--radius-lg)',
                      fontWeight: 600,
                      boxShadow: isExam ? '0 4px 14px rgba(255, 61, 113, 0.4)' : undefined,
                    }}
                  >
                    提交答卷
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
