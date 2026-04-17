import { FileText, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { QuestionTypeBadge } from '@/features/questions/components/question-type-badge';
import dayjs from '@/lib/dayjs';
import { formatScore } from '@/lib/score';
import { cn } from '@/lib/utils';
import type { QuestionSection } from '@/features/questions/question-sections';
import type { SubmissionDetail } from '@/types/submission';

import { Timer } from './timer';
import { isAnswerEmpty } from './quiz-player-utils';

interface QuizProgressPanelProps {
  submission: SubmissionDetail;
  sections: QuestionSection<SubmissionDetail['answers'][number]>[];
  answers: Record<number, unknown>;
  markedQuestions: Record<number, boolean>;
  answeredCount: number;
  markedCount: number;
  progressPercent: number;
  isExam: boolean;
  onJump: (index: number) => void;
}

interface QuizInfoPanelProps {
  submission: SubmissionDetail;
  isSubmitPending: boolean;
  onAbandon: () => void;
  onSubmit: () => void;
}

const InfoSectionLabel: React.FC<{ label: string }> = ({ label }) => (
  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted">
    {label}
  </p>
);

const MetaItem: React.FC<{
  label: string;
  value: string;
}> = ({ label, value }) => (
  <div className="text-[12px] text-text-muted">
    <span>{label}：</span>
    <span className="break-words text-foreground">{value}</span>
  </div>
);

export const QuizProgressPanel: React.FC<QuizProgressPanelProps> = ({
  submission,
  sections,
  answers,
  markedQuestions,
  answeredCount,
  markedCount,
  progressPercent,
  isExam,
  onJump,
}) => (
  <aside className="flex min-h-0 max-h-full flex-col overflow-hidden rounded-2xl border border-border bg-background p-5">
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
        答题进度
      </p>
      <div className="mt-2">
        <span
          className={cn(
            'text-3xl font-semibold leading-none tracking-tight',
            isExam ? 'text-destructive-600' : 'text-primary',
          )}
        >
          {progressPercent}%
        </span>
      </div>
    </div>

    <div className="mt-4">
      <Progress
        percent={progressPercent}
        size="lg"
        strokeColor={isExam ? 'var(--color-error-500)' : 'var(--color-primary-500)'}
        trailColor="var(--color-gray-200)"
      />
    </div>

    <div className="mt-4 grid grid-cols-3 gap-2.5">
      <div className="rounded-2xl bg-muted/70 px-3 py-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
          已完成
        </div>
        <div className="mt-1 text-lg font-semibold text-foreground">{answeredCount}</div>
      </div>
      <div className="rounded-2xl bg-muted/70 px-3 py-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
          未作答
        </div>
        <div className="mt-1 text-lg font-semibold text-foreground">
          {submission.answers.length - answeredCount}
        </div>
      </div>
      <div className="rounded-2xl bg-muted/70 px-3 py-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
          已标记
        </div>
        <div className="mt-1 text-lg font-semibold text-foreground">{markedCount}</div>
      </div>
    </div>

    <Separator className="my-5 bg-border/70" />

    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
          题号导航
        </p>
      </div>

      <div className="scrollbar-subtle mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-5">
          {sections.map((section, sectionIndex) => (
            <div key={`${section.type}-${sectionIndex}`} className="space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-2">
                <div className="min-w-0">
                  <SectionHeader sectionType={section.type} sectionIndex={sectionIndex} />
                </div>
                <span className="shrink-0 text-[12px] font-medium tabular-nums text-text-muted">
                  {section.entries.length} 题
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {section.entries.map(({ item, number }) => {
                  const answered = !isAnswerEmpty(answers[item.question]);
                  const marked = Boolean(markedQuestions[item.question]);

                  return (
                    <button
                      key={item.question}
                      type="button"
                      onClick={() => onJump(number - 1)}
                      className={cn(
                        'relative flex h-10 w-10 items-center justify-center rounded-[12px] border text-[13px] font-semibold tabular-nums transition-[border-color,background-color,color,box-shadow] duration-200',
                        answered
                          ? 'border-secondary-400 bg-secondary-50/72 text-secondary-700 hover:border-secondary-500'
                          : 'border-border/90 bg-background text-text-muted hover:border-foreground/16 hover:text-foreground/78',
                      )}
                      aria-label={`跳转到第 ${number} 题`}
                    >
                      {marked ? (
                        <span
                          className="absolute right-2 top-2 h-1 w-1 rounded-full bg-amber-400"
                          aria-hidden="true"
                        />
                      ) : null}
                      {number}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </aside>
);

const SectionHeader: React.FC<{
  sectionType: QuestionSection<SubmissionDetail['answers'][number]>['type'];
  sectionIndex: number;
}> = ({ sectionType }) => <QuestionTypeBadge type={sectionType} />;

export const QuizInfoPanel: React.FC<QuizInfoPanelProps> = ({
  submission,
  isSubmitPending,
  onAbandon,
  onSubmit,
}) => {
  const isExam = submission.quiz_type === 'EXAM';

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-background p-5">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white',
            isExam ? 'bg-destructive' : 'bg-primary',
          )}
        >
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-base font-semibold leading-6 text-foreground">
            {submission.quiz_title}
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            {isExam ? submission.quiz_type_display : `${submission.quiz_type_display} · 第 ${submission.attempt_number} 次`}
          </p>
        </div>
      </div>

      {isExam && submission.remaining_seconds != null ? (
        <div className="mt-4">
          <Timer
            key={`${submission.id}-${submission.remaining_seconds}`}
            remainingSeconds={submission.remaining_seconds}
          />
        </div>
      ) : null}

      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto py-[18px]">
        <div className="flex h-full flex-col">
          <section className="mb-[18px]">
            <InfoSectionLabel label="详细信息" />
            <div className="mt-[10px] flex flex-col gap-2">
              <MetaItem
                label="所属任务"
                value={submission.task_title}
              />
              <MetaItem
                label="开始时间"
                value={dayjs(submission.started_at).format('YYYY-MM-DD HH:mm')}
              />
              <MetaItem
                label="总分"
                value={formatScore(submission.total_score)}
              />
              {isExam ? (
                <MetaItem
                  label="参考时间"
                  value={submission.quiz_duration ? `${submission.quiz_duration} 分钟` : '未设置'}
                />
              ) : null}
              {isExam ? (
                <MetaItem
                  label="及格分"
                  value={formatScore(submission.pass_score)}
                />
              ) : null}
            </div>
          </section>

          <div className="flex-1" />
        </div>
      </div>

      <div className="pt-[14px]">
        <div className="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            variant="outline"
            onClick={onAbandon}
            className="h-11 rounded-full font-semibold shadow-none"
          >
            暂时退出
          </Button>
          <Button
            size="lg"
            variant={isExam ? 'destructive' : 'default'}
            onClick={onSubmit}
            disabled={isSubmitPending}
            className="h-11 rounded-full font-semibold"
          >
            <Send className="mr-2 h-4 w-4" />
            {isSubmitPending ? '提交中...' : '提交答卷'}
          </Button>
        </div>
      </div>
    </aside>
  );
};
