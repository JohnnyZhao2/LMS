import type { MutableRefObject } from 'react';

import type { SubmissionDetail } from '@/types/submission';

import { QuestionCard } from './question-card';

interface QuizPlayerMainPanelProps {
  submission: SubmissionDetail;
  activeQuestionIndex: number;
  answers: Record<number, unknown>;
  questionRefs: MutableRefObject<Record<number, HTMLElement | null>>;
  scrollViewportRef: MutableRefObject<HTMLDivElement | null>;
  onAnswerChange: (questionId: number, value: unknown) => void;
}

export const QuizPlayerMainPanel: React.FC<QuizPlayerMainPanelProps> = ({
  submission,
  activeQuestionIndex,
  answers,
  questionRefs,
  scrollViewportRef,
  onAnswerChange,
}) => (
  <main className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-background">
    <div className="border-b border-border/70 px-5 pb-4 pt-5">
      <div className="mx-auto flex w-full max-w-[1040px] items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-text-muted">
            作答区
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            第 {activeQuestionIndex + 1} 题
          </h1>
        </div>
        <div className="text-right text-sm text-text-muted">
          共 {submission.answers.length} 题
        </div>
      </div>
    </div>

    <div
      ref={scrollViewportRef}
      className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-4 md:px-5"
    >
      <div className="mx-auto flex w-full min-w-0 max-w-[1040px] flex-col space-y-4">
        {submission.answers.map((answer, index) => (
          <div
            key={answer.question}
            ref={(el) => {
              questionRefs.current[answer.question] = el;
            }}
            className="scroll-mt-4"
          >
            <QuestionCard
              answer={answer}
              userAnswer={answers[answer.question]}
              onAnswerChange={(value) => onAnswerChange(answer.question, value)}
              questionNumber={index + 1}
            />
          </div>
        ))}
      </div>
    </div>
  </main>
);
