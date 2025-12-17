/**
 * PracticeTaskDetail Component
 * Display practice task details with quiz list and knowledge references
 * Requirements: 8.1, 8.2, 8.3
 */

import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  Target, 
  Clock, 
  User, 
  ArrowLeft,
  FileText,
  BookOpen,
  Play,
  RotateCcw,
  Trophy,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { QuizProgress } from '@/types/domain';
import type { TaskAssignmentDetail } from '../api/types';

// ============================================
// Types
// ============================================

interface PracticeTaskDetailProps {
  assignment: TaskAssignmentDetail;
  onStartQuiz?: (quizId: number) => void;
  className?: string;
}

// ============================================
// Helper Functions
// ============================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function calculateProgress(quizProgress?: QuizProgress[]): number {
  if (!quizProgress || quizProgress.length === 0) return 0;
  const attempted = quizProgress.filter(qp => qp.attempt_count > 0).length;
  return Math.round((attempted / quizProgress.length) * 100);
}

// ============================================
// Component
// ============================================

export function PracticeTaskDetail({
  assignment,
  onStartQuiz,
  className,
}: PracticeTaskDetailProps) {
  const navigate = useNavigate();
  
  const { task, status, quiz_progress } = assignment;
  const progress = calculateProgress(quiz_progress);
  const isCompleted = status === 'COMPLETED';
  const isOverdue = status === 'OVERDUE';
  const knowledgeItems = task.knowledge_items || [];

  // Handle start quiz
  const handleStartQuiz = (quizId: number) => {
    if (onStartQuiz) {
      onStartQuiz(quizId);
    } else {
      navigate(`/tasks/practice/${assignment.id}/quiz/${quizId}`);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/tasks')}
        className="flex items-center gap-2 text-text-muted hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        <span>返回任务中心</span>
      </button>

      {/* Task Header */}
      <Card className="glass-panel border-white/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <Target size={28} className="text-accent" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="border-accent/30 text-accent">
                  练习任务
                </Badge>
                <Badge variant={isCompleted ? 'success' : isOverdue ? 'destructive' : 'warning'}>
                  {isCompleted ? '已完成' : isOverdue ? '已逾期' : '进行中'}
                </Badge>
              </div>

              <h1 className="text-2xl font-bold text-white mb-2">{task.title}</h1>
              
              {task.description && (
                <p className="text-text-secondary mb-4">{task.description}</p>
              )}

              {/* Meta */}
              <div className="flex items-center gap-6 text-sm text-text-muted">
                <div className="flex items-center gap-1.5">
                  <User size={14} />
                  <span>分配人: {task.created_by.real_name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={14} />
                  <span>截止时间: {formatDate(task.deadline)}</span>
                </div>
              </div>
            </div>

            {/* Progress Circle */}
            <div className="shrink-0 text-center">
              <div className="relative w-20 h-20">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    className="text-white/10"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${progress * 2.26} 226`}
                    className="text-accent transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">{progress}%</span>
                </div>
              </div>
              <span className="text-xs text-text-muted mt-1 block">整体进度</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Related Knowledge - Requirements: 8.2 */}
      {knowledgeItems.length > 0 && (
        <Card className="glass-panel border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen size={20} className="text-primary" />
              关联知识
              <span className="text-sm font-normal text-text-muted ml-2">
                ({knowledgeItems.length} 篇)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {knowledgeItems.map((knowledge) => (
                <button
                  key={knowledge.id}
                  onClick={() => navigate(`/knowledge/${knowledge.id}`)}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
                >
                  <FileText size={18} className="text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {knowledge.title}
                    </div>
                    <div className="text-xs text-text-muted truncate">
                      {knowledge.summary}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quiz List - Requirements: 8.2, 8.3 */}
      <Card className="glass-panel border-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target size={20} className="text-accent" />
            试卷列表
            <span className="text-sm font-normal text-text-muted ml-2">
              ({quiz_progress?.filter(qp => qp.attempt_count > 0).length || 0}/{quiz_progress?.length || 0} 已作答)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {quiz_progress && quiz_progress.length > 0 ? (
            quiz_progress.map((qp) => {
              const hasAttempted = qp.attempt_count > 0;
              
              return (
                <div
                  key={qp.quiz.id}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-lg border transition-all',
                    hasAttempted
                      ? 'bg-accent/5 border-accent/20'
                      : 'bg-white/5 border-white/10'
                  )}
                >
                  {/* Quiz Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white mb-1">
                      {qp.quiz.title}
                    </h3>
                    {qp.quiz.description && (
                      <p className="text-sm text-text-secondary truncate mb-2">
                        {qp.quiz.description}
                      </p>
                    )}
                    
                    {/* Stats - Requirements: 8.3 */}
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span>总分: {qp.quiz.total_score}</span>
                      <span>题目数: {qp.quiz.questions.length}</span>
                      {hasAttempted && (
                        <>
                          <span className="flex items-center gap-1">
                            <TrendingUp size={12} />
                            作答次数: {qp.attempt_count}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Scores - Requirements: 8.3 */}
                  {hasAttempted && (
                    <div className="shrink-0 text-right mr-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-xs text-text-muted">最近成绩</div>
                          <div className="text-lg font-bold text-white">
                            {qp.latest_score ?? '-'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-text-muted flex items-center gap-1">
                            <Trophy size={10} className="text-warning" />
                            最佳成绩
                          </div>
                          <div className="text-lg font-bold text-warning">
                            {qp.best_score ?? '-'}
                          </div>
                        </div>
                      </div>
                      {qp.last_attempt_at && (
                        <div className="text-xs text-text-muted mt-1">
                          上次作答: {formatDateTime(qp.last_attempt_at)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Button - Requirements: 8.7 allows re-practice */}
                  <div className="shrink-0">
                    <Button
                      variant={hasAttempted ? 'secondary' : 'primary'}
                      onClick={() => handleStartQuiz(qp.quiz.id)}
                    >
                      {hasAttempted ? (
                        <>
                          <RotateCcw size={14} className="mr-1" />
                          再次练习
                        </>
                      ) : (
                        <>
                          <Play size={14} className="mr-1" />
                          开始练习
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-text-muted">
              <Target size={32} className="mx-auto mb-2 opacity-50" />
              <p>暂无试卷</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PracticeTaskDetail;
