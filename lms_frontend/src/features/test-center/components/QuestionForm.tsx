/**
 * QuestionForm Component
 * Form for creating and editing questions
 * Requirements: 12.3, 12.4 - Support four question types with options, answer, explanation
 */

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import type { SelectOption } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { 
  useCreateQuestion, 
  useUpdateQuestion,
  type QuestionCreateRequest,
  type QuestionUpdateRequest,
} from '../api/questions';
import type { Question, QuestionType } from '@/types/domain';
import { Plus, Trash2, Circle, ListChecks, ToggleLeft, FileText } from 'lucide-react';

// Simple Radio Button component for individual use
interface RadioButtonProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

const RadioButton: React.FC<RadioButtonProps> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    onClick={onChange}
    disabled={disabled}
    className={`h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${
      checked ? 'border-primary' : 'bg-background-secondary border-input'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    {checked && <div className="h-2 w-2 rounded-full bg-primary" />}
  </button>
);

export interface QuestionFormProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Question to edit (null for create mode) */
  question?: Question | null;
  /** Callback when form is successfully submitted */
  onSuccess?: () => void;
}

interface FormOption {
  key: string;
  content: string;
}

interface FormData {
  type: QuestionType;
  content: string;
  options: FormOption[];
  answer: string | string[];
  explanation: string;
}

interface FormErrors {
  content?: string;
  options?: string;
  answer?: string;
  explanation?: string;
}

const DEFAULT_OPTIONS: FormOption[] = [
  { key: 'A', content: '' },
  { key: 'B', content: '' },
  { key: 'C', content: '' },
  { key: 'D', content: '' },
];

const TRUE_FALSE_OPTIONS: FormOption[] = [
  { key: 'A', content: '正确' },
  { key: 'B', content: '错误' },
];

const initialFormData: FormData = {
  type: 'SINGLE_CHOICE',
  content: '',
  options: [...DEFAULT_OPTIONS],
  answer: '',
  explanation: '',
};

const QUESTION_TYPE_OPTIONS: SelectOption[] = [
  { value: 'SINGLE_CHOICE', label: '单选题' },
  { value: 'MULTIPLE_CHOICE', label: '多选题' },
  { value: 'TRUE_FALSE', label: '判断题' },
  { value: 'SHORT_ANSWER', label: '简答题' },
];


export const QuestionForm: React.FC<QuestionFormProps> = ({
  open,
  onClose,
  question,
  onSuccess,
}) => {
  const isEditMode = !!question;
  
  const [formData, setFormData] = React.useState<FormData>(initialFormData);
  const [errors, setErrors] = React.useState<FormErrors>({});
  
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  
  const isLoading = createQuestion.isPending || updateQuestion.isPending;
  
  // Reset form when modal opens/closes or question changes
  React.useEffect(() => {
    if (open) {
      if (question) {
        // Edit mode - populate form with existing data
        let options = question.options || [];
        if (question.type === 'TRUE_FALSE') {
          options = TRUE_FALSE_OPTIONS;
        } else if (question.type !== 'SHORT_ANSWER' && options.length === 0) {
          options = [...DEFAULT_OPTIONS];
        }
        
        setFormData({
          type: question.type,
          content: question.content,
          options,
          answer: question.answer,
          explanation: question.explanation,
        });
      } else {
        // Create mode - reset to initial
        setFormData({
          ...initialFormData,
          options: [...DEFAULT_OPTIONS],
        });
      }
      setErrors({});
    }
  }, [open, question]);
  
  // Handle type change - reset options and answer appropriately
  const handleTypeChange = (value: string | string[]) => {
    const newType = (Array.isArray(value) ? value[0] : value) as QuestionType;
    
    let newOptions: FormOption[] = [];
    let newAnswer: string | string[] = '';
    
    switch (newType) {
      case 'SINGLE_CHOICE':
        newOptions = formData.type === 'MULTIPLE_CHOICE' ? formData.options : [...DEFAULT_OPTIONS];
        newAnswer = '';
        break;
      case 'MULTIPLE_CHOICE':
        newOptions = formData.type === 'SINGLE_CHOICE' ? formData.options : [...DEFAULT_OPTIONS];
        newAnswer = [];
        break;
      case 'TRUE_FALSE':
        newOptions = TRUE_FALSE_OPTIONS;
        newAnswer = '';
        break;
      case 'SHORT_ANSWER':
        newOptions = [];
        newAnswer = '';
        break;
    }
    
    setFormData(prev => ({
      ...prev,
      type: newType,
      options: newOptions,
      answer: newAnswer,
    }));
    setErrors({});
  };
  
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, content: e.target.value }));
    if (errors.content) {
      setErrors(prev => ({ ...prev, content: undefined }));
    }
  };
  
  const handleExplanationChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, explanation: e.target.value }));
    if (errors.explanation) {
      setErrors(prev => ({ ...prev, explanation: undefined }));
    }
  };
  
  const handleOptionContentChange = (index: number, content: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => 
        i === index ? { ...opt, content } : opt
      ),
    }));
    if (errors.options) {
      setErrors(prev => ({ ...prev, options: undefined }));
    }
  };
  
  const handleAddOption = () => {
    const nextKey = String.fromCharCode(65 + formData.options.length); // A, B, C, D, E...
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { key: nextKey, content: '' }],
    }));
  };
  
  const handleRemoveOption = (index: number) => {
    if (formData.options.length <= 2) return; // Minimum 2 options
    
    const removedKey = formData.options[index].key;
    const newOptions = formData.options
      .filter((_, i) => i !== index)
      .map((opt, i) => ({ ...opt, key: String.fromCharCode(65 + i) })); // Re-key A, B, C...
    
    // Update answer if removed option was selected
    let newAnswer = formData.answer;
    if (Array.isArray(newAnswer)) {
      newAnswer = newAnswer.filter(a => a !== removedKey);
    } else if (newAnswer === removedKey) {
      newAnswer = '';
    }
    
    setFormData(prev => ({
      ...prev,
      options: newOptions,
      answer: newAnswer,
    }));
  };
  
  const handleSingleAnswerChange = (key: string) => {
    setFormData(prev => ({ ...prev, answer: key }));
    if (errors.answer) {
      setErrors(prev => ({ ...prev, answer: undefined }));
    }
  };
  
  const handleMultipleAnswerChange = (key: string, checked: boolean) => {
    setFormData(prev => {
      const currentAnswers = Array.isArray(prev.answer) ? prev.answer : [];
      const newAnswers = checked
        ? [...currentAnswers, key]
        : currentAnswers.filter(a => a !== key);
      return { ...prev, answer: newAnswers };
    });
    if (errors.answer) {
      setErrors(prev => ({ ...prev, answer: undefined }));
    }
  };
  
  const handleShortAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, answer: e.target.value }));
    if (errors.answer) {
      setErrors(prev => ({ ...prev, answer: undefined }));
    }
  };
  
  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.content.trim()) {
      newErrors.content = '请输入题目内容';
    }
    
    // Validate options for choice questions
    if (formData.type !== 'SHORT_ANSWER') {
      const emptyOptions = formData.options.filter(opt => !opt.content.trim());
      if (emptyOptions.length > 0) {
        newErrors.options = '请填写所有选项内容';
      }
    }
    
    // Validate answer
    if (formData.type === 'SHORT_ANSWER') {
      if (typeof formData.answer === 'string' && !formData.answer.trim()) {
        newErrors.answer = '请输入参考答案';
      }
    } else if (formData.type === 'MULTIPLE_CHOICE') {
      if (!Array.isArray(formData.answer) || formData.answer.length === 0) {
        newErrors.answer = '请选择至少一个正确答案';
      }
    } else {
      if (!formData.answer) {
        newErrors.answer = '请选择正确答案';
      }
    }
    
    if (!formData.explanation.trim()) {
      newErrors.explanation = '请输入答案解析';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    try {
      const requestData: QuestionCreateRequest = {
        type: formData.type,
        content: formData.content,
        options: formData.type !== 'SHORT_ANSWER' ? formData.options : undefined,
        answer: formData.answer,
        explanation: formData.explanation,
      };
      
      if (isEditMode && question) {
        await updateQuestion.mutateAsync({
          id: question.id,
          data: requestData as QuestionUpdateRequest,
        });
      } else {
        await createQuestion.mutateAsync(requestData);
      }
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };
  
  const getTypeIcon = (type: QuestionType) => {
    switch (type) {
      case 'SINGLE_CHOICE': return <Circle size={20} />;
      case 'MULTIPLE_CHOICE': return <ListChecks size={20} />;
      case 'TRUE_FALSE': return <ToggleLeft size={20} />;
      case 'SHORT_ANSWER': return <FileText size={20} />;
    }
  };
  
  const needsOptions = formData.type !== 'SHORT_ANSWER';
  const isMultipleChoice = formData.type === 'MULTIPLE_CHOICE';
  const isTrueFalse = formData.type === 'TRUE_FALSE';
  
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditMode ? '编辑题目' : '新建题目'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            取消
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            loading={isLoading}
          >
            {isEditMode ? '保存' : '创建'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5 max-h-[70vh] overflow-y-auto pr-2">
        {/* Question Type Selection */}
        {/* Requirements: 12.3 - Support four question types */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            题目类型
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {QUESTION_TYPE_OPTIONS.map((option) => {
              const isSelected = formData.type === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleTypeChange(option.value)}
                  disabled={isEditMode} // Can't change type when editing
                  className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-white/10 hover:border-white/20 text-text-muted'
                  } ${isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {getTypeIcon(option.value as QuestionType)}
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Question Content */}
        <Textarea
          label="题目内容"
          placeholder="请输入题目内容..."
          value={formData.content}
          onChange={handleContentChange}
          error={errors.content}
          disabled={isLoading}
          rows={4}
        />
        
        {/* Options Section (for choice questions) */}
        {/* Requirements: 12.4 - Options input */}
        {needsOptions && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              选项 {isMultipleChoice && <span className="text-text-muted">(可多选)</span>}
            </label>
            {errors.options && (
              <p className="text-sm text-red-400 mb-2">{errors.options}</p>
            )}
            <div className="space-y-3">
              {formData.options.map((option, index) => (
                <div key={option.key} className="flex items-start gap-3">
                  {/* Answer selector */}
                  <div className="pt-2.5">
                    {isMultipleChoice ? (
                      <Checkbox
                        checked={Array.isArray(formData.answer) && formData.answer.includes(option.key)}
                        onChange={(e) => handleMultipleAnswerChange(option.key, e.target.checked)}
                        disabled={isLoading}
                      />
                    ) : (
                      <RadioButton
                        checked={formData.answer === option.key}
                        onChange={() => handleSingleAnswerChange(option.key)}
                        disabled={isLoading}
                      />
                    )}
                  </div>
                  
                  {/* Option key label */}
                  <div className="w-8 h-10 flex items-center justify-center text-sm font-mono font-bold text-text-muted">
                    {option.key}.
                  </div>
                  
                  {/* Option content input */}
                  <div className="flex-1">
                    <Input
                      placeholder={`选项 ${option.key} 内容`}
                      value={option.content}
                      onChange={(e) => handleOptionContentChange(index, e.target.value)}
                      disabled={isLoading || isTrueFalse}
                    />
                  </div>
                  
                  {/* Remove option button (not for TRUE_FALSE) */}
                  {!isTrueFalse && formData.options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveOption(index)}
                      disabled={isLoading}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              ))}
              
              {/* Add option button (not for TRUE_FALSE) */}
              {!isTrueFalse && formData.options.length < 8 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddOption}
                  disabled={isLoading}
                  className="w-full border border-dashed border-white/10 hover:border-white/20"
                >
                  <Plus size={16} className="mr-2" />
                  添加选项
                </Button>
              )}
            </div>
            {errors.answer && (
              <p className="text-sm text-red-400 mt-2">{errors.answer}</p>
            )}
          </div>
        )}
        
        {/* Short Answer Reference */}
        {/* Requirements: 12.4 - Answer input for short answer */}
        {formData.type === 'SHORT_ANSWER' && (
          <Textarea
            label="参考答案"
            placeholder="请输入参考答案..."
            value={typeof formData.answer === 'string' ? formData.answer : ''}
            onChange={handleShortAnswerChange}
            error={errors.answer}
            disabled={isLoading}
            rows={4}
          />
        )}
        
        {/* Explanation */}
        {/* Requirements: 12.4 - Explanation input */}
        <Textarea
          label="答案解析"
          placeholder="请输入答案解析，帮助学员理解正确答案..."
          value={formData.explanation}
          onChange={handleExplanationChange}
          error={errors.explanation}
          disabled={isLoading}
          rows={3}
        />
      </form>
    </Modal>
  );
};

QuestionForm.displayName = 'QuestionForm';
