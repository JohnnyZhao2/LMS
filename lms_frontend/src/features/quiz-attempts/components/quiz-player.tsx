import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ROUTES } from '@/config/routes';
import { useStartQuiz, useSubmitQuiz } from '../api/start-quiz';
import { useSaveAnswer } from '../api/save-answer';
import { PageShell, PageWorkbench } from '@/components/ui/page-shell';
import { Spinner } from '@/components/ui/spinner';
import { buildQuestionSections } from '@/lib/question-sections';
import { showApiError } from '@/utils/error-handler';
import type { SubmissionDetail } from '@/features/quiz-attempts/types';

import { QuizAbandonDialog, QuizSubmitDialog } from './quiz-player-dialogs';
import { QuizPlayerMainPanel } from './quiz-player-main-panel';
import { QuizInfoPanel, QuizProgressPanel } from './quiz-player-panels';
import { isAnswerEmpty } from './quiz-player-utils';

const QUESTION_SCROLL_OFFSET = 16;
const SHORT_ANSWER_SAVE_DELAY_MS = 1000;

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
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const questionRefs = useRef<Record<number, HTMLElement | null>>({});
  const questionViewportRef = useRef<HTMLDivElement | null>(null);
  const lockedQuestionIndexRef = useRef<number | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const releaseProgrammaticScrollFrameRef = useRef<number | null>(null);

  const { mutateAsync: startQuizMutation } = useStartQuiz();
  const { mutateAsync: saveAnswerMutation } = useSaveAnswer();
  const { mutateAsync: submitMutation, isPending: isSubmitPending } = useSubmitQuiz();

  const startAttemptKeyRef = useRef<string | null>(null);
  const submissionIdRef = useRef<number | null>(null);
  const saveAnswerRef = useRef(saveAnswerMutation);
  const textsRef = useRef(new Map<number, {
    draft: string;
    saved?: string;
    timer?: number;
    pending?: Promise<void>;
  }>());
  const flushAllTextRef = useRef<() => Promise<void>>(async () => undefined);
  saveAnswerRef.current = saveAnswerMutation;
  submissionIdRef.current = submission?.id ?? null;

  const scheduleProgrammaticScrollRelease = () => {
    if (releaseProgrammaticScrollFrameRef.current !== null) {
      cancelAnimationFrame(releaseProgrammaticScrollFrameRef.current);
    }
    releaseProgrammaticScrollFrameRef.current = requestAnimationFrame(() => {
      releaseProgrammaticScrollFrameRef.current = requestAnimationFrame(() => {
        isProgrammaticScrollRef.current = false;
        lockedQuestionIndexRef.current = null;
        releaseProgrammaticScrollFrameRef.current = null;
      });
    });
  };

  useEffect(() => {
    const key = `${assignmentId}-${quizId}`;
    if (startAttemptKeyRef.current === key) {
      return;
    }

    const start = async () => {
      try {
        const result = await startQuizMutation({ assignmentId, quizId });
        setSubmission(result);

        const existingAnswers: Record<number, string | string[]> = {};
        const existingMarkedQuestions: Record<number, boolean> = {};
        textsRef.current.forEach((slot) => {
          if (slot.timer) window.clearTimeout(slot.timer);
        });
        textsRef.current.clear();
        result.answers.forEach((a) => {
          if (a.user_answer !== null && a.user_answer !== undefined) {
            existingAnswers[a.question] = a.user_answer;
          }
          if (a.question_type === 'SHORT_ANSWER' && typeof a.user_answer === 'string') {
            textsRef.current.set(a.question, { draft: a.user_answer, saved: a.user_answer });
          }
          if (a.is_marked) {
            existingMarkedQuestions[a.question] = true;
          }
        });
        setAnswers(existingAnswers);
        setMarkedQuestions(existingMarkedQuestions);
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

  const flushText = (questionId: number): Promise<void> => {
    const slot = textsRef.current.get(questionId);
    if (!slot) return Promise.resolve();
    if (slot.timer) {
      window.clearTimeout(slot.timer);
      slot.timer = undefined;
    }
    if (slot.pending) return slot.pending;

    const submissionId = submissionIdRef.current;
    if (submissionId === null || slot.draft === slot.saved) return Promise.resolve();

    const value = slot.draft;
    const pending = (async () => {
      try {
        await saveAnswerRef.current({
          submissionId,
          data: { question_id: questionId, user_answer: value },
        });
        slot.saved = value;
      } catch (error) {
        console.error('保存答案失败:', error);
        throw error;
      } finally {
        slot.pending = undefined;
      }
      if (slot.draft !== value) await flushText(questionId);
    })();
    slot.pending = pending;
    return pending;
  };

  const flushAllText = () => Promise.all(
    [...textsRef.current.keys()].map((questionId) => flushText(questionId)),
  ).then(() => undefined);
  flushAllTextRef.current = flushAllText;

  useEffect(() => {
    const flush = () => {
      void flushAllTextRef.current();
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, []);

  const scheduleText = (questionId: number, value: string) => {
    const slot = textsRef.current.get(questionId) ?? { draft: value };
    slot.draft = value;
    if (slot.timer) window.clearTimeout(slot.timer);
    slot.timer = window.setTimeout(() => {
      slot.timer = undefined;
      void flushText(questionId).catch((error) => {
        showApiError(error, '答案未保存');
      });
    }, SHORT_ANSWER_SAVE_DELAY_MS);
    textsRef.current.set(questionId, slot);
  };

  const handleAnswerChange = (questionId: number, value: string | string[]) => {
    if (!submission) {
      return;
    }

    const isEmpty = isAnswerEmpty(value);

    setAnswers((prev) => {
      if (isEmpty) {
        const nextAnswers = { ...prev };
        delete nextAnswers[questionId];
        return nextAnswers;
      }
      return { ...prev, [questionId]: value };
    });

    const questionType = submission.answers.find((item) => item.question === questionId)?.question_type;
    if (questionType === 'SHORT_ANSWER' && typeof value === 'string') {
      scheduleText(questionId, value);
      return;
    }

    const submissionId = submissionIdRef.current;
    if (!submissionId) {
      return;
    }
    void saveAnswerMutation({
      submissionId,
      data: { question_id: questionId, user_answer: value },
    }).catch((error) => {
      console.error('保存答案失败:', error);
    });
  };

  const handleAnswerBlur = (questionId: number) => {
    void flushText(questionId).catch((error) => {
      showApiError(error, '答案未保存');
    });
  };

  const handleSubmitConfirm = async () => {
    const submissionId = submissionIdRef.current;
    if (!submissionId) {
      return;
    }
    try {
      await flushAllText();
    } catch (error) {
      console.error('保存答案失败:', error);
      showApiError(error, '答案未保存');
      return;
    }
    try {
      await submitMutation(submissionId);
      toast.success('提交成功');
      setShowSubmitDialog(false);
      navigate(ROUTES.TASKS);
    } catch (error) {
      console.error('提交答卷失败:', error);
      showApiError(error, '提交失败');
    }
  };

  const handleAbandonConfirm = () => {
    void flushAllText().finally(() => {
      setShowAbandonDialog(false);
      navigate(ROUTES.TASKS);
    });
  };

  const handleToggleMark = async (questionId: number) => {
    const submissionId = submissionIdRef.current;
    if (!submissionId) {
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

    try {
      await saveAnswerMutation({
        submissionId,
        data: { question_id: questionId, is_marked: nextMarked },
      });
    } catch (error) {
      setMarkedQuestions((prev) => {
        const next = { ...prev };
        if (nextMarked) {
          delete next[questionId];
        } else {
          next[questionId] = true;
        }
        return next;
      });
      showApiError(error, nextMarked ? '标记题目失败' : '取消标记失败');
    }
  };

  const scrollToQuestion = (index: number) => {
    const questionId = submission
      ? buildQuestionSections(submission.answers, (answer) => answer.question_type)
        .flatMap((section) => section.entries)[index]?.item.question
      : undefined;
    const viewport = questionViewportRef.current;
    const questionNode = questionId ? questionRefs.current[questionId] : null;
    if (!questionId || !questionNode || !viewport) {
      return;
    }

    if (releaseProgrammaticScrollFrameRef.current !== null) {
      cancelAnimationFrame(releaseProgrammaticScrollFrameRef.current);
      releaseProgrammaticScrollFrameRef.current = null;
    }

    isProgrammaticScrollRef.current = true;
    lockedQuestionIndexRef.current = index;
    setActiveQuestionIndex(index);

    const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    const viewportTop = viewport.getBoundingClientRect().top;
    const questionTop = questionNode.getBoundingClientRect().top;
    const relativeTop = questionTop - viewportTop;
    const targetTop = Math.min(
      Math.max(0, viewport.scrollTop + relativeTop - QUESTION_SCROLL_OFFSET),
      maxScrollTop,
    );

    viewport.scrollTo({ top: targetTop });
    scheduleProgrammaticScrollRelease();
  };

  useEffect(() => {
    if (!submission) {
      return;
    }

    const displayEntries = buildQuestionSections(submission.answers, (answer) => answer.question_type)
      .flatMap((section) => section.entries);

    const observer = new IntersectionObserver(
      (entries) => {
        if (lockedQuestionIndexRef.current !== null) {
          return;
        }

        const topEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => {
            const rootTop = a.rootBounds?.top ?? 0;
            return Math.abs(a.boundingClientRect.top - rootTop) - Math.abs(b.boundingClientRect.top - rootTop);
          })[0];

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

    displayEntries.forEach(({ item: answer, number }) => {
      const node = questionRefs.current[answer.question];
      if (!node) {
        return;
      }
      node.dataset.questionIndex = String(number - 1);
      observer.observe(node);
    });

    return () => observer.disconnect();
  }, [submission]);

  useEffect(() => {
    const viewport = questionViewportRef.current;
    if (!viewport) {
      return;
    }

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) {
        return;
      }
      lockedQuestionIndexRef.current = null;
    };

    viewport.addEventListener('scroll', handleScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [submission]);

  useEffect(() => () => {
    if (releaseProgrammaticScrollFrameRef.current !== null) {
      cancelAnimationFrame(releaseProgrammaticScrollFrameRef.current);
    }
  }, []);

  if (!submission) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  const questionSections = buildQuestionSections(submission.answers, (answer) => answer.question_type);
  const displayQuestionEntries = questionSections.flatMap((section) => section.entries);
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
            displayEntries={displayQuestionEntries}
            activeQuestionIndex={activeQuestionIndex}
            answers={answers}
            markedQuestions={markedQuestions}
            questionRefs={questionRefs}
            scrollViewportRef={questionViewportRef}
            onAnswerChange={handleAnswerChange}
            onAnswerBlur={handleAnswerBlur}
            onToggleMark={handleToggleMark}
          />

          <div className="min-h-0 xl:h-full">
            <QuizInfoPanel
              submission={submission}
              isSubmitPending={isSubmitPending}
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
        isPending={isSubmitPending}
        onOpenChange={setShowSubmitDialog}
        onConfirm={handleSubmitConfirm}
      />

      <QuizAbandonDialog
        open={showAbandonDialog}
        onOpenChange={setShowAbandonDialog}
        onConfirm={handleAbandonConfirm}
      />
    </PageShell>
  );
};
