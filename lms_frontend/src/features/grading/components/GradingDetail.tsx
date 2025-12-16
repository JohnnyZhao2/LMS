/**
 * GradingDetail Component
 * Display submission answers and grading interface
 * Requirements: 15.2 - 展示学员答案和评分输入界面
 * Requirements: 15.3 - 提供分数输入框和评语输入框
 */

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { 
  useGradingDetail,
  useSubmitGrading,
  type GradeAnswerRequest,
} from '../api/grading';
import type { Answer, QuestionType } from '@/types/domain';
import { 
  User,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  MessageSquare,
} from 'lucide-react';

export interface GradingDetailProps {
  /** Submission ID to grade */
  submissionId: number | string;
  /** Callback when grading is submitted successfully */
  onGradingComplete?: () => void;
}

/**
 * Get question type label
 */
function getQuestionTypeLabel(type: QuestionType): string {
  const labels: Record<QuestionType, string> = {
    SINGLE_CHOICE: '单选题',
    MULTIPLE_CHOICE: '多选题',
    TRUE_FALSE: '判断题',
    SHORT_ANSWER: '简答题',
  };
  return labels[type] || type;
}

/**
 * Format answer for display
 */
function formatAnswer(answer: string | string[]): string {
  if (Array.isArray(answer)) {
    return answer.join(', ');
  }
  return answer;
}

/**
 * AnswerCard Component - Display a single answer with grading controls
 */
interface AnswerCardProps {
  answer: Answer;
  index: number;
  grade: GradeAnswerRequest | undefined;
  onGradeChange: (grade: GradeAnswerRequest) => void;
  isManualGrading: boolean;
}

