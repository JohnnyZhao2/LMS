/**
 * LearningTaskDetail Component
 * Display learning task details with knowledge document list
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { 
  BookOpen, 
  Clock, 
  User, 
  CheckCircle, 
  Circle,
  ArrowLeft,
  FileText,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { KnowledgeLearningProgress } from '@/types/domain';
import type { TaskAssignmentDetail } from '../api/types';

// ============================================
// Types
// ============================================

interface LearningTaskDetailProps {
  assignment: TaskAssignmentDetail;
  onCompleteKnowledge?: (knowledgeId: number) => Promise<void>;
  isCompletingKnowledge?: boolean;
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

function calculateProgress(knowledgeProgress?: KnowledgeLearningProgress[]): number {
  if (!knowledgeProgress || knowledgeProgress.length === 0) return 0;
  const completed = knowledgeProgress.filter(kp => kp.is_completed).length;
  return Math.round((completed / knowledgeProgress.length) * 100);
}

// ============================================
// Component
// ============================================

export function LearningTaskDetail({
  assignment,
  onCompleteKnowledge,
  isCompletingKnowledge,
  className,
}: LearningTaskDetailProps) {
  const navigate = useNavigate();
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState<number | null>(null);
  
  const { task, status, knowledge_progress } = assignment;
  const progress = calculateProgress(knowledge_progress);
  const isCompleted = status === 'COMPLETED';
  const isOverdue = status === 'OVERDUE';

  // Handle complete knowledge
  const handleCompleteKnowledge = async (knowledgeId: number) => {
    if (onCompleteKnowledge) {
      setSelectedKnowledgeId(knowledgeId);
      try {
        await onCompleteKnowledge(knowledgeId);
      } finally {
        setSelectedKnowledgeId(null);
      }
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
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen size={28} className="text-primary" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="border-primary/30 text-primary">
                  学习任务
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
                    className="text-primary transition-all duration-500"
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

      {/* Knowledge Documents List */}
      <Card className="glass-panel border-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            知识文档列表
            <span className="text-sm font-normal text-text-muted ml-2">
              ({knowledge_progress?.filter(kp => kp.is_completed).length || 0}/{knowledge_progress?.length || 0} 已完成)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {knowledge_progress && knowledge_progress.length > 0 ? (
            knowledge_progress.map((kp) => (
              <div
                key={kp.id}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-lg border transition-all',
                  kp.is_completed
                    ? 'bg-success/5 border-success/20'
                    : 'bg-white/5 border-white/10 hover:border-primary/30'
                )}
              >
                {/* Status Icon */}
                <div className="shrink-0">
                  {kp.is_completed ? (
                    <CheckCircle size={24} className="text-success" />
                  ) : (
                    <Circle size={24} className="text-text-muted" />
                  )}
                </div>

                {/* Knowledge Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate">
                    {kp.knowledge.title}
                  </h3>
                  <p className="text-sm text-text-secondary truncate">
                    {kp.knowledge.summary}
                  </p>
                  {kp.is_completed && kp.completed_at && (
                    <p className="text-xs text-success mt-1">
                      完成于 {formatDateTime(kp.completed_at)}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-2">
                  {/* View Knowledge Link */}
                  <Link to={`/knowledge/${kp.knowledge.id}?task=${assignment.id}`}>
                    <Button variant="ghost" size="sm">
                      <ExternalLink size={14} className="mr-1" />
                      查看
                    </Button>
                  </Link>

                  {/* Complete Button - Requirements: 7.3, 7.4 */}
                  {!kp.is_completed && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleCompleteKnowledge(kp.knowledge.id)}
                      disabled={isCompletingKnowledge}
                    >
                      {isCompletingKnowledge && selectedKnowledgeId === kp.knowledge.id ? (
                        <Spinner size="sm" className="mr-1" />
                      ) : (
                        <CheckCircle size={14} className="mr-1" />
                      )}
                      我已学习掌握
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-text-muted">
              <FileText size={32} className="mx-auto mb-2 opacity-50" />
              <p>暂无知识文档</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default LearningTaskDetail;
