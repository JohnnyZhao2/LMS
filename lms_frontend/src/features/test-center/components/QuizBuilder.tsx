/**
 * QuizBuilder Component
 * Modal for creating/editing quizzes with question selection and ordering
 * Requirements: 13.2, 13.3, 13.4 - Quiz creation with question selection and ordering
 */

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { QuestionPicker } from './QuestionPicker';
import { QuestionForm } from './QuestionForm';
import { getQuestionTypeLabel, getQuestionTypeBadgeVariant } from '../api/questions/utils';
import type { Question, Quiz } from '@/types/domain';
import type { QuizQuestionInput } from '../api/quizzes/types';
import { 
  Plus, 
  Trash2, 
  GripVertical,
  FileText,
  Database,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

export interface QuizBuilderProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when quiz is saved */
  onSave: (data: QuizFormData) => void;
  /** Initial quiz data for editing */
  initialData?: Quiz;
  /** Whether the form is submitting */
  isSubmitting?: boolean;
}

export interface QuizFormData {
  title: string;
  description?: string;
  questions: QuizQuestionInput[];
}

interface QuizQuestionItem {
  question: Question;
  order: number;
  score: number;
}

interface FormErrors {
  title?: string;
  questions?: string;
}


export const QuizBuilder: React.FC<QuizBuilderProps> = ({
  open,
  onClose,
  onSave,
  initialData,
  isSubmitting = false,
}) => {
  // Form state
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [questions, setQuestions] = React.useState<QuizQuestionItem[]>([]);
  const [errors, setErrors] = React.useState<FormErrors>({});
  
  // Modal states
  const [showQuestionPicker, setShowQuestionPicker] = React.useState(false);
  const [showQuestionForm, setShowQuestionForm] = React.useState(false);
  
  // Initialize form with initial data
  React.useEffect(() => {
    if (open) {
      if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description || '');
        setQuestions(
          initialData.questions.map((qq, index) => ({
            question: qq.question,
            order: qq.order || index + 1,
            score: qq.score,
          }))
        );
      } else {
        setTitle('');
        setDescription('');
        setQuestions([]);
      }
      setErrors({});
    }
  }, [open, initialData]);
  
  // Calculate total score
  const totalScore = React.useMemo(() => {
    return questions.reduce((sum, q) => sum + q.score, 0);
  }, [questions]);
  
  // Get excluded question IDs (already in quiz)
  const excludedQuestionIds = React.useMemo(() => {
    return questions.map(q => q.question.id);
  }, [questions]);
  
  // Handle adding questions from picker
  const handleAddQuestions = (selectedQuestions: Question[]) => {
    const newQuestions = selectedQuestions.map((q, index) => ({
      question: q,
      order: questions.length + index + 1,
      score: 10, // Default score
    }));
    setQuestions([...questions, ...newQuestions]);
    if (errors.questions) {
      setErrors(prev => ({ ...prev, questions: undefined }));
    }
  };
  
  // Handle removing a question
  const handleRemoveQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    // Reorder
    setQuestions(newQuestions.map((q, i) => ({ ...q, order: i + 1 })));
  };
  
  // Handle score change
  const handleScoreChange = (index: number, score: number) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], score: Math.max(0, score) };
    setQuestions(newQuestions);
  };
  
  // Handle move up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newQuestions = [...questions];
    [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
    setQuestions(newQuestions.map((q, i) => ({ ...q, order: i + 1 })));
  };
  
  // Handle move down
  const handleMoveDown = (index: number) => {
    if (index === questions.length - 1) return;
    const newQuestions = [...questions];
    [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
    setQuestions(newQuestions.map((q, i) => ({ ...q, order: i + 1 })));
  };
  
  // Validate form
  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!title.trim()) {
      newErrors.title = '请输入试卷名称';
    }
    
    if (questions.length === 0) {
      newErrors.questions = '请至少添加一道题目';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle submit
  const handleSubmit = () => {
    if (!validate()) return;
    
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      questions: questions.map(q => ({
        question_id: q.question.id,
        order: q.order,
        score: q.score,
      })),
    });
  };
  
  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={initialData ? '编辑试卷' : '创建试卷'}
        size="lg"
        footer={
          <>
            <div className="flex-1 text-sm">
              <span className="text-text-muted">共 </span>
              <strong className="text-white">{questions.length}</strong>
              <span className="text-text-muted"> 道题目，总分 </span>
              <strong className="text-primary font-mono">{totalScore}</strong>
              <span className="text-text-muted"> 分</span>
            </div>
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              取消
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSubmit}
              loading={isSubmitting}
            >
              {initialData ? '保存修改' : '创建试卷'}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <Input
              label="试卷名称"
              placeholder="请输入试卷名称"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors(prev => ({ ...prev, title: undefined }));
              }}
              error={errors.title}
            />
            
            <Textarea
              label="试卷描述（可选）"
              placeholder="请输入试卷描述"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          
          {/* Question Actions */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">题目列表</h3>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowQuestionPicker(true)}
                className="gap-2"
              >
                <Database size={14} />
                从题库选择
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowQuestionForm(true)}
                className="gap-2"
              >
                <Plus size={14} />
                新建题目
              </Button>
            </div>
          </div>
          
          {/* Error message */}
          {errors.questions && (
            <p className="text-sm text-red-400">{errors.questions}</p>
          )}
          
          {/* Question List */}
          {questions.length === 0 ? (
            <Card className="border-dashed border-white/10 bg-transparent">
              <CardContent className="py-12 text-center">
                <FileText size={48} className="mx-auto text-text-muted mb-4" />
                <p className="text-text-muted mb-4">暂无题目，请从题库选择或新建题目</p>
                <div className="flex justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowQuestionPicker(true)}
                    className="gap-2"
                  >
                    <Database size={14} />
                    从题库选择
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowQuestionForm(true)}
                    className="gap-2"
                  >
                    <Plus size={14} />
                    新建题目
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {questions.map((item, index) => (
                <div
                  key={`${item.question.id}-${index}`}
                  className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
                >
                  {/* Order indicator */}
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <GripVertical size={16} className="text-text-muted" />
                    <span className="text-xs font-mono text-text-muted">{index + 1}</span>
                  </div>
                  
                  {/* Question content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      <Badge variant={getQuestionTypeBadgeVariant(item.question.type)} className="text-xs shrink-0">
                        {getQuestionTypeLabel(item.question.type)}
                      </Badge>
                      <p className="text-sm text-white line-clamp-2">
                        {item.question.content}
                      </p>
                    </div>
                  </div>
                  
                  {/* Score input */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Input
                      type="number"
                      value={item.score}
                      onChange={(e) => handleScoreChange(index, parseInt(e.target.value) || 0)}
                      className="w-16 text-center h-8"
                      min={0}
                    />
                    <span className="text-xs text-text-muted">分</span>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="h-8 w-8 p-0"
                    >
                      <ArrowUp size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === questions.length - 1}
                      className="h-8 w-8 p-0"
                    >
                      <ArrowDown size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveQuestion(index)}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
      
      {/* Question Picker Modal */}
      <QuestionPicker
        open={showQuestionPicker}
        onClose={() => setShowQuestionPicker(false)}
        onConfirm={handleAddQuestions}
        excludeIds={excludedQuestionIds}
        title="从题库选择题目"
      />
      
      {/* Question Form Modal - for creating new questions */}
      {/* Note: QuestionForm creates questions via API, then user can select from picker */}
      <QuestionForm
        open={showQuestionForm}
        onClose={() => setShowQuestionForm(false)}
        onSuccess={() => {
          setShowQuestionForm(false);
          // After creating a new question, open the picker so user can select it
          setShowQuestionPicker(true);
        }}
      />
    </>
  );
};

QuizBuilder.displayName = 'QuizBuilder';
