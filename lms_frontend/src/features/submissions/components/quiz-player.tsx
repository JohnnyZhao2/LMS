import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { useStartQuiz, useSubmitQuiz } from '../api/start-quiz';
import { useSaveAnswer } from '../api/save-answer';
import { QuestionCard } from './question-card';
import { Timer } from './timer';
import {
  Button,
  Card,
  CardContent,
  Progress,
  Spinner,
  StatusBadge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { showApiError } from '@/utils/error-handler';
import type { SubmissionDetail } from '@/types/api';

/**
 * 答题界面组件
 * 统一处理练习和考试，根据 quiz_type 自动判断行为
 */
export const QuizPlayer: React.FC = () => {
  const { id: quizIdStr } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const assignmentId = Number(searchParams.get('assignment') ?? NaN);
  const quizId = Number(quizIdStr ?? NaN);

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false);

  const { mutateAsync: startQuizMutation } = useStartQuiz();
  const { mutateAsync: saveAnswerMutation } = useSaveAnswer();
  const { mutateAsync: submitMutation, isPending: isSubmitPending } = useSubmitQuiz();

  const startAttemptKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${assignmentId}-${quizId}`;
    if (startAttemptKeyRef.current === key) {
      return;
    }

    const start = async () => {
      try {
        const result = await startQuizMutation({ assignmentId, quizId });
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

    if (!Number.isFinite(assignmentId) || !Number.isFinite(quizId)) {
      toast.error('缺少必要的任务参数');
      navigate(-1);
      return;
    }
    startAttemptKeyRef.current = key;
    start();
  }, [assignmentId, navigate, quizId, startQuizMutation]);

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

  const handleSubmitConfirm = async () => {
    if (!submission) {
      return;
    }
    try {
      await submitMutation(submission.id);
      toast.success('提交成功');
      setShowSubmitDialog(false);
      navigate(`/tasks`);
    } catch (error) {
      console.error('提交答卷失败:', error);
      showApiError(error, '提交失败');
    }
  };

  const handleTimeUp = () => {
    setShowTimeUpDialog(true);
  };

  const handleTimeUpConfirm = async () => {
    if (!submission) {
      return;
    }
    await submitMutation(submission.id);
    setShowTimeUpDialog(false);
    navigate(`/tasks`);
  };

  if (!submission) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  const currentQuestion = submission.answers[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / submission.answers.length) * 100);
  // 从 submission 中获取 quiz_type 判断是否是考试
  const isExam = submission.quiz_type === 'EXAM';
  const unansweredCount = submission.answers.length - answeredCount;

  return (
    <div
      className={cn(
        'animate-fadeIn -m-6 min-h-[calc(100vh-var(--header-height))] p-6',
        isExam
          ? 'bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f23]'
          : 'bg-gray-50'
      )}
    >
      {/* 顶部信息栏 */}
      <div
        className={cn(
          'flex justify-between items-center mb-6 px-5 py-4 rounded-xl',
          isExam
            ? 'bg-white/5 backdrop-blur-lg border border-white/10'
            : 'bg-white border border-gray-100'
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'w-11 h-11 rounded-lg flex items-center justify-center text-white text-xl',
              isExam
                ? 'bg-gradient-to-br from-error-500 to-pink-500'
                : 'bg-gradient-to-br from-primary-500 to-purple-500'
            )}
          >
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h4
              className={cn(
                'text-lg font-semibold m-0',
                isExam ? 'text-white' : 'text-gray-900'
              )}
            >
              {submission.quiz_title}
            </h4>
            <span className={cn(
              'text-sm',
              isExam ? 'text-white/60' : 'text-gray-500'
            )}>
              总分：{submission.total_score}分 · {submission.answers.length} 道题
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <StatusBadge
            status={isExam ? 'error' : 'info'}
            text={isExam ? '正式考试' : '练习模式'}
          />
          {isExam && submission.remaining_seconds && (
            <Timer remainingSeconds={submission.remaining_seconds} onTimeUp={handleTimeUp} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 题目导航 */}
        <div className="lg:col-span-1">
          <div className="sticky top-[88px]">
            <Card
              className={cn(
                isExam && 'bg-white/5 border-white/10'
              )}
            >
              <CardContent className="p-5">
                <div className="mb-4">
                  <div className="flex justify-between mb-2">
                    <span className={cn(
                      'text-sm',
                      isExam ? 'text-white/60' : 'text-gray-600'
                    )}>
                      答题进度
                    </span>
                    <span className={cn(
                      'font-semibold',
                      isExam ? 'text-white' : 'text-primary-500'
                    )}>
                      {answeredCount}/{submission.answers.length}
                    </span>
                  </div>
                  <Progress
                    percent={progressPercent}
                    strokeColor={isExam ? 'var(--color-error-500)' : 'var(--color-primary-500)'}
                    trailColor={isExam ? 'rgba(255, 255, 255, 0.1)' : 'var(--color-gray-100)'}
                  />
                </div>

                <span className={cn(
                  'text-xs block mb-3',
                  isExam ? 'text-white/50' : 'text-gray-500'
                )}>
                  题目导航
                </span>
                <div className="flex flex-wrap gap-2">
                  {submission.answers.map((a, i) => {
                    const isAnswered = !!answers[a.question];
                    const isCurrent = currentIndex === i;

                    return (
                      <button
                        key={a.question}
                        onClick={() => setCurrentIndex(i)}
                        className={cn(
                          'w-10 h-10 rounded-md font-semibold text-sm transition-all flex items-center justify-center',
                          isCurrent
                            ? cn(
                              'text-white border-none',
                              isExam ? 'bg-error-500' : 'bg-primary-500'
                            )
                            : isAnswered
                              ? cn(
                                isExam
                                  ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                                  : 'bg-success-50 border border-success-300 text-success-500'
                              )
                              : cn(
                                isExam
                                  ? 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                                  : 'bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100'
                              )
                        )}
                      >
                        {isAnswered && !isCurrent ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          i + 1
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 答题区域 */}
        <div className="lg:col-span-3">
          <Card
            className={cn(
              isExam && 'bg-white/5 border-white/10'
            )}
          >
            <CardContent className="p-6">
              {/* 题号指示 */}
              <div
                className={cn(
                  'flex justify-between items-center mb-5 pb-4 border-b',
                  isExam ? 'border-white/10' : 'border-gray-100'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-md flex items-center justify-center text-white font-bold text-lg',
                      isExam
                        ? 'bg-gradient-to-br from-error-500 to-pink-500'
                        : 'bg-gradient-to-br from-primary-500 to-purple-500'
                    )}
                  >
                    {currentIndex + 1}
                  </div>
                  <span className={cn(
                    isExam ? 'text-white/60' : 'text-gray-500'
                  )}>
                    第 {currentIndex + 1} 题 / 共 {submission.answers.length} 题
                  </span>
                </div>
                {currentQuestion && (
                  <span className={cn(
                    isExam ? 'text-white/60' : 'text-gray-500'
                  )}>
                    分值：{currentQuestion.question_score ?? currentQuestion.score ?? '--'} 分
                  </span>
                )}
              </div>

              {/* 题目内容 */}
              {currentQuestion && (
                <div className={isExam ? 'text-white' : undefined}>
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
                className={cn(
                  'flex justify-between mt-8 pt-5 border-t',
                  isExam ? 'border-white/10' : 'border-gray-100'
                )}
              >
                <Button
                  variant="outline"
                  size="lg"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => prev - 1)}
                  className={cn(
                    'h-12 px-5 rounded-lg',
                    isExam && 'bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white'
                  )}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  上一题
                </Button>
                <div className="flex gap-3">
                  {currentIndex < submission.answers.length - 1 ? (
                    <Button
                      size="lg"
                      onClick={() => setCurrentIndex((prev) => prev + 1)}
                      className={cn(
                        'h-12 px-6 rounded-lg font-semibold',
                        isExam && 'bg-gradient-to-r from-error-500 to-pink-500 hover:from-error-600 hover:to-pink-600 border-none'
                      )}
                    >
                      下一题
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      variant={isExam ? 'destructive' : 'default'}
                      onClick={() => setShowSubmitDialog(true)}
                      disabled={isSubmitPending}
                      className={cn(
                        'h-12 px-6 rounded-lg font-semibold',
                        isExam && 'shadow-[0_4px_14px_rgba(255,61,113,0.4)]'
                      )}
                    >
                      {isSubmitPending ? (
                        <Spinner size="sm" className="mr-2" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      提交答卷
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 提交确认对话框 */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认提交</DialogTitle>
            <DialogDescription asChild>
              <div>
                {unansweredCount > 0 && (
                  <div className="mb-3 text-warning-500">
                    ⚠️ 还有 {unansweredCount} 道题未作答
                  </div>
                )}
                <div>
                  {isExam ? '考试提交后无法重做，确定要提交吗？' : '确定要提交吗？'}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              继续答题
            </Button>
            <Button
              variant={isExam ? 'destructive' : 'default'}
              onClick={handleSubmitConfirm}
              disabled={isSubmitPending}
            >
              {isSubmitPending && <Spinner size="sm" className="mr-2" />}
              确认提交
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 时间到对话框 */}
      <Dialog open={showTimeUpDialog} onOpenChange={setShowTimeUpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⏰ 时间到</DialogTitle>
            <DialogDescription>
              考试时间已结束，系统将自动提交
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleTimeUpConfirm}>
              查看结果
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
