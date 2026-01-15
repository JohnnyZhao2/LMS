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
 * 答题界面组件 - Flat Design 版本
 * 
 * 设计规范：
 * - 无阴影 (shadow-none)
 * - 无渐变 (no gradient)
 * - 实心背景色区分考试/练习模式
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

    // 判断答案是否为空
    const isEmpty =
      value === null ||
      value === undefined ||
      value === '' ||
      (Array.isArray(value) && value.length === 0);

    setAnswers((prev) => {
      if (isEmpty) {
        // 如果答案为空，从对象中删除该键
        const { [questionId]: _, ...rest } = prev;
        return rest;
      }
      // 否则正常设置答案
      return { ...prev, [questionId]: value };
    });

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
  const isExam = submission.quiz_type === 'EXAM';
  const unansweredCount = submission.answers.length - answeredCount;

  return (
    <div className="-m-6 min-h-[calc(100vh-var(--header-height))] p-6 bg-[#F3F4F6]">
      {/* 顶部信息栏 - Flat Design */}
      <div className="flex justify-between items-center mb-6 px-5 py-4 rounded-lg bg-white">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10 shrink-0 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'w-11 h-11 rounded-md flex items-center justify-center text-white text-xl',
                isExam ? 'bg-[#EF4444]' : 'bg-[#3B82F6]'
              )}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-lg font-semibold m-0 text-[#111827]">
                {submission.quiz_title}
              </h4>
              <span className="text-sm text-[#6B7280]">
                总分：{submission.total_score}分 · {submission.answers.length} 道题
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 ml-auto">
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
            <Card className="rounded-lg bg-white">
              <CardContent className="p-5">
                <div className="mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-[#6B7280]">
                      答题进度
                    </span>
                    <span className={cn(
                      'font-semibold',
                      isExam ? 'text-white' : 'text-[#3B82F6]'
                    )}>
                      {answeredCount}/{submission.answers.length}
                    </span>
                  </div>
                  <Progress
                    percent={progressPercent}
                    strokeColor={isExam ? '#EF4444' : '#3B82F6'}
                    trailColor="#E5E7EB"
                  />
                </div>

                <span className="text-xs block mb-3 text-[#6B7280]">
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
                          'w-10 h-10 rounded-md font-semibold text-sm transition-all duration-200 flex items-center justify-center hover:scale-105',
                          isCurrent
                            ? cn(
                              'text-white',
                              isExam ? 'bg-[#EF4444]' : 'bg-[#3B82F6]'
                            )
                            : isAnswered
                              ? cn(
                                isExam
                                  ? 'bg-[#065F46] text-[#34D399]'
                                  : 'bg-[#D1FAE5] text-[#10B981]'
                              )
                              : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
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
          <Card className="rounded-lg bg-white">
            <CardContent className="p-6">
              {/* 题号指示 */}
              <div className="flex justify-between items-center mb-5 pb-4 border-b-2 border-[#F3F4F6]">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-md flex items-center justify-center font-bold text-lg border',
                      isExam
                        ? 'bg-red-50 text-red-600 border-red-100'
                        : 'bg-blue-50 text-blue-600 border-blue-100'
                    )}
                  >
                    {currentIndex + 1}
                  </div>
                  <span className="text-[#6B7280]">
                    第 {currentIndex + 1} 题 / 共 {submission.answers.length} 题
                  </span>
                </div>
                {currentQuestion && (
                  <span className="text-[#6B7280]">
                    分值：{currentQuestion.question_score ?? currentQuestion.score ?? '--'} 分
                  </span>
                )}
              </div>

              {/* 题目内容 */}
              {currentQuestion && (
                <div>
                  <QuestionCard
                    answer={currentQuestion}
                    userAnswer={answers[currentQuestion.question]}
                    onAnswerChange={(value) => handleAnswerChange(currentQuestion.question, value)}
                  />
                </div>
              )}

              {/* 底部操作栏 */}
              <div className="flex justify-between mt-8 pt-5 border-t-2 border-[#F3F4F6]">
                <Button
                  variant="outline"
                  size="lg"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => prev - 1)}
                  className="h-12 px-5 rounded-md"
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
                        'h-12 px-6 rounded-md font-semibold hover:scale-105',
                        isExam
                          ? 'bg-[#EF4444] hover:bg-[#DC2626]'
                          : 'bg-[#3B82F6] hover:bg-[#2563EB]'
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
                      className="h-12 px-6 rounded-md font-semibold hover:scale-105"
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
        <DialogContent className="rounded-lg">
          <DialogHeader>
            <DialogTitle>确认提交</DialogTitle>
            <DialogDescription asChild>
              <div>
                {unansweredCount > 0 && (
                  <div className="mb-3 text-[#F59E0B]">
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
        <DialogContent className="rounded-lg">
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
