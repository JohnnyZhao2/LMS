import * as React from 'react';
import {
  ThumbsDown,
  ThumbsUp,
  Check,
  BarChart3,
  Filter,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/common/user-avatar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';
import type { GradingQuestion, GradingSubjectiveAnswer } from '@/types/task-analytics';
import {
  useGradingAnswers,
  useGradingQuestions,
  useSubmitGrading,
} from '../../api/task-analytics';

interface GradingCenterTabProps {
  taskId?: number;
  quizId?: number | null;
}

type QuestionFilter = 'all' | 'subjective';

const questionFilters: { value: QuestionFilter; label: string }[] = [
  { value: 'all', label: '全部题目' },
  { value: 'subjective', label: '待批阅 (主观题)' },
];

// Utility: Format Percentage
const formatPassRate = (rate?: number | null) => {
  if (rate === null || rate === undefined) return '--';
  return `${rate.toFixed(1)}%`;
};

// Utility: Color helpers based on pass rate
const getPassRateColor = (rate?: number | null) => {
  if (rate === null || rate === undefined) return 'bg-muted text-text-muted border border-border';
  if (rate >= 80) return 'bg-secondary-50 text-secondary-700 border border-secondary-200';
  if (rate >= 60) return 'bg-warning-50 text-warning-700 border border-warning-200';
  return 'bg-destructive-50 text-destructive-700 border border-destructive-200';
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

export const GradingCenterTab: React.FC<GradingCenterTabProps> = ({ taskId, quizId }) => {
  const [questionFilter, setQuestionFilter] = React.useState<QuestionFilter>('all');
  const [selectedQuestionId, setSelectedQuestionId] = React.useState<number | null>(null);
  const [scoresByStudent, setScoresByStudent] = React.useState<Record<number, string>>({});

  const { data: questions, isLoading: questionsLoading } = useGradingQuestions(taskId || 0, quizId ?? null, {
    enabled: Boolean(taskId) && Boolean(quizId),
  });
  const { data: questionDetail, isLoading: detailLoading } = useGradingAnswers(
    taskId || 0,
    selectedQuestionId,
    quizId ?? null,
    { enabled: Boolean(taskId) && Boolean(selectedQuestionId) && Boolean(quizId) }
  );
  const submitGrading = useSubmitGrading(taskId || 0);

  const filteredQuestions = React.useMemo(() => {
    if (!questions) return [];
    if (questionFilter === 'subjective') {
      return questions.filter((question) => question.question_type === 'SHORT_ANSWER');
    }
    return questions;
  }, [questions, questionFilter]);

  React.useEffect(() => {
    if (filteredQuestions.length === 0) {
      setSelectedQuestionId(null);
      return;
    }
    const stillExists = filteredQuestions.some((question) => question.question_id === selectedQuestionId);
    if (!selectedQuestionId || !stillExists) {
      setSelectedQuestionId(filteredQuestions[0].question_id);
    }
  }, [filteredQuestions, selectedQuestionId]);

  React.useEffect(() => {
    if (questionDetail?.subjective_answers) {
      setScoresByStudent(buildScoreMap(questionDetail.subjective_answers));
      return;
    }
    setScoresByStudent({});
  }, [questionDetail]);

  const selectedQuestion = React.useMemo<GradingQuestion | undefined>(
    () => questions?.find((question) => question.question_id === selectedQuestionId),
    [questions, selectedQuestionId]
  );

  const sortedOptions = React.useMemo(() => {
    if (!questionDetail?.options) return [];
    return [...questionDetail.options].sort((a, b) => Number(b.is_correct) - Number(a.is_correct));
  }, [questionDetail]);

  const totalAnswersCount = React.useMemo(() => {
    if (!sortedOptions) return 0;
    return sortedOptions.reduce((acc, opt) => acc + opt.students.length, 0);
  }, [sortedOptions]);

  const handleScoreChange = (studentId: number, value: string) => {
    setScoresByStudent((prev) => ({ ...prev, [studentId]: value }));
  };

  const commitScore = async (studentId: number, rawScore: string) => {
    if (!selectedQuestion || selectedQuestionId === null || rawScore === '' || !quizId) return;
    const parsedScore = Number(rawScore);
    if (Number.isNaN(parsedScore)) return;
    const normalizedScore = Math.min(Math.max(parsedScore, 0), selectedQuestion.max_score);

    // Optimistic update
    setScoresByStudent((prev) => ({ ...prev, [studentId]: normalizedScore.toString() }));

    try {
      await submitGrading.mutateAsync({
        quiz_id: quizId,
        question_id: selectedQuestionId,
        student_id: studentId,
        score: normalizedScore,
        comments: '',
      });
    } catch {
      toast.error('评分保存失败，请重试');
    }
  };

  const handleQuickScore = async (studentId: number, ratio: number) => {
    if (!selectedQuestion) return;
    const score = Math.round(selectedQuestion.max_score * ratio * 10) / 10;
    const formattedScore = score.toString();
    setScoresByStudent((prev) => ({ ...prev, [studentId]: formattedScore }));
    await commitScore(studentId, formattedScore);
  };

  if (questionsLoading) {
    return (
      <div className="grid h-full min-h-0 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="flex min-h-0 h-full flex-col rounded-2xl border border-border bg-background p-4 space-y-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="flex-1 space-y-2 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        </div>
        <div className="flex min-h-0 h-full flex-col rounded-2xl border border-border bg-background p-6 space-y-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!quizId) {
    return (
      <div className="flex h-full min-h-[36rem] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-muted text-text-muted">
        <BarChart3 className="w-12 h-12 mb-3 text-text-muted" />
        <p>请先从左侧选择试卷以开始阅卷</p>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="flex h-full min-h-[36rem] flex-col rounded-3xl border border-dashed border-border bg-muted">
        <EmptyState
          icon={Filter}
          description="暂无可分析的题目数据"
        />
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      {/* Left Column: Question List */}
      <div className="flex min-h-0 h-full flex-col overflow-hidden rounded-2xl border border-border bg-background">
        {/* Header/Filter */}
        <div className="p-4 border-b border-border bg-muted">
          <SegmentedControl
            value={questionFilter}
            onChange={(value) => setQuestionFilter(value as QuestionFilter)}
            options={questionFilters}
            activeColor="white"
          />
        </div>

        {/* List */}
        <ScrollContainer className="min-h-0 flex-1 overflow-y-auto p-3 space-y-2">
          {filteredQuestions.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-text-muted text-sm">
              <p>没有找到相关题目</p>
            </div>
          )}
          {filteredQuestions.map((question) => {
            const isActive = question.question_id === selectedQuestionId;
            const passRateColor = getPassRateColor(question.pass_rate);

            return (
              <button
                key={question.question_id}
                onClick={() => setSelectedQuestionId(question.question_id)}
                className={cn(
                  'w-full text-left p-4 rounded-xl transition-all duration-200 border group relative mb-3',
                  isActive
                    ? 'border-primary-200 bg-primary-50/60  ring-1 ring-primary-100'
                    : 'border-transparent bg-background hover:bg-muted hover:border-border'
                )}
              >
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                      question.question_type === 'SHORT_ANSWER'
                        ? 'bg-primary-50 text-primary-600 border-primary-100'
                        : 'bg-background text-text-muted border-border'
                    )}>
                      {question.question_type_display}
                    </span>
                    {question.question_type === 'SHORT_ANSWER' && (
                      <span className="text-[10px] font-medium text-warning-600 bg-warning-50 px-1.5 py-0.5 rounded border border-warning-100">
                        人工
                      </span>
                    )}
                  </div>
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums", passRateColor)}>
                    {formatPassRate(question.pass_rate)}
                  </span>
                </div>
                <h3 className={cn(
                  "text-sm font-medium leading-relaxed line-clamp-2 mb-3",
                  isActive ? "text-foreground" : "text-foreground"
                )}>
                  {question.question_text}
                </h3>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span className="font-medium bg-muted px-2 py-1 rounded">分值: {question.max_score}</span>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />}
                </div>
              </button>
            );
          })}
        </ScrollContainer>
      </div>

      {/* Right Column: Content */}
      <div className="flex min-h-0 h-full flex-col overflow-hidden rounded-2xl border border-border bg-background">
        {selectedQuestion ? (
          <div className="flex min-h-0 flex-1 flex-col">
              {/* Detail Header */}
              <div className="p-6 border-b border-border bg-background backdrop-blur sticky top-0 z-20">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="bg-foreground text-background px-3 py-1 rounded-full text-xs font-bold">
                        {selectedQuestion?.question_type_display || '题目详情'}
                      </span>
                      <span className="text-text-muted text-sm font-mono">
                        ID: {selectedQuestion?.question_id}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-foreground leading-snug">
                      {selectedQuestion?.question_text}
                    </h2>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-text-muted uppercase font-semibold tracking-wider">该题平均通过率</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground tabular-nums">
                        {formatPassRate(questionDetail?.pass_rate ?? selectedQuestion?.pass_rate)}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedQuestion?.question_analysis && (
                  <div className="mt-4 p-4 bg-muted rounded-xl border border-border text-sm text-text-muted leading-relaxed">
                    <span className="font-semibold text-foreground mr-2">解析:</span>
                    {selectedQuestion.question_analysis}
                  </div>
                )}
              </div>

              {/* Content Body */}
              <ScrollContainer className="flex-1 overflow-y-auto bg-muted p-6">
                {detailLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                  </div>
                ) : (
                  <>
                    {/* OBJECTIVE QUESTIONS */}
                    {selectedQuestion?.question_type !== 'SHORT_ANSWER' && (
                      <div className="space-y-4 max-w-3xl mx-auto">
                        {sortedOptions.length === 0 && (
                          <div className="bg-background rounded-2xl border border-dashed">
                            <EmptyState
                              description="暂无选项数据"
                              iconSize="sm"
                            />
                          </div>
                        )}
                        {sortedOptions.map((option) => {
                          const isCorrect = option.is_correct;
                          const percent = totalAnswersCount > 0
                            ? Math.round((option.students.length / totalAnswersCount) * 100)
                            : 0;

                          return (
                            <div
                              key={option.option_key}
                              className={cn(
                                "group rounded-xl border bg-background overflow-hidden transition-all",
                                isCorrect ? "border-secondary-200 ring-1 ring-secondary-100" : "border-border"
                              )}
                            >
                              <div className={cn(
                                "relative px-4 py-3 flex items-center justify-between gap-4 overflow-hidden",
                                isCorrect ? "bg-secondary-50/30" : "bg-background"
                              )}>
                                {/* Progress Bar Background - Subtler */}
                                <div
                                  className={cn(
                                    "absolute left-0 top-0 bottom-0 transition-all duration-1000 mix-blend-multiply",
                                    isCorrect ? "bg-secondary-50" : "bg-muted"
                                  )}
                                  style={{ width: `${percent}%` }}
                                />

                                <div className="flex items-center gap-3 relative z-10 flex-1">
                                  <span className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm border  shrink-0",
                                    isCorrect
                                      ? "bg-secondary-100 text-secondary-700 border-secondary-200"
                                      : "bg-background text-text-muted border-border"
                                  )}>
                                    {option.option_key}
                                  </span>
                                  <span className={cn(
                                    "text-sm font-medium leading-relaxed",
                                    isCorrect ? "text-secondary-900" : "text-foreground"
                                  )}>
                                    {option.option_text}
                                  </span>
                                </div>

                                <div className="flex items-center gap-4 relative z-10 shrink-0">
                                  <div className="flex flex-col items-end">
                                    <span className="text-sm font-bold text-foreground tabular-nums">
                                      {option.selected_count} <span className="text-xs font-normal text-text-muted">人</span>
                                    </span>
                                    <span className="text-[10px] text-text-muted font-medium tabular-nums">{percent}%</span>
                                  </div>
                                  {isCorrect && (
                                    <div className="w-8 h-8 rounded-full bg-secondary-100 flex items-center justify-center text-secondary-600">
                                      <Check className="w-5 h-5" />
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Student List */}
                              {option.students.length > 0 ? (
                                <div className="p-3 bg-muted border-t border-border/50 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                  {option.students.map(student => (
                                    <div key={student.student_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-background border border-transparent hover:border-border transition-colors text-xs">
                                      <UserAvatar
                                        avatarKey={student.avatar_key}
                                        name={student.student_name}
                                        size="sm"
                                        className="h-5 w-5 shrink-0"
                                      />
                                      <div className="min-w-0">
                                        <div className="font-medium text-foreground truncate">{student.student_name}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="px-4 py-2 bg-muted border-t border-border text-xs text-text-muted italic flex items-center gap-2">
                                  <Users className="w-3 h-3 text-text-muted" />
                                  <span>无人选择此项</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* SUBJECTIVE QUESTIONS */}
                    {selectedQuestion?.question_type === 'SHORT_ANSWER' && (
                      <div className="space-y-4 max-w-4xl mx-auto">
                        {questionDetail?.subjective_answers?.length === 0 && (
                          <div className="text-center py-12 text-text-muted bg-background rounded-2xl border border-dashed">
                            暂无学员回答
                          </div>
                        )}
                        {questionDetail?.subjective_answers?.map((answer) => (
                          <div
                            key={answer.student_id}
                            className="rounded-xl border border-border bg-background overflow-hidden mb-4 group"
                          >
                            {/* Header: Student Info + Score */}
                            <div className="flex items-center justify-between p-4 bg-muted border-b border-border">
                              <div className="flex items-center gap-3">
                                <UserAvatar
                                  avatarKey={answer.avatar_key}
                                  name={answer.student_name}
                                  size="md"
                                  className="h-9 w-9"
                                />
                                <div>
                                  <div className="font-bold text-foreground text-sm flex items-center gap-2">
                                    {answer.student_name}
                                    <span className="font-normal text-xs text-text-muted font-mono px-1.5 py-0.5 bg-background border border-border rounded-full">
                                      {answer.department || '学员'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="flex items-center">
                                  <span className="mr-2 text-xs font-bold text-text-muted uppercase">得分</span>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={selectedQuestion?.max_score || 0}
                                    value={scoresByStudent[answer.student_id] ?? ''}
                                    onChange={(e) => handleScoreChange(answer.student_id, e.target.value)}
                                    onBlur={(e) => commitScore(answer.student_id, e.target.value)}
                                    className="w-20 h-9 font-mono text-base font-bold border-border focus:border-primary focus:ring-1 focus:ring-primary/20 text-right pr-2 bg-background"
                                  />
                                  <span className="ml-2 text-sm text-text-muted font-medium select-none">/ {selectedQuestion?.max_score}</span>
                                </div>
                              </div>
                            </div>

                            {/* Body */}
                            <div className="p-5">
                              <div className="space-y-3">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">学员回答</span>
                                  <div className="text-foreground text-sm leading-relaxed p-4 bg-muted rounded-xl border border-dashed border-border min-h-[80px]">
                                    {formatAnswerText(answer.answer_text)}
                                  </div>
                                </div>

                                {/* Quick Actions Footer */}
                                <div className="flex justify-end pt-2">
                                  <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
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
