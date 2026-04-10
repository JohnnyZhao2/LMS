import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { toast } from 'sonner';
import { useStartQuiz, useSubmitQuiz } from '../api/start-quiz';
import { useSaveAnswer } from '../api/save-answer';
import { PageShell, PageWorkbench } from '@/components/ui/page-shell';
import { Spinner } from '@/components/ui/spinner';
import { showApiError } from '@/utils/error-handler';
import type { SubmissionDetail } from '@/types/api';

import { QuizSubmitDialog, QuizTimeUpDialog } from './quiz-player-dialogs';
import { QuizPlayerMainPanel } from './quiz-player-main-panel';
import { QuizInfoPanel, QuizProgressPanel } from './quiz-player-panels';
import { isAnswerEmpty } from './quiz-player-utils';

export const QuizPlayer: React.FC = () => {
  const { id: quizIdStr } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { roleNavigate } = useRoleNavigate();
  const assignmentId = Number(searchParams.get('assignment') ?? NaN);
  const quizId = Number(quizIdStr ?? NaN);

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const questionRefs = useRef<Record<number, HTMLElement | null>>({});
  const questionViewportRef = useRef<HTMLDivElement | null>(null);

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
        setActiveQuestionIndex(0);
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
    const isEmpty = isAnswerEmpty(value);

    setAnswers((prev) => {
      if (isEmpty) {
        // 如果答案为空，从对象中删除该键
        const nextAnswers = { ...prev };
        delete nextAnswers[questionId];
        return nextAnswers;
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
      roleNavigate('tasks');
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
    roleNavigate('tasks');
  };

  const scrollToQuestion = (index: number) => {
    const questionId = submission?.answers[index]?.question;
    if (questionId && questionRefs.current[questionId]) {
      setActiveQuestionIndex(index);
      questionRefs.current[questionId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  useEffect(() => {
    if (!submission) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const topEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!topEntry) {
          return;
        }

        const index = Number((topEntry.target as HTMLElement).dataset.questionIndex ?? NaN);
        if (Number.isFinite(index)) {
          setActiveQuestionIndex(index);
        }
      },
      {
        threshold: [0.2, 0.4, 0.65],
        root: questionViewportRef.current,
        rootMargin: '-12% 0px -58% 0px',
      }
    );

    submission.answers.forEach((answer, index) => {
      const node = questionRefs.current[answer.question];
      if (!node) {
        return;
      }
      node.dataset.questionIndex = String(index);
      observer.observe(node);
    });

    return () => observer.disconnect();
  }, [submission]);

  if (!submission) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  const totalQuestions = submission.answers.length;
  const answeredCount = submission.answers.reduce(
    (count, answer) => count + (isAnswerEmpty(answers[answer.question]) ? 0 : 1),
    0
  );
  const progressPercent = totalQuestions === 0
    ? 0
    : Math.round((answeredCount / totalQuestions) * 100);
  const isExam = submission.quiz_type === 'EXAM';
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <PageShell className="min-h-0 flex-1 gap-4 pb-4">
      <PageWorkbench className="gap-0">
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
          <div className="min-h-0 xl:h-full">
            <QuizProgressPanel
              submission={submission}
              answers={answers}
              answeredCount={answeredCount}
              progressPercent={progressPercent}
              activeQuestionIndex={activeQuestionIndex}
              isExam={isExam}
              onJump={scrollToQuestion}
            />
          </div>

          <QuizPlayerMainPanel
            submission={submission}
            activeQuestionIndex={activeQuestionIndex}
            answers={answers}
            questionRefs={questionRefs}
            scrollViewportRef={questionViewportRef}
            onAnswerChange={handleAnswerChange}
          />

          <div className="min-h-0 xl:h-full">
            <QuizInfoPanel
              submission={submission}
              isSubmitPending={isSubmitPending}
              onSubmit={() => setShowSubmitDialog(true)}
              onTimeUp={handleTimeUp}
            />
          </div>
        </div>
      </PageWorkbench>

      <QuizSubmitDialog
        open={showSubmitDialog}
        unansweredCount={unansweredCount}
        isExam={isExam}
        isPending={isSubmitPending}
        onOpenChange={setShowSubmitDialog}
        onConfirm={handleSubmitConfirm}
      />

      <QuizTimeUpDialog
        open={showTimeUpDialog}
        onOpenChange={setShowTimeUpDialog}
        onConfirm={handleTimeUpConfirm}
      />
    </PageShell>
  );
};
