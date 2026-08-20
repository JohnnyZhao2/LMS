import * as React from 'react';
import { BookOpenText, Calendar, Clock3, FileText, Pencil, User } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { Skeleton } from '@/components/ui/skeleton';
import { THREE_PANEL_EDITOR_WORKBENCH_CLASSNAME } from '@/components/ui/editor-layout';
import { GHOST_ACCENT_HOVER_CLASSNAME } from '@/components/ui/interactive-styles';
import { QuestionDocumentReadMode } from '@/components/questions/question-document-read-mode';
import type { EditableQuestionItem } from '@/lib/question-editor';
import { QuestionTypeBadge } from '@/components/questions/question-type-badge';
import { buildQuestionSections } from '@/lib/question-sections';
import { formatListDateTime } from '@/lib/date-time';
import { formatScore } from '@/lib/score';
import { cn } from '@/lib/utils';
import { useQuizDetail } from '@/features/quizzes/api/get-quizzes';
import type { QuizDraftState } from '@/features/quizzes/types';

import { QuizOutlinePanel } from '@/components/quizzes/quiz-outline-panel';
import { buildQuizEditableItem } from './quiz-form.helpers';

interface QuizPreviewWorkbenchProps {
  quizId: number;
  quizDraft?: QuizDraftState;
  onEdit?: (quizId: number) => void;
  onPrimaryAction?: (quizId: number) => void;
  className?: string;
}

const PANEL_CLASSNAME = 'flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background';

const quizTypeBadgeVariant = {
  EXAM: 'error' as const,
  PRACTICE: 'info' as const,
};

function MetaItem({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-text-muted">
      <span className="shrink-0 text-text-muted">{icon}</span>
      <span className="min-w-0 truncate">{children}</span>
    </div>
  );
}

