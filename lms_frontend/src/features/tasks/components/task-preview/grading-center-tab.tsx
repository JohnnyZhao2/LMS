import * as React from 'react';
import {
  ThumbsDown,
  ThumbsUp,
  Check,
  BarChart3,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Input, Skeleton } from '@/components/ui';
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
  if (rate === null || rate === undefined) return 'bg-slate-100 text-slate-500';
  if (rate >= 80) return 'bg-emerald-100 text-emerald-700';
  if (rate >= 60) return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
};

const formatAnswerText = (answer?: string | null) => {
  if (!answer) return <span className="text-slate-400 italic">(未作答)</span>;
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
      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)] h-[calc(100vh-200px)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!quizId) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] text-slate-400 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
        <BarChart3 className="w-12 h-12 mb-3 text-slate-300" />
        <p>请先从左侧选择试卷以开始阅卷</p>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] text-slate-400 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
        <Filter className="w-12 h-12 mb-3 text-slate-300" />
        <p>暂无可分析的题目数据</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-180px)] min-h-[600px]">
      {/* Left Column: Question List */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-[380px] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
      >
        {/* Header/Filter */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex p-1 bg-slate-200/50 rounded-lg">
            {questionFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setQuestionFilter(filter.value)}
                className={cn(
                  'flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-all duration-200',
                  questionFilter === filter.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredQuestions.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm">
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
                  'w-full text-left p-4 rounded-xl transition-all duration-200 border-2 group relative',
                  isActive
                    ? 'border-blue-500/20 bg-blue-50/40'
                    : 'border-transparent bg-white hover:bg-slate-50 hover:border-slate-200'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute left-0 top-4 bottom-4 w-1 bg-blue-500 rounded-r-full"
                  />
                )}
                <div className="flex justify-between items-start mb-2 gap-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                    question.question_type === 'SHORT_ANSWER'
                      ? 'bg-purple-50 text-purple-600 border-purple-100'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  )}>
                    {question.question_type_display}
                  </span>
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold tabular-nums", passRateColor)}>
                    {formatPassRate(question.pass_rate)}
                  </span>
                </div>
                <h3 className={cn(
                  "text-sm font-medium leading-relaxed line-clamp-2 mb-2",
                  isActive ? "text-slate-900" : "text-slate-700"
                )}>
                  {question.question_text}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>分值: {question.max_score}</span>
                  {question.question_type === 'SHORT_ANSWER' && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className="text-blue-500 font-medium">需人工批阅</span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Right Column: Content */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {selectedQuestion ? (
            <motion.div
              key={selectedQuestion.question_id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full"
            >
              {/* Detail Header */}
              <div className="p-6 border-b border-slate-100 bg-white/80 backdrop-blur sticky top-0 z-20">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="bg-slate-900 text-white px-3 py-1 rounded-full text-xs font-bold">
                        {selectedQuestion?.question_type_display || '题目详情'}
                      </span>
                      <span className="text-slate-400 text-sm font-mono">
                        ID: {selectedQuestion?.question_id}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 leading-snug">
                      {selectedQuestion?.question_text}
                    </h2>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">该题平均通过率</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-slate-900 tabular-nums">
                        {formatPassRate(questionDetail?.pass_rate ?? selectedQuestion?.pass_rate)}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedQuestion?.question_analysis && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600 leading-relaxed">
                    <span className="font-semibold text-slate-900 mr-2">解析:</span>
                    {selectedQuestion.question_analysis}
                  </div>
                )}
              </div>

              {/* Content Body */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
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
                          <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-dashed">
                            暂无选项数据
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
                                "group rounded-xl border bg-white overflow-hidden transition-all shadow-sm hover:shadow-md",
                                isCorrect ? "border-emerald-200 ring-1 ring-emerald-100" : "border-slate-200"
                              )}
                            >
                              <div className={cn(
                                "px-4 py-3 flex items-center justify-between border-b relative overflow-hidden",
                                isCorrect ? "bg-emerald-50/50 border-emerald-100" : "bg-slate-50/50 border-slate-100"
                              )}>
                                {/* Progress Bar Background */}
                                <div
                                  className={cn("absolute left-0 top-0 bottom-0 opacity-10 transition-all duration-1000", isCorrect ? "bg-emerald-500" : "bg-slate-500")}
                                  style={{ width: `${percent}%` }}
                                />

                                <div className="flex items-center gap-3 relative z-10">
                                  <span className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm border",
                                    isCorrect
                                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                      : "bg-white text-slate-700 border-slate-200"
                                  )}>
                                    {option.option_key}
                                  </span>
                                  <span className={cn("text-sm font-medium", isCorrect ? "text-emerald-900" : "text-slate-700")}>
                                    {option.option_text}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 relative z-10">
                                  <div className="text-right">
                                    <div className="text-xs text-slate-500 font-medium">
                                      {option.selected_count} 人 ({percent}%)
                                    </div>
                                  </div>
                                  {isCorrect ? (
                                    <Check className="w-5 h-5 text-emerald-500" />
                                  ) : (
                                    <div className="w-5 h-5" /> // spacer
                                  )}
                                </div>
                              </div>

                              {/* Student List */}
                              {option.students.length > 0 ? (
                                <div className="p-4 bg-white grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                  {option.students.map(student => (
                                    <div key={student.student_id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0">
                                        {student.student_name.slice(0, 1)}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-semibold text-slate-700 truncate">{student.student_name}</div>
                                        <div className="text-slate-400 truncate scale-90 origin-left">{student.department || '学员'}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="px-4 py-3 text-xs text-slate-400 italic">无人选择此项</div>
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
                          <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-dashed">
                            暂无学员回答
                          </div>
                        )}
                        {questionDetail?.subjective_answers?.map((answer) => (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            key={answer.student_id}
                            className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                          >
                            <div className="flex flex-col md:flex-row">
                              {/* Student Info */}
                              <div className="p-5 md:w-48 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100 flex md:flex-col items-center md:items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                                  {answer.student_name.slice(0, 1)}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900">{answer.student_name}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">{answer.department || '未分配部门'}</div>
                                  <div className="text-xs text-slate-400 font-mono mt-0.5">{answer.employee_id || '#'}</div>
                                </div>
                              </div>

                              {/* Answer & Grade */}
                              <div className="flex-1 p-5 flex flex-col gap-6">
                                <div className="space-y-2">
                                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">学员回答</span>
                                  <div className="text-slate-800 text-sm leading-relaxed p-4 bg-slate-50/80 rounded-xl border border-slate-100/80">
                                    {formatAnswerText(answer.answer_text)}
                                  </div>
                                </div>

                                <div className="flex items-end justify-between gap-4 pt-4 border-t border-slate-100">
                                  <div className="flex items-center gap-3">
                                    <div className="relative">
                                      <label className="absolute -top-2.5 left-2 px-1 bg-white text-[10px] font-bold text-slate-400 uppercase">得分</label>
                                      <div className="flex items-center">
                                        <Input
                                          type="number"
                                          min={0}
                                          max={selectedQuestion?.max_score || 0}
                                          value={scoresByStudent[answer.student_id] ?? ''}
                                          onChange={(e) => handleScoreChange(answer.student_id, e.target.value)}
                                          onBlur={(e) => commitScore(answer.student_id, e.target.value)}
                                          className="w-24 font-mono text-lg font-bold border-slate-200 focus:ring-blue-500/20"
                                        />
                                        <span className="ml-2 text-sm text-slate-400 font-medium">/ {selectedQuestion?.max_score}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {/* Quick Actions */}
                                    <div className="flex bg-slate-100 rounded-lg p-1">
                                      <button
                                        onClick={() => handleQuickScore(answer.student_id, 1)}
                                        className="p-2 text-emerald-600 hover:bg-white hover:shadow-sm rounded-md transition-all tooltip-trigger"
                                        title="满分"
                                      >
                                        <ThumbsUp className="w-4 h-4" />
                                      </button>
                                      <div className="w-px bg-slate-200 my-1 mx-0.5" />
                                      <button
                                        onClick={() => handleQuickScore(answer.student_id, 0.6)}
                                        className="p-2 text-amber-600 hover:bg-white hover:shadow-sm rounded-md transition-all tooltip-trigger"
                                        title="及格 (60%)"
                                      >
                                        <Check className="w-4 h-4" />
                                      </button>
                                      <div className="w-px bg-slate-200 my-1 mx-0.5" />
                                      <button
                                        onClick={() => handleQuickScore(answer.student_id, 0)}
                                        className="p-2 text-rose-600 hover:bg-white hover:shadow-sm rounded-md transition-all tooltip-trigger"
                                        title="零分"
                                      >
                                        <ThumbsDown className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <BarChart3 className="w-16 h-16 mb-4 text-slate-200" />
              <p>请选择左侧题目进行评阅</p>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
