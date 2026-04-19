import { QuestionTypeBadge } from '@/entities/question/components/question-type-badge';
import type { QuestionSection, QuestionSectionEntry } from '@/entities/question/question-sections';
import type { MutableRefObject } from 'react';

import type { SubmissionDetail } from '@/types/submission';

import { QuestionCard } from './question-card';

interface QuizPlayerMainPanelProps {
  submission: SubmissionDetail;
  sections: QuestionSection<SubmissionDetail['answers'][number]>[];
  displayEntries: QuestionSectionEntry<SubmissionDetail['answers'][number]>[];
  activeQuestionIndex: number;
  answers: Record<number, unknown>;
  markedQuestions: Record<number, boolean>;
  questionRefs: MutableRefObject<Record<number, HTMLElement | null>>;
  scrollViewportRef: MutableRefObject<HTMLDivElement | null>;
  onAnswerChange: (questionId: number, value: unknown) => void;
  onToggleMark: (questionId: number) => void;
}

export const QuizPlayerMainPanel: React.FC<QuizPlayerMainPanelProps> = ({
  submission,
  sections,
  activeQuestionIndex,
  answers,
  markedQuestions,
  questionRefs,
  scrollViewportRef,
  onAnswerChange,
  onToggleMark,
}) => {
  return (
    <main className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-background">
      <div className="border-b border-border/70 px-6 pb-4 pt-5 xl:px-8">
        <div className="mx-auto flex w-full max-w-[980px] items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-text-muted">
              作答区
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
                第 {activeQuestionIndex + 1} 题
              </h1>
            </div>
          </div>
          <div className="text-right text-sm text-text-muted">
            共 {submission.answers.length} 题
          </div>
        </div>
      </div>

      <div
        ref={scrollViewportRef}
        className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-5 md:px-7 xl:px-8"
      >
        <div className="mx-auto flex w-full min-w-0 max-w-[980px] flex-col space-y-8">
          {sections.map((section, sectionIndex) => (
            <section key={`${section.type}-${sectionIndex}`} className="space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-2">
                <SectionHeader sectionType={section.type} sectionIndex={sectionIndex} />
                <span className="shrink-0 text-[12px] font-medium tabular-nums text-text-muted">
                  {section.entries.length} 题
                </span>
              </div>

              <div className="space-y-5">
                {section.entries.map(({ item: answer, number }) => (
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
                      isMarked={Boolean(markedQuestions[answer.question])}
                      onAnswerChange={(value) => onAnswerChange(answer.question, value)}
                      onToggleMark={() => onToggleMark(answer.question)}
                      questionNumber={number}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
};

const SectionHeader: React.FC<{
  sectionType: QuestionSection<SubmissionDetail['answers'][number]>['type'];
  sectionIndex: number;
}> = ({ sectionType }) => <QuestionTypeBadge type={sectionType} />;