export function QuizPreviewWorkbench({
  quizId,
  quizDraft,
  onEdit,
  onPrimaryAction,
  className,
}: QuizPreviewWorkbenchProps) {
  const [selectedQuestionKey, setSelectedQuestionKey] = React.useState<string | null>(null);
  const questionRefs = React.useRef(new Map<string, HTMLDivElement>());
  const { data: quiz, isLoading, error } = useQuizDetail(quizId);

  const previewItems = React.useMemo<EditableQuestionItem[]>(() => {
    if (quizDraft) return quizDraft.items;

    return [...(quiz?.questions ?? [])]
      .sort((a, b) => a.order - b.order)
      .map(buildQuizEditableItem);
  }, [quiz?.questions, quizDraft]);

  const activeQuestionKey = selectedQuestionKey && previewItems.some((item) => item.key === selectedQuestionKey)
    ? selectedQuestionKey
    : previewItems[0]?.key ?? null;

  const quizType = quizDraft?.quizType ?? quiz?.quiz_type ?? 'PRACTICE';
  const isExam = quizType === 'EXAM';
  const createdByName = quiz?.created_by_name || '未知';
  const updatedByName = quiz?.updated_by_name || quiz?.created_by_name || '未知';
  const createdAtText = formatListDateTime(quiz?.created_at);
  const updatedAtText = formatListDateTime(quiz?.updated_at);
  const isSameOperator = createdByName === updatedByName;
  const isSameTimestamp = createdAtText === updatedAtText;
  const previewSections = React.useMemo(
    () => buildQuestionSections(previewItems, (question) => question.questionType),
    [previewItems],
  );

  React.useEffect(() => {
    if (!activeQuestionKey) {
      return;
    }

    const element = questionRefs.current.get(activeQuestionKey);
    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activeQuestionKey]);

  if (!quizDraft && isLoading) {
    return (
      <div className={cn(THREE_PANEL_EDITOR_WORKBENCH_CLASSNAME, className)}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className={PANEL_CLASSNAME}>
            <Skeleton className="h-12 w-full rounded-none" />
            <div className="space-y-3 p-5">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || (!quizDraft && !quiz)) {
    return (
      <div className={cn(THREE_PANEL_EDITOR_WORKBENCH_CLASSNAME, className)}>
        <div className={cn(PANEL_CLASSNAME, 'col-span-full items-center justify-center px-6 text-sm text-text-muted')}>
          试卷预览加载失败
        </div>
      </div>
    );
  }

  return (
    <div className={cn(THREE_PANEL_EDITOR_WORKBENCH_CLASSNAME, className)}>
      <aside className={PANEL_CLASSNAME}>
        <QuizOutlinePanel
          items={previewItems}
          activeKey={activeQuestionKey}
          quizType={quizType}
          itemDisplayMode="plain"
          duration={quizDraft?.duration ?? quiz?.duration ?? undefined}
          passScore={quizDraft?.passScore ?? (quiz?.pass_score ? Number(quiz.pass_score) : undefined)}
          readOnly
          onSelectItem={setSelectedQuestionKey}
        />
      </aside>

      <section className={PANEL_CLASSNAME}>
        <div className="relative flex h-12 items-center justify-between border-b border-border px-4">
          <div className="relative z-10 flex items-center gap-2">
            <Badge variant={quizTypeBadgeVariant[quizType]}>{quizType === 'EXAM' ? '考试' : '测验'}</Badge>
          </div>

          <div className="pointer-events-none absolute left-1/2 top-1/2 w-[clamp(13rem,44%,22rem)] -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="truncate text-[14px] font-semibold text-foreground">{quizDraft?.title ?? quiz?.title}</div>
          </div>
          <div className="relative z-10 flex min-w-[72px] justify-end">
            {onEdit ? (
              <Button
                variant="ghost"
                size="sm"
                className={cn('h-8 rounded-lg px-3 text-[12px]', GHOST_ACCENT_HOVER_CLASSNAME)}
                onClick={() => onEdit(quizId)}
              >
                <Pencil className="h-3.5 w-3.5" />
                编辑
              </Button>
            ) : null}
          </div>
        </div>

        <ScrollContainer className="min-h-0 flex-1 overflow-y-auto">
          {previewItems.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 text-sm text-text-muted">先添加题目，再进行预览。</div>
          ) : (
            <div className="space-y-10 px-8 py-6">
              {previewSections.map((section) => (
                <section key={section.type} className="mx-auto w-full max-w-[860px] space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
                    <QuestionTypeBadge type={section.type} variant="plain" />
                    <span className="shrink-0 text-[11px] font-medium text-text-muted">{section.entries.length} 题</span>
                  </div>

                  <div className="space-y-8">
                    {section.entries.map(({ item: question, number }) => {
                      return (
                        <div
                          key={question.key}
                          ref={(node) => {
                            if (node) {
                              questionRefs.current.set(question.key, node);
                            } else {
                              questionRefs.current.delete(question.key);
                            }
                          }}
                          className="scroll-mt-6 py-1"
                        >
                          <QuestionDocumentReadMode
                            mode="preview"
                            className="w-full"
                            score={question.score}
                            questionType={question.questionType}
                            content={question.content}
                            options={question.options}
                            answer={question.answer}
                            explanation={question.explanation}
                            showExplanation={question.showExplanation}
                            questionNumber={number}
                          />
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </ScrollContainer>
      </section>

      <aside className={PANEL_CLASSNAME}>
        <div className="flex h-12 items-center border-b border-border px-4 text-[13px] font-semibold text-foreground">
          <span>试卷信息</span>
        </div>

        <ScrollContainer className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-5 py-[18px]">
            <div>
              <p className="mb-[10px] text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted">详细信息</p>
              <div className="flex flex-col gap-2">
                {isExam ? (
                  <>
                    <MetaItem icon={<Clock3 className="h-[14px] w-[14px]" />}>
                      参考时间 {quizDraft?.duration ?? quiz?.duration ?? 0} 分钟
                    </MetaItem>
                    <MetaItem icon={<BookOpenText className="h-[14px] w-[14px]" />}>
                      {formatScore(quizDraft?.passScore ?? quiz?.pass_score) || '0'} 分及格
                    </MetaItem>
                  </>
                ) : null}
                {isSameOperator ? (
                  <MetaItem icon={<User className="h-[14px] w-[14px]" />}>
                    {createdByName}
                  </MetaItem>
                ) : (
                  <>
                    <MetaItem icon={<User className="h-[14px] w-[14px]" />}>
                      创建人 {createdByName}
                    </MetaItem>
                    <MetaItem icon={<User className="h-[14px] w-[14px]" />}>
                      更新人 {updatedByName}
                    </MetaItem>
                  </>
                )}
                {isSameTimestamp ? (
                  <MetaItem icon={<Calendar className="h-[14px] w-[14px]" />}>
                    {createdAtText}
                  </MetaItem>
                ) : (
                  <>
                    <MetaItem icon={<Calendar className="h-[14px] w-[14px]" />}>
                      创建于 {createdAtText}
                    </MetaItem>
                    <MetaItem icon={<Calendar className="h-[14px] w-[14px]" />}>
                      更新于 {updatedAtText}
                    </MetaItem>
                  </>
                )}
              </div>
            </div>
          </div>
        </ScrollContainer>

        {onPrimaryAction ? (
          <div className="border-t border-border px-4 py-4">
            <Button className="h-9 w-full rounded-lg" onClick={() => onPrimaryAction(quizId)}>
              <FileText className="h-4 w-4" />
              添加到任务
            </Button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
