/**
 * QuizQuickPublish Component
 * Modal for quick publishing quizzes as tasks
 * Requirements: 13.10, 13.11, 13.12 - Quick publish with task type selection
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { Quiz, TaskType } from '@/types/domain';
import { FileText, BookOpen, GraduationCap, ArrowRight, AlertCircle } from 'lucide-react';

export interface QuizQuickPublishProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Selected quizzes for publishing */
  quizzes: Quiz[];
}

export const QuizQuickPublish: React.FC<QuizQuickPublishProps> = ({
  open,
  onClose,
  quizzes,
}) => {
  const navigate = useNavigate();
  
  const [taskType, setTaskType] = React.useState<TaskType | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  
  // Reset state when modal opens
  React.useEffect(() => {
    if (open) {
      setTaskType(null);
      setError(null);
    }
  }, [open]);
  
  // Requirements: 13.11, 13.12 - Multiple quizzes can only be practice tasks
  const isMultipleQuizzes = quizzes.length > 1;
  
  // Calculate totals
  const totalQuestions = quizzes.reduce((sum, q) => sum + q.questions.length, 0);
  const totalScore = quizzes.reduce((sum, q) => sum + q.total_score, 0);
  
  const handleTaskTypeSelect = (type: TaskType) => {
    // Requirements: 13.12 - Multiple quizzes only allow practice type
    if (isMultipleQuizzes && type === 'EXAM') {
      setError('选择多份试卷时，仅支持发布为练习任务');
      return;
    }
    setTaskType(type);
    setError(null);
  };
  
  const handleSubmit = () => {
    if (!taskType) {
      setError('请选择任务类型');
      return;
    }
    
    // Store quiz data in session storage for task wizard to pick up
    const publishData = {
      quizzes: quizzes.map(q => ({
        id: q.id,
        title: q.title,
        question_count: q.questions.length,
        total_score: q.total_score,
      })),
      taskType,
    };
    
    sessionStorage.setItem('quizQuickPublish', JSON.stringify(publishData));
    
    // Navigate to task wizard
    // Requirements: 13.13 - Jump to task creation flow
    navigate('/tasks/create?from=quiz-publish');
    onClose();
  };
  
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="快速发布任务"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={!taskType}
            className="gap-2"
          >
            下一步
            <ArrowRight size={16} />
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Selected Quizzes Summary */}
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-muted">已选试卷</span>
            <span className="text-lg font-bold text-white">{quizzes.length} 份</span>
          </div>
          
          {/* Quiz list */}
          <div className="space-y-2 mb-3 max-h-[150px] overflow-y-auto">
            {quizzes.map(quiz => (
              <div 
                key={quiz.id}
                className="flex items-center justify-between p-2 bg-white/5 rounded"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={14} className="text-primary shrink-0" />
                  <span className="text-sm text-white truncate">{quiz.title}</span>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {quiz.questions.length} 题
                </Badge>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between text-sm border-t border-white/5 pt-3">
            <span className="text-text-muted">共计</span>
            <div className="flex gap-4">
              <span className="text-white">{totalQuestions} 道题目</span>
              <span className="text-primary font-mono">{totalScore} 分</span>
            </div>
          </div>
        </div>
        
        {/* Task Type Selection */}
        {/* Requirements: 13.11, 13.12 - Task type selection with restrictions */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-3">
            任务类型
          </label>
          
          {/* Warning for multiple quizzes */}
          {isMultipleQuizzes && (
            <div className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 mb-4">
              <AlertCircle size={18} className="text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-sm text-text-muted">
                选择多份试卷时，仅支持发布为练习任务。如需发布考试任务，请仅选择一份试卷。
              </p>
            </div>
          )}
          
          {error && (
            <p className="text-sm text-red-400 mb-2">{error}</p>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleTaskTypeSelect('PRACTICE')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                taskType === 'PRACTICE'
                  ? 'border-primary bg-primary/10'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${
                  taskType === 'PRACTICE' ? 'bg-primary/20' : 'bg-white/5'
                }`}>
                  <BookOpen 
                    size={20} 
                    className={taskType === 'PRACTICE' ? 'text-primary' : 'text-text-muted'} 
                  />
                </div>
                <span className={`font-medium ${
                  taskType === 'PRACTICE' ? 'text-white' : 'text-text-muted'
                }`}>
                  练习任务
                </span>
              </div>
              <p className="text-xs text-text-muted">
                学员可多次作答，即时查看结果和解析
              </p>
            </button>
            
            <button
              type="button"
              onClick={() => handleTaskTypeSelect('EXAM')}
              disabled={isMultipleQuizzes}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                taskType === 'EXAM'
                  ? 'border-primary bg-primary/10'
                  : isMultipleQuizzes
                    ? 'border-white/5 opacity-50 cursor-not-allowed'
                    : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${
                  taskType === 'EXAM' ? 'bg-primary/20' : 'bg-white/5'
                }`}>
                  <GraduationCap 
                    size={20} 
                    className={taskType === 'EXAM' ? 'text-primary' : 'text-text-muted'} 
                  />
                </div>
                <span className={`font-medium ${
                  taskType === 'EXAM' ? 'text-white' : 'text-text-muted'
                }`}>
                  考试任务
                </span>
              </div>
              <p className="text-xs text-text-muted">
                正式考核，仅允许一次作答
              </p>
            </button>
          </div>
        </div>
        
        {/* Info Note */}
        <div className="flex items-start gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <FileText size={18} className="text-blue-400 mt-0.5 shrink-0" />
          <p className="text-sm text-text-muted">
            点击"下一步"后，将进入任务创建流程，您可以设置任务详情并选择分配学员。
          </p>
        </div>
      </div>
    </Modal>
  );
};

QuizQuickPublish.displayName = 'QuizQuickPublish';
