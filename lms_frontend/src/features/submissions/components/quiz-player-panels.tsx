import { Calendar, Clock3, FileText, Send, Target, Trophy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import dayjs from '@/lib/dayjs';
import { cn } from '@/lib/utils';
import type { SubmissionDetail } from '@/types/api';

import { Timer } from './timer';

interface QuizProgressPanelProps {
  submission: SubmissionDetail;
  answers: Record<number, unknown>;
  answeredCount: number;
  progressPercent: number;
  activeQuestionIndex: number;
  isExam: boolean;
  onJump: (index: number) => void;
}

interface QuizInfoPanelProps {
  submission: SubmissionDetail;
  isSubmitPending: boolean;
  onSubmit: () => void;
  onTimeUp: () => void;
}

export const isAnswerEmpty = (value: unknown) =>
  value === null ||
  value === undefined ||
  value === '' ||
  (Array.isArray(value) && value.length === 0);

const InfoSectionLabel: React.FC<{ label: string }> = ({ label }) => (
  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted">
    {label}
  </p>
);

const MetaItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className="flex items-start gap-2 text-[12px] text-text-muted">
    <div className="mt-[1px] shrink-0 text-text-muted">
      {icon}
    </div>
    <div className="min-w-0">
      <span>{label}：</span>
      <span className="break-words text-foreground">{value}</span>
    </div>
  </div>
);

export const QuizProgressPanel: React.FC<QuizProgressPanelProps> = ({
  submission,
  answers,
  answeredCount,
  progressPercent,
  activeQuestionIndex,
  isExam,
  onJump,
}) => (
  <aside className="flex min-h-0 max-h-full flex-col overflow-hidden rounded-2xl border border-border bg-background p-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
          答题进度
        </p>
        <div className="mt-2 flex items-end gap-2">
          <span
            className={cn(
              'text-3xl font-semibold leading-none tracking-tight',
              isExam ? 'text-destructive-600' : 'text-primary',
            )}
          >
            {progressPercent}%
          </span>
          <span className="pb-0.5 text-sm text-text-muted">
            {answeredCount}/{submission.answers.length}
          </span>
        </div>
      </div>
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-2xl',
          isExam ? 'bg-destructive-50 text-destructive-600' : 'bg-primary-50 text-primary',
        )}
      >
        <Target className="h-4.5 w-4.5" />
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

    <div className="mt-4 grid grid-cols-2 gap-3">
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
    </div>

    <Separator className="my-5 bg-border/70" />

    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
          题号导航
        </p>
        <span className="text-xs text-text-muted">点击跳转</span>
      </div>

      <div className="scrollbar-subtle mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-4 gap-2">
          {submission.answers.map((item, index) => {
            const answered = !isAnswerEmpty(answers[item.question]);
            const active = index === activeQuestionIndex;

            return (
              <button
                key={item.question}
                type="button"
                onClick={() => onJump(index)}
                className={cn(
                  'flex h-10 items-center justify-center rounded-2xl border text-sm font-semibold transition-all duration-200',
                  active && answered && isExam && 'border-destructive-500 bg-destructive-500 text-white',
                  active && answered && !isExam && 'border-primary bg-primary text-white',
                  active && !answered && 'border-foreground bg-foreground text-background',
                  !active && answered && 'border-secondary-300 bg-secondary-50 text-secondary-700 hover:border-secondary-400',
                  !active && !answered && 'border-border bg-muted/65 text-text-muted hover:border-muted-foreground/25 hover:text-foreground',
                )}
                aria-label={`跳转到第 ${index + 1} 题`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  </aside>
);

export const QuizInfoPanel: React.FC<QuizInfoPanelProps> = ({
  submission,
  isSubmitPending,
  onSubmit,
  onTimeUp,
}) => {
  const isExam = submission.quiz_type === 'EXAM';

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-background">
    <div className="border-b border-border/70 bg-muted/45 px-5 pb-4 pt-5">
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
            {submission.quiz_type_display} · 第 {submission.attempt_number} 次
          </p>
        </div>
      </div>

      {isExam && submission.remaining_seconds != null ? (
        <div className="mt-4">
          <Timer remainingSeconds={submission.remaining_seconds} onTimeUp={onTimeUp} />
        </div>
      ) : null}
    </div>

    <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto px-5 py-[18px]">
      <div className="flex h-full flex-col">
        <section className="mb-[18px]">
          <InfoSectionLabel label="所属任务" />
          <p className="mt-[10px] text-sm font-semibold leading-6 text-foreground">
            {submission.task_title}
          </p>
        </section>

        <section className="mb-[18px]">
          <InfoSectionLabel label="详细信息" />
          <div className="mt-[10px] flex flex-col gap-2">
            <MetaItem
              label="开始时间"
              value={dayjs(submission.started_at).format('YYYY-MM-DD HH:mm')}
              icon={<Calendar className="h-[14px] w-[14px]" />}
            />
            <MetaItem
              label="试卷时长"
              value={submission.quiz_duration ? `${submission.quiz_duration} 分钟` : '不限时'}
              icon={<Clock3 className="h-[14px] w-[14px]" />}
            />
            <MetaItem
              label="总分 / 及格"
              value={`${submission.total_score} / ${submission.pass_score}`}
              icon={<Trophy className="h-[14px] w-[14px]" />}
            />
          </div>
        </section>

        <div className="flex-1" />
      </div>
    </div>

    <div className="relative px-5 pb-4 pt-[14px]">
      <Button
        size="lg"
        variant={isExam ? 'destructive' : 'default'}
        onClick={onSubmit}
        disabled={isSubmitPending}
        className="h-11 w-full rounded-2xl font-semibold"
      >
        <Send className="mr-2 h-4 w-4" />
        {isSubmitPending ? '提交中...' : '提交答卷'}
      </Button>
      <p className="mt-3 text-xs leading-5 text-text-muted">
        {isExam ? '考试提交后不可重新作答。' : '提交后将结束本次作答。'}
      </p>
    </div>
  </aside>
  );
};
