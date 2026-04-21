import * as React from 'react';
import {
  FileCheck,
  ListTodo,
  ThumbsDown,
  ThumbsUp,
  Check,
  BarChart3,
  Filter,
} from 'lucide-react';
import { UserAvatar } from '@/entities/user/components/user-avatar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QUESTION_TYPE_CONFIG } from '@/entities/question/constants';
import { QuestionTypeBadge } from '@/entities/question/components/question-type-badge';
import { buildQuestionSections } from '@/entities/question/question-sections';
import { formatScore } from '@/lib/score';
import { showApiError } from '@/utils/error-handler';
import { cn } from '@/lib/utils';
import type { QuestionType } from '@/types/common';
import type { GradingAnswerResponse, GradingQuestion, GradingSubjectiveAnswer } from '@/types/task-analytics';
import type { PendingTask, PendingQuiz } from '@/entities/grading/api/pending-quizzes';
import {
  useGradingAnswers,
  useGradingQuestions,
  useSubmitGrading,
} from '@/entities/grading/api/task-analytics';

interface GradingCenterTabProps {
  taskId?: number;
  quizId?: number | null;
  selectorConfig?: GradingCenterSelectorConfig;
}

type QuestionFilter = QuestionType | null;

export interface GradingCenterSelectorConfig {
  tasks: PendingTask[];
  selectedTaskId: number | null;
  selectedQuizId: number | null;
  selectedTaskTitle: string;
  isTaskLocked?: boolean;
  onTaskSelect: (task: PendingTask) => void;
  onQuizSelect: (quiz: PendingQuiz) => void;
}

const questionFilterTypes: QuestionType[] = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'];

const questionFilters: { value: QuestionType; label: string }[] = questionFilterTypes.map((type) => ({
  value: type,
  label: QUESTION_TYPE_CONFIG[type].label,
}));

// Utility: Format Percentage
const formatPassRate = (rate?: number | null) => {
  if (rate === null || rate === undefined) return '--';
  return `${rate.toFixed(1)}%`;
};

// Utility: Text color helpers based on pass rate
const getPassRateColor = (rate?: number | null) => {
  if (rate === null || rate === undefined) return 'text-text-muted';
  if (rate >= 80) return 'text-secondary-700';
  if (rate >= 60) return 'text-warning-700';
  return 'text-destructive-700';
};

const formatAnswerText = (answer?: string | null) => {
  if (!answer) return <span className="text-text-muted italic">(未作答)</span>;
  return answer;
};

const buildScoreMap = (answers: GradingSubjectiveAnswer[] = []) =>
  answers.reduce<Record<number, string>>((acc, answer) => {
    acc[answer.student_id] = answer.score !== null && answer.score !== undefined ? answer.score.toString() : '';
    return acc;
  }, {});

const SELECTOR_TRIGGER_CLASSNAME = 'h-10 rounded-xl border-border/70 bg-background/90 px-3 shadow-none';
const SELECTOR_ICON_CLASSNAME = 'h-4 w-4 shrink-0 text-primary-500';
const QUESTION_LIST_GRID_CLASSNAME = 'grid grid-cols-[1.25rem_minmax(0,1fr)_4.5rem] items-center gap-x-2';

