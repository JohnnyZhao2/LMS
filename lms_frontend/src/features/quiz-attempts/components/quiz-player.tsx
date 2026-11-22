import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ROUTES } from '@/config/routes';
import { useStartQuiz, useSubmitQuiz } from '../api/start-quiz';
import { useQuizAutosave } from '../hooks/use-quiz-autosave';
import { useQuestionScrollSync } from '../hooks/use-question-scroll-sync';
import { PageShell, PageWorkbench } from '@/components/ui/page-shell';
import { Spinner } from '@/components/ui/spinner';
import { buildQuestionSections } from '@/lib/question-sections';
import { showApiError } from '@/utils/error-handler';
import type { SaveAnswerRequest, SubmissionDetail } from '@/features/quiz-attempts/types';

import { QuizAbandonDialog, QuizSubmitDialog } from './quiz-player-dialogs';
import { QuizPlayerMainPanel } from './quiz-player-main-panel';
import { QuizInfoPanel, QuizProgressPanel } from './quiz-player-panels';
import { isAnswerEmpty } from './quiz-player-utils';

export const QuizPlayer: React.FC = () => {
  const { id: quizIdStr } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const assignmentId = Number(searchParams.get('assignment') ?? NaN);
  const quizId = Number(quizIdStr ?? NaN);

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [markedQuestions, setMarkedQuestions] = useState<Record<number, boolean>>({});
  const [showAbandonDialog, setShowAbandonDialog] = useState(false);
  const [isAbandonPending, setIsAbandonPending] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { mutateAsync: startQuizMutation } = useStartQuiz();
  const { mutateAsync: submitMutation, isPending: isSubmitPending } = useSubmitQuiz();
  const isSubmitBusy = isSubmitting || isSubmitPending;

  const startAttemptKeyRef = useRef<string | null>(null);
  const submissionLoadedRef = useRef(false);

  const {
    restoreDraft,
    queueAnswerUpdate,
    flushPending,
    beginSubmit,
    finishSubmit,
    cancelSubmit,
  } = useQuizAutosave(submission?.id ?? null);

  const questionSections = useMemo(
    () => (submission ? buildQuestionSections(submission.answers, (answer) => answer.question_type) : []),
    [submission],
  );
  const displayQuestionEntries = useMemo(
    () => questionSections.flatMap((section) => section.entries),
    [questionSections],
  );

  const {
    activeQuestionIndex,
    setActiveQuestionIndex,
    questionRefs,
    questionViewportRef,
    scrollToQuestion,
  } = useQuestionScrollSync(displayQuestionEntries);

  useEffect(() => {
    const key = `${assignmentId}-${quizId}`;
    if (startAttemptKeyRef.current === key) {
      return;
    }

    if (!Number.isInteger(assignmentId) || assignmentId <= 0 || !Number.isInteger(quizId) || quizId <= 0) {
      toast.error('缺少必要的任务参数');
      navigate(-1);
      return;
    }

    let cancelled = false;
    startAttemptKeyRef.current = key;
    submissionLoadedRef.current = false;

    const start = async () => {
      try {
        const result = await startQuizMutation({ assignmentId, quizId });
        if (cancelled) {
          return;
        }
        submissionLoadedRef.current = true;
        setSubmission(result);

        const existingAnswers: Record<number, string | string[]> = {};
        const existingMarkedQuestions: Record<number, boolean> = {};
        const validQuestionIds = new Set<number>();
        result.answers.forEach((a) => {
          validQuestionIds.add(a.question);
          if (a.user_answer !== null && a.user_answer !== undefined) {
            existingAnswers[a.question] = a.user_answer;
          }
          if (a.is_marked) {
            existingMarkedQuestions[a.question] = true;
          }
        });

        const restoredPending = restoreDraft(result.id, validQuestionIds);
        for (const item of Object.values(restoredPending)) {
          if ('user_answer' in item) {
            if (item.user_answer === null || item.user_answer === undefined || isAnswerEmpty(item.user_answer)) {
              delete existingAnswers[item.question_id];
            } else {
              existingAnswers[item.question_id] = item.user_answer;
            }
          }
          if (typeof item.is_marked === 'boolean') {
            if (item.is_marked) {
              existingMarkedQuestions[item.question_id] = true;
            } else {
              delete existingMarkedQuestions[item.question_id];
            }
          }
        }
        setAnswers(existingAnswers);
        setMarkedQuestions(existingMarkedQuestions);
        setActiveQuestionIndex(0);
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error('开始答题失败:', error);
        showApiError(error, '开始答题失败');
        navigate(-1);
      }
    };

    void start();
    return () => {
      cancelled = true;
      if (!submissionLoadedRef.current) {
        startAttemptKeyRef.current = null;
      }
    };
  }, [assignmentId, navigate, quizId, restoreDraft, setActiveQuestionIndex, startQuizMutation]);

  const handleAnswerChange = (questionId: number, value: string | string[]) => {
    if (!submission || isSubmitBusy) {
      return;
    }

    const shouldDelete = value === '' || (Array.isArray(value) && value.length === 0);
    setAnswers((prev) => {
      if (shouldDelete) {
        const nextAnswers = { ...prev };
        delete nextAnswers[questionId];
        return nextAnswers;
      }
      return { ...prev, [questionId]: value };
    });

    queueAnswerUpdate(questionId, { user_answer: isAnswerEmpty(value) ? null : value });
  };

  const handleSubmitConfirm = async () => {
    if (!submission || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    const acquired = await beginSubmit();
    if (!acquired) {
      setIsSubmitting(false);
      return;
    }

    const allAnswers: SaveAnswerRequest[] = submission.answers.map((item) => {
      const answerValue = answers[item.question];
      return {
        question_id: item.question,
        user_answer: isAnswerEmpty(answerValue) ? null : answerValue,
        is_marked: Boolean(markedQuestions[item.question]),
      };
    });

    try {
      await submitMutation({ submissionId: submission.id, answers: allAnswers });
      finishSubmit(submission.id);
      toast.success('提交成功');
      setShowSubmitDialog(false);
      navigate(ROUTES.TASKS);
    } catch (error) {
      cancelSubmit();
      setIsSubmitting(false);
      console.error('提交答卷失败:', error);
      showApiError(error, '提交失败，答案已保留在本地，请重试');
    }
  };

  const handleAbandonConfirm = async () => {
    if (isAbandonPending) return;
    setIsAbandonPending(true);
    try {
      const saved = await flushPending({ skipUnmountFlush: true });
      if (saved) {
        setShowAbandonDialog(false);
        navigate(ROUTES.TASKS);
      }
    } finally {
      setIsAbandonPending(false);
    }
  };

  const handleToggleMark = (questionId: number) => {
    if (isSubmitBusy) {
      return;
    }
    const nextMarked = !markedQuestions[questionId];
    setMarkedQuestions((prev) => {
      const next = { ...prev };
      if (nextMarked) {
        next[questionId] = true;
      } else {
        delete next[questionId];
      }
      return next;
    });

    queueAnswerUpdate(questionId, { is_marked: nextMarked });
  };

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
  const markedCount = Object.keys(markedQuestions).length;
  const progressPercent = totalQuestions === 0
    ? 0
    : Math.round((answeredCount / totalQuestions) * 100);
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <PageShell className="min-h-0 flex-1 gap-4 pb-4">
      <PageWorkbench className="gap-0">
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)_320px] 2xl:grid-cols-[344px_minmax(0,1fr)_344px]">
          <div className="min-h-0 xl:h-full">
            <QuizProgressPanel
              submission={submission}
              sections={questionSections}
              answers={answers}
              markedQuestions={markedQuestions}
              answeredCount={answeredCount}
              markedCount={markedCount}
              progressPercent={progressPercent}
              onJump={scrollToQuestion}
            />
          </div>

          <QuizPlayerMainPanel
            submission={submission}
            sections={questionSections}
            activeQuestionIndex={activeQuestionIndex}
            answers={answers}
            markedQuestions={markedQuestions}
            questionRefs={questionRefs}
            scrollViewportRef={questionViewportRef}
            onAnswerChange={handleAnswerChange}
            onToggleMark={handleToggleMark}
            disabled={isSubmitBusy}
          />

          <div className="min-h-0 xl:h-full">
            <QuizInfoPanel
              submission={submission}
              isSubmitPending={isSubmitBusy}
              onAbandon={() => setShowAbandonDialog(true)}
              onSubmit={() => setShowSubmitDialog(true)}
            />
          </div>
        </div>
      </PageWorkbench>

      <QuizSubmitDialog
        open={showSubmitDialog}
        unansweredCount={unansweredCount}
        allowRetry={submission.allow_retry}
        isPending={isSubmitBusy}
        onOpenChange={setShowSubmitDialog}
        onConfirm={handleSubmitConfirm}
      />

      <QuizAbandonDialog
        open={showAbandonDialog}
        isPending={isAbandonPending}
        onOpenChange={setShowAbandonDialog}
        onConfirm={handleAbandonConfirm}
      />
    </PageShell>
  );
};
