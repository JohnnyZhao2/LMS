/**
 * QuickPublish Component
 * Modal for quick quiz creation from selected questions
 * Requirements: 12.9, 12.10 - Quick quiz creation with task type selection
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { Question, TaskType } from '@/types/domain';
import { FileText, BookOpen, GraduationCap, ArrowRight } from 'lucide-react';
import { getQuestionTypeLabel } from '../api/questions/utils';

export interface QuickPublishProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Selected questions for the quiz */
  questions: Question[];
}

interface FormData {
  quizTitle: string;
  taskType: TaskType | null;
}

interface FormErrors {
  quizTitle?: string;
  taskType?: string;
}

export const QuickPublish: React.FC<QuickPublishProps> = ({
  open,
  onClose,
  questions,
}) => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = React.useState<FormData>({
    quizTitle: '',
    taskType: null,
  });
  const [errors, setErrors] = React.useState<FormErrors>({});
  
  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setFormData({
        quizTitle: '',
        taskType: null,
      });
      setErrors({});
    }
  }, [open]);
  
  // Calculate total score (default 10 points per question)
  const totalScore = questions.length * 10;
  
  // Group questions by type for summary
  const questionTypeSummary = React.useMemo(() => {
    const summary: Record<string, number> = {};
    questions.forEach(q => {
      const label = getQuestionTypeLabel(q.type);
      summary[label] = (summary[label] || 0) + 1;
    });
    return summary;
  }, [questions]);
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, quizTitle: e.target.value }));
    if (errors.quizTitle) {
      setErrors(prev => ({ ...prev, quizTitle: undefined }));
    }
  };
  
  const handleTaskTypeSelect = (type: TaskType) => {
    setFormData(prev => ({ ...prev, taskType: type }));
    if (errors.taskType) {
      setErrors(prev => ({ ...prev, taskType: undefined }));
    }
  };
  
  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.quizTitle.trim()) {
      newErrors.quizTitle = '请输入试卷名称';
    }
    
    if (!formData.taskType) {
      newErrors.taskType = '请选择任务类型';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = () => {
    if (!validate()) return;
    
    // Store quiz data in session storage for task wizard to pick up
    const quizData = {
      title: formData.quizTitle,
      questions: questions.map((q, index) => ({
        question_id: q.id,
        order: index + 1,
        score: 10, // Default score
      })),
      total_score: totalScore,
    };
    
    sessionStorage.setItem('quickPublishQuiz', JSON.stringify(quizData));
    sessionStorage.setItem('quickPublishTaskType', formData.taskType!);
    
    // Navigate to task wizard
    // Requirements: 12.10 - Jump to task creation flow
    navigate('/tasks/create?from=quick-publish');
    onClose();
  };
  
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="快速组卷发布"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            className="gap-2"
          >
            下一步
            <ArrowRight size={16} />
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Selected Questions Summary */}
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-muted">已选题目</span>
            <span className="text-lg font-bold text-white">{questions.length} 道</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {Object.entries(questionTypeSummary).map(([type, count]) => (
              <Badge key={type} variant="secondary" className="text-xs">
                {type} × {count}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">预计总分</span>
            <span className="text-primary font-mono">{totalScore} 分</span>
          </div>
        </div>
        
        {/* Quiz Title Input */}
        <Input
          label="试卷名称"
          placeholder="请输入试卷名称"
          value={formData.quizTitle}
          onChange={handleTitleChange}
          error={errors.quizTitle}
        />
        
        {/* Task Type Selection */}
        {/* Requirements: 12.9 - Task type selection (practice/exam) */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-3">
            任务类型
          </label>
          {errors.taskType && (
            <p className="text-sm text-red-400 mb-2">{errors.taskType}</p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleTaskTypeSelect('PRACTICE')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                formData.taskType === 'PRACTICE'
                  ? 'border-primary bg-primary/10'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${
                  formData.taskType === 'PRACTICE' ? 'bg-primary/20' : 'bg-white/5'
                }`}>
                  <BookOpen 
                    size={20} 
                    className={formData.taskType === 'PRACTICE' ? 'text-primary' : 'text-text-muted'} 
                  />
                </div>
                <span className={`font-medium ${
                  formData.taskType === 'PRACTICE' ? 'text-white' : 'text-text-muted'
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
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                formData.taskType === 'EXAM'
                  ? 'border-primary bg-primary/10'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${
                  formData.taskType === 'EXAM' ? 'bg-primary/20' : 'bg-white/5'
                }`}>
                  <GraduationCap 
                    size={20} 
                    className={formData.taskType === 'EXAM' ? 'text-primary' : 'text-text-muted'} 
                  />
                </div>
                <span className={`font-medium ${
                  formData.taskType === 'EXAM' ? 'text-white' : 'text-text-muted'
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

QuickPublish.displayName = 'QuickPublish';
