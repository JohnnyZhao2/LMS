import * as React from 'react';
import { BookOpenText, Calendar, Clock3, FileText, Pencil, User } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { Skeleton } from '@/components/ui/skeleton';
import { THREE_PANEL_EDITOR_WORKBENCH_CLASSNAME } from '@/components/ui/editor-layout';
import { GHOST_ACCENT_HOVER_CLASSNAME } from '@/components/ui/interactive-styles';
import { QuestionDocumentBody } from '@/features/questions/components/question-document-core';
import dayjs from '@/lib/dayjs';
import { cn } from '@/lib/utils';
import type { Question } from '@/types/api';

import { useQuizDetail } from '../api/get-quizzes';
import type { InlineQuestionItem, QuizDraftState } from '../types';

import { QuizOutlinePanel } from './quiz-outline-panel';

interface QuizPreviewWorkbenchProps {
  quizId: number;
  quizDraft?: QuizDraftState;
  onEdit?: (quizId: number) => void;
  onPrimaryAction?: (quizId: number) => void;
  primaryActionLabel?: string;
  className?: string;
}

const PANEL_CLASSNAME = 'flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-background';

const quizTypeBadgeVariant = {
  EXAM: 'error' as const,
  PRACTICE: 'info' as const,
};

const questionSectionConfig = [
  { type: 'SINGLE_CHOICE' as const, label: '单选题' },
  { type: 'MULTIPLE_CHOICE' as const, label: '多选题' },
  { type: 'TRUE_FALSE' as const, label: '判断题' },
  { type: 'SHORT_ANSWER' as const, label: '简答题' },
];

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
  primaryActionLabel = '添加到任务',
  className,
}: QuizPreviewWorkbenchProps) {
  const [activeQuestionId, setActiveQuestionId] = React.useState<number | null>(null);
  const questionRefs = React.useRef(new Map<number, HTMLDivElement>());
  const { data: quiz, isLoading, error } = useQuizDetail(quizId);

  const effectiveQuiz = React.useMemo(() => {
    if (!quizDraft) {
      return quiz;
    }

    return {
      ...(quiz ?? {}),
      id: quizId,
      title: quizDraft.title,
      quiz_type: quizDraft.quizType,
      quiz_type_display: quizDraft.quizType === 'EXAM' ? '考试' : '测验',
      duration: quizDraft.duration ?? null,
      pass_score: quizDraft.passScore ?? null,
      questions: quizDraft.items.map((item, index) => ({
        id: index + 1,
        question: item.questionId ?? -(index + 1),
        question_content: item.content,
        question_type: item.questionType,
        question_type_display: item.questionType,
        order: index + 1,
        score: item.score,
        resource_uuid: item.resourceUuid ?? `draft-${index + 1}`,
        version_number: 0,
        is_current: item.isCurrent,
        options: item.options,
        answer: item.answer,
        explanation: item.explanation,
        space_tag: item.spaceTagId ? { id: item.spaceTagId, name: '' } : undefined,
        tags: (item.tagIds ?? []).map((tagId) => ({ id: tagId, name: '' })),
      })),
    };
  }, [quiz, quizDraft, quizId]);

  const orderedQuestions = React.useMemo(
    () => [...(effectiveQuiz?.questions ?? [])].sort((a, b) => a.order - b.order),
    [effectiveQuiz?.questions],
  );

  const previewQuestions = React.useMemo<Question[]>(
    () =>
      orderedQuestions.map((item) => ({
        id: item.question,
        resource_uuid: item.resource_uuid,
        version_number: item.version_number,
        content: item.question_content,
        question_type: item.question_type,
        question_type_display: item.question_type_display,
        options: item.options ?? [],
        answer: item.answer ?? '',
        explanation: item.explanation ?? '',
        score: item.score,
        space_tag: item.space_tag,
        tags: item.tags ?? [],
        is_current: item.is_current,
        created_at: '',
        updated_at: '',
      })),
    [orderedQuestions],
  );

  React.useEffect(() => {
    if (!previewQuestions.length) {
      setActiveQuestionId(null);
      return;
    }

    if (!activeQuestionId || !previewQuestions.some((item) => item.id === activeQuestionId)) {
      setActiveQuestionId(previewQuestions[0].id);
    }
  }, [activeQuestionId, previewQuestions]);

  const isExam = effectiveQuiz?.quiz_type === 'EXAM';

  const previewOutlineItems = React.useMemo<InlineQuestionItem[]>(
    () =>
      orderedQuestions.map((item) => {
        return {
          key: String(item.question),
          questionId: item.question,
          resourceUuid: item.resource_uuid ?? null,
          isCurrent: item.is_current ?? true,
          syncToBank: item.is_current ?? true,
          questionType: item.question_type,
          spaceTagId: item.space_tag?.id ?? null,
          content: item.question_content ?? '',
          options: item.options ?? [],
          answer: item.answer ?? '',
          explanation: item.explanation ?? '',
          showExplanation: Boolean(item.explanation?.trim()),
          score: String(item.score ?? '1'),
          tagIds: item.tags?.map((tag) => tag.id) ?? [],
          saved: true,
        };
      }),
    [orderedQuestions],
  );
  const createdByName = effectiveQuiz?.created_by_name || '未知';
  const updatedByName = effectiveQuiz?.updated_by_name || effectiveQuiz?.created_by_name || '未知';
  const createdAtText = effectiveQuiz?.created_at ? dayjs(effectiveQuiz.created_at).format('YYYY-MM-DD HH:mm') : '';
  const updatedAtText = effectiveQuiz?.updated_at ? dayjs(effectiveQuiz.updated_at).format('YYYY-MM-DD HH:mm') : '';
  const isSameOperator = createdByName === updatedByName;
  const isSameTimestamp = createdAtText === updatedAtText;
  const previewSections = React.useMemo(() => {
    let runningNumber = 1;
    const sections = questionSectionConfig
      .map((section) => {
        const questions = previewQuestions
          .filter((question) => question.question_type === section.type)
          .map((question) => ({
            question,
            number: runningNumber++,
          }));

        return questions.length > 0
          ? {
            ...section,
            questions,
          }
          : null;
      })
      .filter((section): section is {
        type: typeof questionSectionConfig[number]['type'];
        label: string;
        questions: Array<{ question: Question; number: number }>;
      } => section !== null);

    return sections.map((section, index) => ({
      ...section,
      sectionTitle: `第${index + 1}部分：${section.label}`,
    }));
  }, [previewQuestions]);

  React.useEffect(() => {
    if (!activeQuestionId) {
      return;
    }

    const element = questionRefs.current.get(activeQuestionId);
    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activeQuestionId]);

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

  if (error || !effectiveQuiz) {
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
          items={previewOutlineItems}
          activeKey={activeQuestionId === null ? null : String(activeQuestionId)}
          quizType={effectiveQuiz.quiz_type}
          duration={effectiveQuiz.duration ?? undefined}
          passScore={effectiveQuiz.pass_score ? Number(effectiveQuiz.pass_score) : undefined}
          readOnly
          onSelectItem={(key) => setActiveQuestionId(Number(key))}
          onReorderItems={() => undefined}
          onDurationChange={() => undefined}
          onPassScoreChange={() => undefined}
        />
      </aside>

      <section className={PANEL_CLASSNAME}>
        <div className="relative flex h-12 items-center justify-between border-b border-border px-4">
          <div className="relative z-10 flex items-center gap-2">
            <Badge variant={quizTypeBadgeVariant[effectiveQuiz.quiz_type]}>{effectiveQuiz.quiz_type_display}</Badge>
          </div>

          <div className="pointer-events-none absolute left-1/2 top-1/2 w-[clamp(13rem,44%,22rem)] -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="truncate text-[14px] font-semibold text-foreground">{effectiveQuiz.title}</div>
          </div>
          <div className="relative z-10 flex min-w-[72px] justify-end">
            {onEdit ? (
              <Button
                variant="ghost"
                size="sm"
                className={cn('h-8 rounded-lg px-3 text-[12px]', GHOST_ACCENT_HOVER_CLASSNAME)}
                onClick={() => onEdit(effectiveQuiz.id)}
              >
                <Pencil className="h-3.5 w-3.5" />
                编辑
              </Button>
            ) : null}
          </div>
        </div>

        <ScrollContainer className="min-h-0 flex-1 overflow-y-auto">
          {orderedQuestions.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 text-sm text-text-muted">先添加题目，再进行预览。</div>
          ) : (
            <div className="space-y-10 px-8 py-6">
              {previewSections.map((section) => (
                <section key={section.type} className="mx-auto w-full max-w-[860px] space-y-5">
                  <div className="border-b border-border pb-3">
                    <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">{section.sectionTitle}</h3>
                  </div>

                  <div className="space-y-8">
                    {section.questions.map(({ question, number }) => {
                      return (
                        <div
                          key={question.id}
                          ref={(node) => {
                            if (node) {
                              questionRefs.current.set(question.id, node);
                            } else {
                              questionRefs.current.delete(question.id);
                            }
                          }}
                          className="scroll-mt-6 py-1"
                        >
                          <QuestionDocumentBody
                            mode="preview"
                            className="w-full"
                            score={question.score}
                            questionType={question.question_type}
                            content={question.content}
                            options={question.options ?? []}
                            answer={question.answer ?? ''}
                            explanation={question.explanation ?? ''}
                            showExplanation={Boolean(question.explanation?.trim())}
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
                      {effectiveQuiz.duration || 0} 分钟
                    </MetaItem>
                    <MetaItem icon={<BookOpenText className="h-[14px] w-[14px]" />}>
                      {effectiveQuiz.pass_score || 0} 分及格
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
            <Button className="h-9 w-full rounded-lg" onClick={() => onPrimaryAction(effectiveQuiz.id)}>
              <FileText className="h-4 w-4" />
              {primaryActionLabel}
            </Button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
