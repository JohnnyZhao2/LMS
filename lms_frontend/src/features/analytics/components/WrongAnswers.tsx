/**
 * WrongAnswers Component
 * Displays wrong answers from practice and exams
 * Requirements: 10.3 - Display wrong answers from practice and exams
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { 
  XCircle, 
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Calendar
} from 'lucide-react';
import type { WrongAnswerRecord, WrongAnswersParams } from '../api/types';
import type { QuestionType } from '@/types/domain';

interface WrongAnswersProps {
  wrongAnswers: WrongAnswerRecord[];
  total: number;
  isLoading?: boolean;
  onFilterChange?: (params: WrongAnswersParams) => void;
}

/**
 * Question type badge
 */
function QuestionTypeBadge({ type }: { type: QuestionType }) {
  const config: Record<QuestionType, { label: string; variant: 'default' | 'secondary' | 'warning' | 'success' }> = {
    SINGLE_CHOICE: { label: '单选', variant: 'default' },
    MULTIPLE_CHOICE: { label: '多选', variant: 'secondary' },
    TRUE_FALSE: { label: '判断', variant: 'warning' },
    SHORT_ANSWER: { label: '简答', variant: 'success' },
  };
  
  const { label, variant } = config[type] || config.SINGLE_CHOICE;
  
  return <Badge variant={variant}>{label}</Badge>;
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
 * Wrong answer card component
 */
function WrongAnswerCard({ record }: { record: WrongAnswerRecord }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formattedDate = new Date(record.submitted_at).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return (
    <div className="rounded-lg bg-white/5 overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-start gap-3 text-left hover:bg-white/5 transition-colors"
      >
        <div className="p-1.5 rounded-full bg-status-error/20 text-status-error mt-0.5">
          <XCircle size={16} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <QuestionTypeBadge type={record.question.type} />
            <span className="text-xs text-text-muted">
              {record.task_title} · {record.quiz_title}
            </span>
          </div>
          <p className="text-sm text-white line-clamp-2">
            {record.question.content}
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-text-muted">
          <span className="text-xs flex items-center gap-1">
            <Calendar size={10} />
            {formattedDate}
          </span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-white/10 space-y-4">
          {/* Options for choice questions */}
          {record.question.options && record.question.options.length > 0 && (
            <div className="space-y-2 mt-4">
              <div className="text-xs text-text-muted font-medium">选项</div>
              <div className="space-y-1">
                {record.question.options.map((option) => {
                  const isUserAnswer = Array.isArray(record.user_answer)
                    ? record.user_answer.includes(option.key)
                    : record.user_answer === option.key;
                  const isCorrectAnswer = Array.isArray(record.correct_answer)
                    ? record.correct_answer.includes(option.key)
                    : record.correct_answer === option.key;
                  
                  return (
                    <div
                      key={option.key}
                      className={`p-2 rounded text-sm flex items-start gap-2 ${
                        isCorrectAnswer
                          ? 'bg-status-success/10 text-status-success'
                          : isUserAnswer
                          ? 'bg-status-error/10 text-status-error'
                          : 'bg-white/5 text-text-muted'
                      }`}
                    >
                      <span className="font-mono font-medium">{option.key}.</span>
                      <span className="flex-1">{option.content}</span>
                      {isCorrectAnswer && <CheckCircle2 size={14} className="mt-0.5" />}
                      {isUserAnswer && !isCorrectAnswer && <XCircle size={14} className="mt-0.5" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Answer comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-status-error/10">
              <div className="text-xs text-status-error font-medium mb-1 flex items-center gap-1">
                <XCircle size={12} />
                你的答案
              </div>
              <div className="text-sm text-white">
                {formatAnswer(record.user_answer) || '未作答'}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-status-success/10">
              <div className="text-xs text-status-success font-medium mb-1 flex items-center gap-1">
                <CheckCircle2 size={12} />
                正确答案
              </div>
              <div className="text-sm text-white">
                {formatAnswer(record.correct_answer)}
              </div>
            </div>
          </div>

          {/* Explanation */}
          {record.question.explanation && (
            <div className="p-3 rounded-lg bg-primary/10">
              <div className="text-xs text-primary font-medium mb-1 flex items-center gap-1">
                <BookOpen size={12} />
                解析
              </div>
              <div className="text-sm text-text-secondary">
                {record.question.explanation}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Loading skeleton
 */
function WrongAnswersSkeleton() {
  return (
    <Card className="glass-panel border-white/5">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <XCircle className="text-status-error" size={20} />
          错题本
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-lg bg-white/5 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-white/10 rounded" />
                  <div className="h-4 w-full bg-white/10 rounded" />
                  <div className="h-4 w-3/4 bg-white/10 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * WrongAnswers component
 */
export function WrongAnswers({ 
  wrongAnswers, 
  total,
  isLoading,
  onFilterChange 
}: WrongAnswersProps) {
  const [typeFilter, setTypeFilter] = useState<string>('');

  if (isLoading) {
    return <WrongAnswersSkeleton />;
  }

  const handleTypeChange = (value: string) => {
    setTypeFilter(value);
    onFilterChange?.({ 
      question_type: value as QuestionType | undefined 
    });
  };

  return (
    <Card className="glass-panel border-white/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <XCircle className="text-status-error" size={20} />
            错题本
            {total > 0 && (
              <Badge variant="destructive" className="ml-2">
                {total} 题
              </Badge>
            )}
          </CardTitle>
          <Select
            value={typeFilter}
            onChange={(value) => handleTypeChange(value as string)}
            options={[
              { value: '', label: '全部题型' },
              { value: 'SINGLE_CHOICE', label: '单选题' },
              { value: 'MULTIPLE_CHOICE', label: '多选题' },
              { value: 'TRUE_FALSE', label: '判断题' },
              { value: 'SHORT_ANSWER', label: '简答题' },
            ]}
            placeholder="全部题型"
            className="w-28"
          />
        </div>
      </CardHeader>
      <CardContent>
        {wrongAnswers.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-12 w-12" />}
            title="暂无错题"
            description="太棒了！你还没有答错的题目"
          />
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {wrongAnswers.map((record) => (
              <WrongAnswerCard key={record.id} record={record} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default WrongAnswers;