export const GradingCenterTab: React.FC<GradingCenterTabProps> = ({
  taskId,
  quizId,
  selectorConfig,
}) => {
  const [questionFilter, setQuestionFilter] = React.useState<QuestionFilter>(null);
  const [selectedQuestionId, setSelectedQuestionId] = React.useState<number | null>(null);
  const [displayedQuestionId, setDisplayedQuestionId] = React.useState<number | null>(null);
  const [displayedQuestion, setDisplayedQuestion] = React.useState<GradingQuestion | null>(null);
  const [displayedQuestionDetail, setDisplayedQuestionDetail] = React.useState<GradingAnswerResponse | null>(null);
  const [scoresByStudent, setScoresByStudent] = React.useState<Record<number, string>>({});

  const { data: questions, isLoading: questionsLoading } = useGradingQuestions(taskId || 0, quizId ?? null, {
    enabled: Boolean(taskId) && Boolean(quizId),
  });

  React.useEffect(() => {
    if (!questions || questions.length === 0) {
      return;
    }

    if (questionFilter === null) {
      return;
    }

    const hasCurrentType = questions.some((question) => question.question_type === questionFilter);
    if (hasCurrentType) {
      return;
    }

    setQuestionFilter(null);
  }, [questionFilter, questions]);

  const filteredQuestions = React.useMemo(() => {
    if (!questions) return [];
    if (questionFilter === null) {
      return questions;
    }
    return questions.filter((question) => question.question_type === questionFilter);
  }, [questions, questionFilter]);
  const availableQuestionTypes = React.useMemo(
    () => new Set((questions ?? []).map((question) => question.question_type)),
    [questions],
  );
  const effectiveQuestionId = React.useMemo(() => {
    if (filteredQuestions.length === 0) {
      return null;
    }

    if (selectedQuestionId !== null && filteredQuestions.some((question) => question.question_id === selectedQuestionId)) {
      return selectedQuestionId;
    }

    return filteredQuestions[0].question_id;
  }, [filteredQuestions, selectedQuestionId]);
  const groupedQuestions = React.useMemo(
    () => buildQuestionSections(filteredQuestions, (question) => question.question_type),
    [filteredQuestions],
  );
  const { data: questionDetail, isLoading: detailLoading } = useGradingAnswers(
    taskId || 0,
    effectiveQuestionId,
    quizId ?? null,
    { enabled: Boolean(taskId) && Boolean(effectiveQuestionId) && Boolean(quizId) }
  );
  const submitGrading = useSubmitGrading(taskId || 0);
  const effectiveQuestion = React.useMemo<GradingQuestion | null>(
    () => questions?.find((question) => question.question_id === effectiveQuestionId) ?? null,
    [effectiveQuestionId, questions]
  );

  React.useEffect(() => {
    if (questionDetail && effectiveQuestionId !== null && effectiveQuestion) {
      setDisplayedQuestionId(effectiveQuestionId);
      setDisplayedQuestion(effectiveQuestion);
      setDisplayedQuestionDetail(questionDetail);
    }
  }, [effectiveQuestion, effectiveQuestionId, questionDetail]);

  React.useEffect(() => {
    if (filteredQuestions.length === 0) {
      setDisplayedQuestionId(null);
      setDisplayedQuestion(null);
      setDisplayedQuestionDetail(null);
    }
  }, [filteredQuestions.length]);

  React.useEffect(() => {
    if (displayedQuestionDetail?.subjective_answers) {
      setScoresByStudent(buildScoreMap(displayedQuestionDetail.subjective_answers));
      return;
    }
    setScoresByStudent({});
  }, [displayedQuestionDetail]);

  const shouldHoldPreviousDetail =
    detailLoading
    && displayedQuestionId !== null
    && displayedQuestionDetail !== null
    && displayedQuestionId !== effectiveQuestionId;
  const selectedQuestion = React.useMemo<GradingQuestion | undefined>(() => {
    if (shouldHoldPreviousDetail && displayedQuestion) {
      return displayedQuestion;
    }
    return effectiveQuestion ?? displayedQuestion ?? undefined;
  }, [displayedQuestion, effectiveQuestion, shouldHoldPreviousDetail]);
  const activeQuestionDetail = React.useMemo(() => {
    if (shouldHoldPreviousDetail) {
      return displayedQuestionDetail;
    }
    if (questionDetail) {
      return questionDetail;
    }
    if (displayedQuestionId !== null && displayedQuestionId === effectiveQuestionId) {
      return displayedQuestionDetail;
    }
    return null;
  }, [displayedQuestionDetail, displayedQuestionId, effectiveQuestionId, questionDetail, shouldHoldPreviousDetail]);

  const sortedOptions = React.useMemo(() => {
    if (!activeQuestionDetail?.options) return [];
    return [...activeQuestionDetail.options].sort((a, b) => Number(b.is_correct) - Number(a.is_correct));
  }, [activeQuestionDetail]);

  const answeredCount = activeQuestionDetail?.answered_count ?? 0;

  const handleScoreChange = (studentId: number, value: string) => {
    setScoresByStudent((prev) => ({ ...prev, [studentId]: value }));
  };

  const commitScore = async (studentId: number, rawScore: string) => {
    if (!selectedQuestion || effectiveQuestionId === null || rawScore === '' || !quizId) return;
    const parsedScore = Number(rawScore);
    if (Number.isNaN(parsedScore)) return;
    const normalizedScore = Math.min(Math.max(parsedScore, 0), selectedQuestion.max_score);

    // Optimistic update
    setScoresByStudent((prev) => ({ ...prev, [studentId]: normalizedScore.toString() }));

    try {
      await submitGrading.mutateAsync({
        quiz_id: quizId,
        question_id: effectiveQuestionId,
        student_id: studentId,
        score: normalizedScore,
        comments: '',
      });
    } catch (error) {
      showApiError(error, '评分保存失败，请重试');
    }
  };

  const handleQuickScore = async (studentId: number, ratio: number) => {
    if (!selectedQuestion) return;
    const score = Math.round(selectedQuestion.max_score * ratio * 10) / 10;
    const formattedScore = score.toString();
    setScoresByStudent((prev) => ({ ...prev, [studentId]: formattedScore }));
    await commitScore(studentId, formattedScore);
  };

  if (questionsLoading && !questions) {
    return (
      <div className="grid h-full min-h-0 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="flex min-h-0 h-full flex-col rounded-2xl border border-border bg-background p-4 space-y-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="flex-1 space-y-2 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        </div>
        <div className="flex min-h-0 h-full flex-col rounded-2xl border border-border bg-background p-6 space-y-6">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!quizId) {
    return (
      <div className="flex h-full min-h-[36rem] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted text-text-muted">
        <BarChart3 className="w-12 h-12 mb-3 text-text-muted" />
        <p>请先从左侧选择试卷以开始阅卷</p>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="flex h-full min-h-[36rem] flex-col rounded-2xl border border-dashed border-border bg-muted">
        <EmptyState
          icon={Filter}
          description="暂无可分析的题目数据"
        />
      </div>
    );
  }

  const selectedTask = selectorConfig?.tasks.find((task) => task.task_id === selectorConfig.selectedTaskId) ?? null;
  const selectedQuiz =
    selectedTask?.quizzes.find((quiz) => quiz.quiz_id === selectorConfig?.selectedQuizId) ?? null;
  const activeFilterMeta = questionFilter ? QUESTION_TYPE_CONFIG[questionFilter] : null;
  return (
    <div className="grid h-full min-h-0 gap-4 lg:gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      {/* Left Column: Question List */}
      <div className="flex min-h-0 h-full flex-col overflow-hidden rounded-2xl border border-border bg-background">
        <div className="border-b border-border bg-background p-3 sm:p-4">
          {selectorConfig ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="min-w-0">
                {selectorConfig.isTaskLocked ? (
                  <div className="flex h-10 min-w-0 items-center gap-2 overflow-hidden rounded-xl border border-primary-100 bg-primary-50/70 px-3">
                    <ListTodo className={SELECTOR_ICON_CLASSNAME} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
                      {selectorConfig.selectedTaskTitle}
                    </span>
                    <span className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-primary-700">
                      锁定
                    </span>
                  </div>
                ) : (
                  <Select
                    value={selectorConfig.selectedTaskId ? String(selectorConfig.selectedTaskId) : undefined}
                    onValueChange={(value) => {
                      const nextTask = selectorConfig.tasks.find((task) => task.task_id === Number(value));
                      if (nextTask) {
                        selectorConfig.onTaskSelect(nextTask);
                      }
                    }}
                  >
                    <SelectTrigger className={SELECTOR_TRIGGER_CLASSNAME}>
                      <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
                        <ListTodo className={SELECTOR_ICON_CLASSNAME} />
                        <SelectValue className="block min-w-0 flex-1 truncate text-left" placeholder="选择任务" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {selectorConfig.tasks.map((task) => (
                        <SelectItem key={task.task_id} value={String(task.task_id)}>
                          {task.task_title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="min-w-0">
                <Select
                  value={selectedQuiz ? String(selectedQuiz.quiz_id) : undefined}
                  onValueChange={(value) => {
                    const nextQuiz = selectedTask?.quizzes.find((quiz) => quiz.quiz_id === Number(value));
                    if (nextQuiz) {
                      selectorConfig.onQuizSelect(nextQuiz);
                    }
                  }}
                  disabled={!selectedTask || selectedTask.quizzes.length === 0}
                >
                  <SelectTrigger className={SELECTOR_TRIGGER_CLASSNAME}>
                    <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
                      <FileCheck className={SELECTOR_ICON_CLASSNAME} />
                      <SelectValue className="block min-w-0 flex-1 truncate text-left" placeholder="选择试卷" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedTask?.quizzes ?? []).map((quiz) => (
                      <SelectItem key={quiz.quiz_id} value={String(quiz.quiz_id)}>
                        {quiz.quiz_title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
        </div>

        <div className="bg-background px-3 py-3 sm:px-4">
          <SegmentedControl
            value={questionFilter}
            onChange={(value) => setQuestionFilter(value as QuestionType)}
            onClear={() => setQuestionFilter(null)}
            options={questionFilters.map((filter) => ({
              ...filter,
              disabled: filter.value ? !availableQuestionTypes.has(filter.value) : false,
            }))}
            className="w-full"
            size="default"
            fill
            allowDeselect
            showClearOnSelected
            inactiveOptionClassName="text-foreground hover:text-foreground"
            disabledOptionClassName="cursor-not-allowed text-text-muted"
          />
          {activeFilterMeta ? (
            <span className="mt-1.5 block text-[12px] font-medium text-text-muted">
              当前筛选: {activeFilterMeta.fullLabel}
            </span>
          ) : null}
        </div>

        <ScrollContainer className="min-h-0 flex-1 overflow-y-auto">
          {filteredQuestions.length === 0 && (
            <div className="flex h-40 flex-col items-center justify-center px-4 text-sm text-text-muted">
              <p>没有找到相关题目</p>
            </div>
          )}
          <div className="space-y-4 px-3 py-4 sm:px-4">
            {groupedQuestions.map((section) => (
              <div key={section.type} className="space-y-2">
                <div className={cn('mx-1.5', QUESTION_LIST_GRID_CLASSNAME)}>
                  <div className="col-span-2 min-w-0">
                    <QuestionTypeBadge type={section.type} variant="plain" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  {section.entries.map(({ item: question, number }) => {
                    const isActive = question.question_id === effectiveQuestionId;
                    const passRateColor = getPassRateColor(question.pass_rate);

                    return (
                      <button
                        key={question.question_id}
                        onClick={() => setSelectedQuestionId(question.question_id)}
                        className={cn(
                          'group relative w-full rounded-lg border px-3 py-2.5 text-left transition-all duration-200',
                          QUESTION_LIST_GRID_CLASSNAME,
                          isActive
                            ? 'border-primary-200 bg-primary-50/60 ring-1 ring-primary-100'
                            : 'border-transparent bg-background hover:border-primary-200 hover:bg-primary-50/40'
                        )}
                      >
                        <span className="text-left text-[13px] font-medium leading-5 tabular-nums text-text-muted">
                          {number}
                        </span>
                        <h3 className="min-w-0 line-clamp-2 text-[13px] font-medium leading-5 text-foreground">
                          {question.question_text}
                        </h3>
                        <span className={cn('w-[4.5rem] justify-self-end text-right text-[11px] font-semibold leading-5 tabular-nums', passRateColor)}>
                          {formatPassRate(question.pass_rate)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollContainer>
      </div>

      {/* Right Column: Content */}
      <div className="flex min-h-0 h-full flex-col overflow-hidden rounded-2xl border border-border bg-background">
        {selectedQuestion ? (
          <div className="flex min-h-0 flex-1 flex-col">
              {/* Detail Header */}
              <div className="sticky top-0 z-20 border-b border-border bg-background p-4 backdrop-blur sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2.5 sm:gap-3">
                      <span className="bg-foreground text-background px-3 py-1 rounded-full text-xs font-bold">
                        {selectedQuestion?.question_type_display || '题目详情'}
                      </span>
                      <span className="text-sm font-medium text-text-muted">
                        分值: {formatScore(selectedQuestion?.max_score)}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold leading-snug text-foreground break-words">
                      {selectedQuestion?.question_text}
                    </h2>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                    <span className="text-xs text-text-muted uppercase font-semibold tracking-wider">该题平均通过率</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground tabular-nums">
                        {formatPassRate(activeQuestionDetail?.pass_rate ?? selectedQuestion?.pass_rate)}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedQuestion?.question_analysis && (
                  <div className="mt-4 rounded-xl border border-border bg-background p-3 text-sm leading-relaxed text-text-muted sm:p-4">
                    <span className="font-semibold text-foreground mr-2">解析:</span>
                    {selectedQuestion.question_analysis}
                  </div>
                )}
              </div>

              {/* Content Body */}
              <ScrollContainer className="flex-1 overflow-y-auto bg-background p-4 sm:p-6">
                {!activeQuestionDetail && detailLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                  </div>
                ) : (
                  <>
                    {/* OBJECTIVE QUESTIONS */}
                    {selectedQuestion?.question_type !== 'SHORT_ANSWER' && (
                      <div className="relative mx-auto max-w-3xl space-y-4">
                        {sortedOptions.length === 0 && (
                          <div className="bg-background rounded-xl border border-dashed">
                            <EmptyState
                              description="暂无选项数据"
                              iconSize="sm"
                            />
                          </div>
                        )}
                        {sortedOptions.map((option) => {
                          const isCorrect = option.is_correct;
                          const percent = answeredCount > 0
                            ? Math.round((option.selected_count / answeredCount) * 100)
                            : 0;

                          const previewStudents = option.students.slice(0, 5);

                          return (
                            <div
                              key={option.option_key}
                              className={cn(
                                'group relative rounded-xl px-4 py-5 transition-all',
                                isCorrect
                                  ? 'border border-secondary-300 bg-background ring-1 ring-secondary-100'
                                  : 'border border-transparent bg-transparent',
                              )}
                            >
                              {isCorrect ? (
                                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary-200/70">
                                  <Check className="h-12 w-12" strokeWidth={2.5} />
                                </div>
                              ) : null}

                              <div className="flex items-start gap-4">
                                <div className="min-w-0 flex flex-1 items-start">
                                  <span
                                    className={cn(
                                      'min-w-0 flex-1 text-sm font-medium leading-relaxed',
                                      isCorrect ? 'text-secondary-900' : 'text-foreground',
                                    )}
                                  >
                                    {option.option_text}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={cn(
                                    'h-full',
                                    isCorrect ? 'bg-secondary-500' : 'bg-slate-400',
                                  )}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>

                              <div className="mt-5 flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center">
                                  {previewStudents.map((student, index) => (
                                    <UserAvatar
                                      key={student.student_id}
                                      avatarKey={student.avatar_key}
                                      name={student.student_name}
                                      size="sm"
                                      className={cn(
                                        'h-7 w-7 border-2 border-background shadow-sm',
                                        index > 0 && '-ml-2.5',
                                      )}
                                    />
                                  ))}
                                </div>
                                <div className="shrink-0 text-xs font-medium tabular-nums text-text-muted">
                                  <span>共 {option.selected_count} 人</span>
                                  <span className="mx-2 text-text-muted/60">|</span>
                                  <span>{percent}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* SUBJECTIVE QUESTIONS */}
                    {selectedQuestion?.question_type === 'SHORT_ANSWER' && (
                      <div className="relative mx-auto max-w-4xl space-y-4">
                        {activeQuestionDetail?.subjective_answers?.length === 0 && (
                          <div className="text-center py-12 text-text-muted bg-background rounded-xl border border-dashed">
                            暂无学员回答
                          </div>
                        )}
                        {activeQuestionDetail?.subjective_answers?.map((answer) => (
                          <div
                            key={answer.student_id}
                            className="rounded-xl border border-border bg-background overflow-hidden mb-4 group"
                          >
                            {/* Header: Student Info + Score */}
                            <div className="flex flex-col gap-3 border-b border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex min-w-0 items-center gap-3">
                                <UserAvatar
                                  avatarKey={answer.avatar_key}
                                  name={answer.student_name}
                                  size="md"
                                  className="h-9 w-9"
                                />
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-foreground">
                                    {answer.student_name}
                                    <span className="font-normal text-xs text-text-muted font-mono px-1.5 py-0.5 bg-background border border-border rounded-full">
                                      {answer.department || '学员'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start">
                                <div className="flex items-center">
                                  <span className="mr-2 text-xs font-bold text-text-muted uppercase">得分</span>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={selectedQuestion?.max_score || 0}
                                    value={scoresByStudent[answer.student_id] ?? ''}
                                    onChange={(e) => handleScoreChange(answer.student_id, e.target.value)}
                                    onBlur={(e) => commitScore(answer.student_id, e.target.value)}
                                    className="h-9 w-16 border-border bg-background pr-2 text-right font-mono text-base font-bold focus:border-primary focus:ring-1 focus:ring-primary/20 sm:w-20"
                                  />
                                  <span className="ml-2 text-sm text-text-muted font-medium select-none">/ {formatScore(selectedQuestion?.max_score)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Body */}
                            <div className="p-4 sm:p-5">
                              <div className="space-y-3">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">学员回答</span>
                                  <div className="min-h-[80px] rounded-xl border border-dashed border-border bg-background p-4 text-sm leading-relaxed text-foreground">
                                    {formatAnswerText(answer.answer_text)}
                                  </div>
                                </div>

                                {/* Quick Actions Footer */}
                                <div className="flex justify-start pt-2 sm:justify-end">
                                  <div className="flex flex-wrap gap-2 opacity-100 transition-opacity sm:opacity-50 sm:group-hover:opacity-100">
                                    <button onClick={() => handleQuickScore(answer.student_id, 1)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary-50 text-secondary-700 hover:bg-secondary-100 transition-colors border border-secondary-100">
                                      <ThumbsUp className="w-3.5 h-3.5" /> 满分
                                    </button>
                                    <button onClick={() => handleQuickScore(answer.student_id, 0.6)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-warning-50 text-warning-700 hover:bg-warning-100 transition-colors border border-warning-100">
                                      <Check className="w-3.5 h-3.5" /> 及格
                                    </button>
                                    <button onClick={() => handleQuickScore(answer.student_id, 0)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive-50 text-destructive-700 hover:bg-destructive-100 transition-colors border border-destructive-100">
                                      <ThumbsDown className="w-3.5 h-3.5" /> 零分
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </ScrollContainer>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-text-muted">
            <BarChart3 className="w-16 h-16 mb-4 text-muted" />
            <p>请选择左侧题目进行评阅</p>
          </div>
        )}
      </div>
    </div>
  );
};