const AnswerCard: React.FC<AnswerCardProps> = ({
  answer,
  index,
  grade,
  onGradeChange,
  isManualGrading,
}) => {
  const question = answer.question;
  const maxScore = 10; // Default max score per question, should come from quiz config
  
  const handleScoreChange = (value: string) => {
    const score = Math.max(0, Math.min(maxScore, parseFloat(value) || 0));
    onGradeChange({
      answer_id: answer.id,
      score,
      comment: grade?.comment,
    });
  };
  
  const handleCommentChange = (value: string) => {
    onGradeChange({
      answer_id: answer.id,
      score: grade?.score ?? 0,
      comment: value || undefined,
    });
  };
  
  // Determine if answer is correct (for auto-graded questions)
  const isCorrect = answer.is_correct;
  const isAutoGraded = !isManualGrading;
  
  return (
    <div className="p-4 rounded-lg bg-black/20 border border-white/5">
      {/* Question Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-primary font-mono text-sm">Q{index + 1}</span>
          <Badge variant="secondary" className="text-xs">
            {getQuestionTypeLabel(question.type)}
          </Badge>
        </div>
        {isAutoGraded && (
          <div className="flex items-center gap-1">
            {isCorrect ? (
              <>
                <CheckCircle size={14} className="text-green-400" />
                <span className="text-green-400 text-xs">正确</span>
              </>
            ) : (
              <>
                <XCircle size={14} className="text-red-400" />
                <span className="text-red-400 text-xs">错误</span>
              </>
            )}
          </div>
        )}
        {isManualGrading && (
          <Badge variant="warning" className="text-xs">
            需人工评分
          </Badge>
        )}
      </div>
      
      {/* Question Content */}
      <div className="mb-4">
        <p className="text-white text-sm whitespace-pre-wrap">
          {question.content}
        </p>
        
        {/* Options for choice questions */}
        {question.options && question.options.length > 0 && (
          <div className="mt-2 space-y-1">
            {question.options.map((opt) => {
              const isSelected = Array.isArray(answer.user_answer)
                ? answer.user_answer.includes(opt.key)
                : answer.user_answer === opt.key;
              const isCorrectOption = Array.isArray(question.answer)
                ? question.answer.includes(opt.key)
                : question.answer === opt.key;
              
              return (
                <div 
                  key={opt.key}
                  className={`
                    flex items-start gap-2 p-2 rounded text-sm
                    ${isSelected && isCorrectOption ? 'bg-green-500/10 border border-green-500/20' : ''}
                    ${isSelected && !isCorrectOption ? 'bg-red-500/10 border border-red-500/20' : ''}
                    ${!isSelected && isCorrectOption ? 'bg-primary/10 border border-primary/20' : ''}
                    ${!isSelected && !isCorrectOption ? 'bg-white/5' : ''}
                  `}
                >
                  <span className="font-mono text-text-muted">{opt.key}.</span>
                  <span className={isSelected ? 'text-white' : 'text-text-muted'}>
                    {opt.content}
                  </span>
                  {isSelected && (
                    <span className="ml-auto text-xs text-text-muted">学员选择</span>
                  )}
                  {isCorrectOption && !isSelected && (
                    <span className="ml-auto text-xs text-primary">正确答案</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Student Answer (for short answer) */}
      {question.type === 'SHORT_ANSWER' && (
        <div className="mb-4">
          <p className="text-xs text-text-muted mb-1">学员答案：</p>
          <div className="p-3 rounded bg-white/5 border border-white/10">
            <p className="text-white text-sm whitespace-pre-wrap">
              {formatAnswer(answer.user_answer)}
            </p>
          </div>
        </div>
      )}
      
      {/* Reference Answer */}
      {question.type === 'SHORT_ANSWER' && (
        <div className="mb-4">
          <p className="text-xs text-text-muted mb-1">参考答案：</p>
          <div className="p-3 rounded bg-primary/5 border border-primary/20">
            <p className="text-white/80 text-sm whitespace-pre-wrap">
              {formatAnswer(question.answer)}
            </p>
          </div>
        </div>
      )}
      
      {/* Explanation */}
      {question.explanation && (
        <div className="mb-4">
          <p className="text-xs text-text-muted mb-1">解析：</p>
          <p className="text-text-muted text-sm">
            {question.explanation}
          </p>
        </div>
      )}
      
      {/* Grading Controls (for manual grading) */}
      {/* Requirements: 15.3 - 提供分数输入框和评语输入框 */}
      {isManualGrading && (
        <div className="pt-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-4">
            <label className="text-sm text-text-muted whitespace-nowrap">
              评分：
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={maxScore}
                step={0.5}
                value={grade?.score ?? ''}
                onChange={(e) => handleScoreChange(e.target.value)}
                className="w-20 bg-black/30 border-white/10 text-center"
                placeholder="0"
              />
              <span className="text-text-muted text-sm">/ {maxScore} 分</span>
            </div>
          </div>
          
          <div>
            <label className="text-sm text-text-muted mb-1 flex items-center gap-1">
              <MessageSquare size={12} />
              评语（可选）：
            </label>
            <Textarea
              value={grade?.comment ?? ''}
              onChange={(e) => handleCommentChange(e.target.value)}
              placeholder="输入评语..."
              className="bg-black/30 border-white/10 min-h-[60px]"
              rows={2}
            />
          </div>
        </div>
      )}
      
      {/* Auto-graded score display */}
      {isAutoGraded && answer.score !== undefined && (
        <div className="pt-3 border-t border-white/10">
          <span className="text-sm text-text-muted">
            得分：
            <span className={`font-medium ml-1 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
              {answer.score}
            </span>
          </span>
        </div>
      )}
    </div>
  );
};

export const GradingDetail: React.FC<GradingDetailProps> = ({
  submissionId,
  onGradingComplete,
}) => {
  const { data: detail, isLoading, error, refetch } = useGradingDetail(submissionId);
  const submitGrading = useSubmitGrading();
  
  // Grades state - only for manual grading questions
  const [grades, setGrades] = React.useState<Map<number, GradeAnswerRequest>>(new Map());
  
  // Initialize grades when detail loads
  React.useEffect(() => {
    if (detail?.manual_grading_required) {
      const initialGrades = new Map<number, GradeAnswerRequest>();
      detail.manual_grading_required.forEach(answer => {
        initialGrades.set(answer.id, {
          answer_id: answer.id,
          score: answer.score ?? 0,
          comment: answer.comment,
        });
      });
      setGrades(initialGrades);
    }
  }, [detail]);
  
  const handleGradeChange = (grade: GradeAnswerRequest) => {
    setGrades(prev => {
      const next = new Map(prev);
      next.set(grade.answer_id, grade);
      return next;
    });
  };
  
  const handleSubmit = async () => {
    if (!detail) return;
    
    const gradesArray = Array.from(grades.values());
    
    try {
      await submitGrading.mutateAsync({
        submissionId,
        data: { grades: gradesArray },
      });
      onGradingComplete?.();
    } catch (error) {
      console.error('Submit grading failed:', error);
    }
  };
  
  // Check if all manual grading questions have scores
  const allGraded = detail?.manual_grading_required?.every(
    answer => grades.has(answer.id) && grades.get(answer.id)!.score !== undefined
  ) ?? false;
  
  // Calculate total manual score
  const totalManualScore = Array.from(grades.values()).reduce(
    (sum, g) => sum + (g.score ?? 0), 
    0
  );
  
  if (isLoading) {
    return (
      <Card className="glass-panel border-white/5 h-full flex items-center justify-center">
        <Spinner size="lg" />
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="glass-panel border-white/5 h-full flex flex-col items-center justify-center">
        <AlertCircle className="text-red-400 mb-4" size={48} />
        <p className="text-red-400 mb-4">加载失败</p>
        <Button variant="secondary" onClick={() => refetch()}>
          重试
        </Button>
      </Card>
    );
  }
  
  if (!detail) {
    return (
      <Card className="glass-panel border-white/5 h-full flex items-center justify-center">
        <EmptyState
          title="请选择待评分试卷"
          description="从左侧列表选择一份试卷进行评分"
        />
      </Card>
    );
  }
  
  const manualAnswers = detail.manual_grading_required || [];
  const autoAnswers = detail.answers.filter(
    a => !manualAnswers.some(m => m.id === a.id)
  );
  
  return (
    <Card className="glass-panel border-white/5 h-full flex flex-col">
      <CardHeader className="border-b border-white/5">
        {/* Student Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
              <User size={18} className="text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">{detail.user.real_name}</CardTitle>
              <p className="text-text-muted text-sm">{detail.user.employee_id}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white font-medium">{detail.task.title}</p>
            <p className="text-text-muted text-sm">{detail.quiz.title}</p>
          </div>
        </div>
        
        {/* Score Summary */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5">
          <div>
            <p className="text-xs text-text-muted">自动判分</p>
            <p className="text-lg font-medium text-primary">
              {detail.auto_graded_score} <span className="text-sm text-text-muted">分</span>
            </p>
          </div>
          {manualAnswers.length > 0 && (
            <div>
              <p className="text-xs text-text-muted">人工评分</p>
              <p className="text-lg font-medium text-amber-400">
                {totalManualScore} <span className="text-sm text-text-muted">分</span>
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-text-muted">总分</p>
            <p className="text-lg font-medium text-white">
              {detail.auto_graded_score + totalManualScore} 
              <span className="text-sm text-text-muted">/ {detail.total_score} 分</span>
            </p>
          </div>
          <div className="ml-auto">
            <Badge variant={manualAnswers.length > 0 ? 'warning' : 'success'}>
              {manualAnswers.length > 0 
                ? `${manualAnswers.length} 题待评` 
                : '已完成评分'
              }
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-auto py-4">
        {/* Manual Grading Section */}
        {manualAnswers.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={16} className="text-amber-400" />
              <h3 className="text-white font-medium">需人工评分 ({manualAnswers.length})</h3>
            </div>
            <div className="space-y-4">
              {manualAnswers.map((answer, index) => (
                <AnswerCard
                  key={answer.id}
                  answer={answer}
                  index={index}
                  grade={grades.get(answer.id)}
                  onGradeChange={handleGradeChange}
                  isManualGrading={true}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Auto-graded Section */}
        {autoAnswers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle size={16} className="text-green-400" />
              <h3 className="text-white font-medium">自动判分 ({autoAnswers.length})</h3>
            </div>
            <div className="space-y-4">
              {autoAnswers.map((answer, index) => (
                <AnswerCard
                  key={answer.id}
                  answer={answer}
                  index={manualAnswers.length + index}
                  grade={undefined}
                  onGradeChange={() => {}}
                  isManualGrading={false}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
      
      {/* Submit Button */}
      {/* Requirements: 15.4 - 调用评分 API 并更新列表状态 */}
      {manualAnswers.length > 0 && (
        <div className="p-4 border-t border-white/5">
          <Button
            className="w-full gap-2"
            onClick={handleSubmit}
            disabled={!allGraded || submitGrading.isPending}
            loading={submitGrading.isPending}
          >
            <Send size={16} />
            提交评分
          </Button>
          {!allGraded && (
            <p className="text-xs text-amber-400 text-center mt-2">
              请为所有题目评分后再提交
            </p>
          )}
        </div>
      )}
    </Card>
  );
};

GradingDetail.displayName = 'GradingDetail';
