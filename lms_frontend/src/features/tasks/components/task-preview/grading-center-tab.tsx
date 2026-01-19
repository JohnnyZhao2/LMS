import * as React from 'react';
import {
  User,
  CheckCircle,
  Clock,
  Send,
  ChevronRight,
} from 'lucide-react';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Input,
  Skeleton,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { TaskDetail } from '@/types/task';
import {
  useGradingQuestions,
  useGradingAnswers,
  useSubmitGrading,
} from '../../api/task-analytics';

interface GradingCenterTabProps {
  taskId?: number;
  task: TaskDetail;
}

export const GradingCenterTab: React.FC<GradingCenterTabProps> = ({
  taskId,
  task,
}) => {
  const [selectedQuestionId, setSelectedQuestionId] = React.useState<number | null>(null);
  const [selectedStudentId, setSelectedStudentId] = React.useState<number | null>(null);
  const [score, setScore] = React.useState<string>('');
  const [comments, setComments] = React.useState<string>('');

  const { data: questions, isLoading: questionsLoading } = useGradingQuestions(taskId || 0, {
    enabled: Boolean(taskId),
  });
  const { data: answers, isLoading: answersLoading } = useGradingAnswers(
    taskId || 0,
    selectedQuestionId,
    { enabled: Boolean(taskId) && Boolean(selectedQuestionId) }
  );
  const submitGrading = useSubmitGrading(taskId || 0);

  // Auto-select first question
  React.useEffect(() => {
    if (questions && questions.length > 0 && !selectedQuestionId) {
      setSelectedQuestionId(questions[0].question_id);
    }
  }, [questions, selectedQuestionId]);

  // Auto-select first ungraded student
  React.useEffect(() => {
    if (answers && answers.length > 0) {
      const firstUngraded = answers.find((a) => !a.is_graded);
      if (firstUngraded && !selectedStudentId) {
        setSelectedStudentId(firstUngraded.student_id);
      } else if (!selectedStudentId && answers.length > 0) {
        setSelectedStudentId(answers[0].student_id);
      }
    }
  }, [answers, selectedStudentId]);

  const selectedQuestion = questions?.find((q) => q.question_id === selectedQuestionId);
  const selectedAnswer = answers?.find((a) => a.student_id === selectedStudentId);

  // Load existing score/comments when selecting a student
  React.useEffect(() => {
    if (selectedAnswer) {
      setScore(selectedAnswer.score?.toString() || '');
      setComments(selectedAnswer.comments || '');
    } else {
      setScore('');
      setComments('');
    }
  }, [selectedAnswer]);

  const handleQuickScore = (percentage: number) => {
    if (selectedQuestion) {
      const calculatedScore = Math.round(selectedQuestion.max_score * percentage);
      setScore(calculatedScore.toString());
    }
  };

  const handleSubmit = async () => {
    if (!selectedStudentId || !selectedQuestionId || !score) return;

    try {
      await submitGrading.mutateAsync({
        question_id: selectedQuestionId,
        student_id: selectedStudentId,
        score: parseFloat(score),
        comments,
      });
      toast.success('评分成功');

      // Move to next ungraded student
      if (answers) {
        const currentIndex = answers.findIndex((a) => a.student_id === selectedStudentId);
        const nextUngraded = answers.slice(currentIndex + 1).find((a) => !a.is_graded);
        if (nextUngraded) {
          setSelectedStudentId(nextUngraded.student_id);
        }
      }
    } catch {
      toast.error('评分失败');
    }
  };

  const handleNextStudent = () => {
    if (answers) {
      const currentIndex = answers.findIndex((a) => a.student_id === selectedStudentId);
      if (currentIndex < answers.length - 1) {
        setSelectedStudentId(answers[currentIndex + 1].student_id);
      }
    }
  };

  if (questionsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-12 gap-4 h-[500px]">
          <Skeleton className="col-span-3 h-full" />
          <Skeleton className="col-span-6 h-full" />
          <Skeleton className="col-span-3 h-full" />
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        该任务没有需要评分的简答题
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">试卷信息:</span>
          <span className="font-medium text-slate-900">
            {task.quizzes?.[0]?.quiz_title || '综合测验'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">简答题筛选:</span>
          <Select
            value={selectedQuestionId?.toString() || ''}
            onValueChange={(v) => {
              setSelectedQuestionId(Number(v));
              setSelectedStudentId(null);
            }}
          >
            <SelectTrigger className="w-64 cursor-pointer">
              <SelectValue placeholder="选择题目" />
            </SelectTrigger>
            <SelectContent>
              {questions.map((q) => (
                <SelectItem key={q.question_id} value={q.question_id.toString()} className="cursor-pointer">
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate max-w-[180px]">{q.question_text.slice(0, 20)}...</span>
                    <span className="text-xs text-slate-500 ml-2 tabular-nums">
                      待评 {q.ungraded_count}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-280px)] min-h-[500px]">
        {/* Left: Student List */}
        <div className="col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-slate-50/50">
            <h3 className="font-semibold text-slate-900">学员列表</h3>
            <p className="text-xs text-slate-500 mt-1 tabular-nums">
              共 {answers?.length || 0} 人，待评 {answers?.filter((a) => !a.is_graded).length || 0} 人
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {answersLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : (
              answers?.map((answer) => (
                <button
                  key={answer.student_id}
                  onClick={() => setSelectedStudentId(answer.student_id)}
                  className={cn(
                    'w-full p-3 text-left border-b border-gray-50 hover:bg-slate-50 transition-colors duration-150 cursor-pointer',
                    selectedStudentId === answer.student_id && 'bg-blue-50 border-l-2 border-l-blue-600'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-900 text-sm">
                          {answer.student_name}
                        </span>
                        {answer.is_graded ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            <CheckCircle className="h-3 w-3" />
                            已评分
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                            <Clock className="h-3 w-3" />
                            待评分
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">{answer.employee_id}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Middle: Question & Answer */}
        <div className="col-span-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          {/* Question Section */}
          <div className="p-5 border-b border-gray-100 bg-slate-50/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">题目</h3>
              <span className="text-sm text-slate-500 tabular-nums">
                满分 {selectedQuestion?.max_score || 0} 分
              </span>
            </div>
            <p className="text-slate-700 text-sm leading-relaxed">
              {selectedQuestion?.question_text}
            </p>
            {selectedQuestion?.question_analysis && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs font-semibold text-blue-700 mb-1.5">参考答案/评分要点:</p>
                <p className="text-sm text-blue-600 leading-relaxed">
                  {selectedQuestion.question_analysis}
                </p>
              </div>
            )}
          </div>

          {/* Answer Section */}
          <div className="flex-1 p-5 overflow-y-auto">
            {selectedAnswer ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">学员答案</h3>
                  <span className="text-xs text-slate-500">
                    提交于 {selectedAnswer.submitted_at ? new Date(selectedAnswer.submitted_at).toLocaleString() : '-'}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {selectedAnswer.answer_text || '(未作答)'}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                请从左侧选择学员查看答案
              </div>
            )}
          </div>
        </div>

        {/* Right: Grading Panel */}
        <div className="col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          {selectedAnswer ? (
            <>
              {/* Student Info */}
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-slate-900 mb-3">学员信息</h3>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">姓名</span>
                    <span className="text-slate-900 font-medium">{selectedAnswer.student_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">工号</span>
                    <span className="text-slate-900 tabular-nums">{selectedAnswer.employee_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">部门</span>
                    <span className="text-slate-900">{selectedAnswer.department}</span>
                  </div>
                </div>
              </div>

              {/* Scoring Section */}
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-slate-900 mb-3">评分</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={selectedQuestion?.max_score || 100}
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                      placeholder="输入分数"
                      className="flex-1 tabular-nums"
                    />
                    <span className="text-sm text-slate-500 tabular-nums">
                      / {selectedQuestion?.max_score || 0}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {[0, 0.5, 0.75, 1].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => handleQuickScore(pct)}
                        className="flex-1 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors duration-150 cursor-pointer"
                      >
                        {pct * 100}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-semibold text-slate-900 mb-3">评语</h3>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="输入评语（可选）"
                  className="flex-1 resize-none"
                  rows={4}
                />
                <p className="text-xs text-slate-400 mt-2 text-right tabular-nums">
                  {comments.length} 字
                </p>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-gray-100 space-y-2">
                <Button
                  onClick={handleSubmit}
                  disabled={!score || submitGrading.isPending}
                  className="w-full cursor-pointer"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submitGrading.isPending ? '提交中...' : '提交评分'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleNextStudent}
                  className="w-full cursor-pointer"
                >
                  下一位学员
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              请选择学员进行评分
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
