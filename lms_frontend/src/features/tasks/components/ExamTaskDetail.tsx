/**
 * ExamTaskDetail Component
 * Display exam task details with time window control
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  GraduationCap, 
  Clock, 
  User, 
  ArrowLeft,
  Calendar,
  Timer,
  Target,
  AlertTriangle,
  CheckCircle,
  Lock,
  Play,
  Eye
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { TaskAssignmentDetail } from '../api/types';

// ============================================
// Types
// ============================================

interface ExamTaskDetailProps {
  assignment: TaskAssignmentDetail;
  onStartExam?: () => void;
  onViewResult?: () => void;
  className?: string;
}

type ExamWindowStatus = 'NOT_STARTED' | 'IN_WINDOW' | 'ENDED';

// ============================================
// Helper Functions
// ============================================

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('zh-CN', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getExamWindowStatus(startTime?: string, deadline?: string): ExamWindowStatus {
  if (!startTime || !deadline) return 'NOT_STARTED';
  
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(deadline);
  
  if (now < start) return 'NOT_STARTED';
  if (now > end) return 'ENDED';
  return 'IN_WINDOW';
}

function getTimeUntilStart(startTime: string): string {
  const now = new Date();
  const start = new Date(startTime);
  const diffMs = start.getTime() - now.getTime();
  
  if (diffMs <= 0) return '已开始';
  
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffDays > 0) return `${diffDays} 天 ${diffHours} 小时后开始`;
  if (diffHours > 0) return `${diffHours} 小时 ${diffMinutes} 分钟后开始`;
  return `${diffMinutes} 分钟后开始`;
}

// ============================================
// Component
// ============================================

export function ExamTaskDetail({
  assignment,
  onStartExam,
  onViewResult,
  className,
}: ExamTaskDetailProps) {
  const navigate = useNavigate();
  
  const { task, status, quiz_progress } = assignment;
  const isCompleted = status === 'COMPLETED';
  const isOverdue = status === 'OVERDUE';
  
  // Check if exam has been submitted - Requirements: 9.8
  const hasSubmitted = useMemo(() => {
    if (!quiz_progress || quiz_progress.length === 0) return false;
    return quiz_progress.some(qp => qp.attempt_count > 0);
  }, [quiz_progress]);
  
  // Get exam window status - Requirements: 9.3, 9.4
  const windowStatus = useMemo(() => {
    return getExamWindowStatus(task.start_time, task.deadline);
  }, [task.start_time, task.deadline]);
  
  // Can enter exam - Requirements: 9.3, 9.4
  const canEnterExam = windowStatus === 'IN_WINDOW' && !hasSubmitted;
  
  // Get quiz info
  const quiz = task.quizzes?.[0];
  const questionCount = quiz?.questions.length || 0;

  // Handle start exam
  const handleStartExam = () => {
    if (onStartExam) {
      onStartExam();
    } else {
      navigate(`/tasks/exam/${assignment.id}/start`);
    }
  };

  // Handle view result
  const handleViewResult = () => {
    if (onViewResult) {
      onViewResult();
    } else {
      navigate(`/tasks/exam/${assignment.id}/result`);
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
            <div className="w-14 h-14 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <GraduationCap size={28} className="text-destructive" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="border-destructive/30 text-destructive">
                  考试任务
                </Badge>
                <Badge variant={isCompleted || hasSubmitted ? 'success' : isOverdue ? 'destructive' : 'warning'}>
                  {hasSubmitted ? '已提交' : isCompleted ? '已完成' : isOverdue ? '已逾期' : '进行中'}
                </Badge>
                {windowStatus === 'IN_WINDOW' && !hasSubmitted && (
                  <Badge variant="success" className="animate-pulse">
                    考试进行中
                  </Badge>
                )}
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
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exam Rules - Requirements: 9.1, 9.2 */}
      <Card className="glass-panel border-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target size={20} className="text-destructive" />
            考试规则
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Question Count - Requirements: 9.1 */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-text-muted mb-1">
                <GraduationCap size={14} />
                <span className="text-xs uppercase">题目数量</span>
              </div>
              <div className="text-2xl font-bold text-white">{questionCount} 题</div>
            </div>

            {/* Duration - Requirements: 9.1 */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-text-muted mb-1">
                <Timer size={14} />
                <span className="text-xs uppercase">考试时长</span>
              </div>
              <div className="text-2xl font-bold text-white">{task.duration || 60} 分钟</div>
            </div>

            {/* Pass Score - Requirements: 9.1 */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-text-muted mb-1">
                <Target size={14} />
                <span className="text-xs uppercase">及格分数</span>
              </div>
              <div className="text-2xl font-bold text-white">{task.pass_score || 60} 分</div>
            </div>

            {/* Total Score */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-text-muted mb-1">
                <CheckCircle size={14} />
                <span className="text-xs uppercase">总分</span>
              </div>
              <div className="text-2xl font-bold text-white">{quiz?.total_score || 100} 分</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Window - Requirements: 9.2 */}
      <Card className="glass-panel border-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar size={20} className="text-primary" />
            考试时间
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Start Time */}
            <div className="flex-1 p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-text-muted mb-2">
                <Clock size={14} />
                <span className="text-sm">开始时间</span>
              </div>
              <div className="text-lg font-semibold text-white">
                {task.start_time ? formatDateTime(task.start_time) : '未设置'}
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center px-4">
              <div className="w-8 h-0.5 bg-white/20" />
            </div>

            {/* End Time */}
            <div className="flex-1 p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-text-muted mb-2">
                <Clock size={14} />
                <span className="text-sm">截止时间</span>
              </div>
              <div className="text-lg font-semibold text-white">
                {formatDateTime(task.deadline)}
              </div>
            </div>
          </div>

          {/* Window Status Message - Requirements: 9.3, 9.4 */}
          <div className={cn(
            'mt-4 p-4 rounded-lg border flex items-center gap-3',
            windowStatus === 'IN_WINDOW' && !hasSubmitted && 'bg-success/10 border-success/30',
            windowStatus === 'NOT_STARTED' && 'bg-warning/10 border-warning/30',
            (windowStatus === 'ENDED' || hasSubmitted) && 'bg-white/5 border-white/10'
          )}>
            {windowStatus === 'IN_WINDOW' && !hasSubmitted ? (
              <>
                <CheckCircle size={20} className="text-success shrink-0" />
                <div>
                  <div className="font-medium text-success">考试窗口已开放</div>
                  <div className="text-sm text-text-secondary">您可以现在进入考试</div>
                </div>
              </>
            ) : windowStatus === 'NOT_STARTED' ? (
              <>
                <AlertTriangle size={20} className="text-warning shrink-0" />
                <div>
                  <div className="font-medium text-warning">考试尚未开始</div>
                  <div className="text-sm text-text-secondary">
                    {task.start_time && getTimeUntilStart(task.start_time)}
                  </div>
                </div>
              </>
            ) : hasSubmitted ? (
              <>
                <CheckCircle size={20} className="text-success shrink-0" />
                <div>
                  <div className="font-medium text-success">您已完成考试</div>
                  <div className="text-sm text-text-secondary">点击下方按钮查看考试结果</div>
                </div>
              </>
            ) : (
              <>
                <Lock size={20} className="text-text-muted shrink-0" />
                <div>
                  <div className="font-medium text-text-muted">考试窗口已关闭</div>
                  <div className="text-sm text-text-secondary">考试时间已结束</div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <div className="flex justify-center">
        {hasSubmitted ? (
          // Requirements: 9.8 - Show view result button after submission
          <Button
            size="lg"
            variant="secondary"
            onClick={handleViewResult}
            className="min-w-[200px]"
          >
            <Eye size={18} className="mr-2" />
            查看结果
          </Button>
        ) : (
          // Requirements: 9.3, 9.4 - Enable/disable based on time window
          <Button
            size="lg"
            variant="primary"
            onClick={handleStartExam}
            disabled={!canEnterExam}
            className="min-w-[200px]"
          >
            {canEnterExam ? (
              <>
                <Play size={18} className="mr-2" />
                进入考试
              </>
            ) : windowStatus === 'NOT_STARTED' ? (
              <>
                <Lock size={18} className="mr-2" />
                考试未开始
              </>
            ) : (
              <>
                <Lock size={18} className="mr-2" />
                考试已结束
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export default ExamTaskDetail;
