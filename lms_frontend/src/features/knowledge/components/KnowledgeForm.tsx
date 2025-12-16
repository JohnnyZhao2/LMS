/**
 * KnowledgeForm Component
 * Form for creating and editing knowledge documents
 * Requirements: 17.2, 17.3, 17.4, 17.5, 17.6 - Knowledge create/edit form
 * Requirements: 22.4 - Responsive form layout
 */

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FormGrid, FormField } from '@/components/ui/FormLayout';
import { 
  useCreateKnowledge, 
  useUpdateKnowledge, 
  useKnowledgeCategories,
  type KnowledgeCreateRequest, 
  type KnowledgeUpdateRequest 
} from '../api/knowledge';
import type { Knowledge, KnowledgeType, EmergencyContent } from '@/types/domain';
import { AlertTriangle, BookOpen, X, Plus } from 'lucide-react';

export interface KnowledgeFormProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Knowledge to edit (null for create mode) */
  knowledge?: Knowledge | null;
  /** Callback when form is successfully submitted */
  onSuccess?: () => void;
}

interface FormData {
  title: string;
  summary: string;
  knowledge_type: KnowledgeType;
  primary_category_id: string;
  secondary_category_id: string;
  operation_tags: string[];
  // For OTHER type
  content: string;
  // For EMERGENCY type
  fault_scenario: string;
  trigger_process: string;
  solution: string;
  verification: string;
  recovery: string;
}

interface FormErrors {
  title?: string;
  summary?: string;
  knowledge_type?: string;
  primary_category_id?: string;
  content?: string;
  fault_scenario?: string;
  solution?: string;
}

const initialFormData: FormData = {
  title: '',
  summary: '',
  knowledge_type: 'OTHER',
  primary_category_id: '',
  secondary_category_id: '',
  operation_tags: [],
  content: '',
  fault_scenario: '',
  trigger_process: '',
  solution: '',
  verification: '',
  recovery: '',
};

export const KnowledgeForm: React.FC<KnowledgeFormProps> = ({
  open,
  onClose,
  knowledge,
  onSuccess,
}) => {
  const isEditMode = !!knowledge;
  
  const [formData, setFormData] = React.useState<FormData>(initialFormData);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [newTag, setNewTag] = React.useState('');
  
  const { data: categories } = useKnowledgeCategories();
  const createKnowledge = useCreateKnowledge();
  const updateKnowledge = useUpdateKnowledge();
  
  const isLoading = createKnowledge.isPending || updateKnowledge.isPending;
  
  // Get primary categories (level 1)
  const primaryCategories = React.useMemo(() => {
    if (!categories) return [];
    return categories.filter(cat => cat.level === 1);
  }, [categories]);
  
  // Get secondary categories based on selected primary
  const secondaryCategories = React.useMemo(() => {
    if (!categories || !formData.primary_category_id) return [];
    const primaryId = parseInt(formData.primary_category_id);
    const primaryCat = categories.find(cat => cat.id === primaryId);
    if (primaryCat?.children) {
      return primaryCat.children;
    }
    return categories.filter(cat => cat.level === 2 && cat.parent_id === primaryId);
  }, [categories, formData.primary_category_id]);
  
  // Reset form when modal opens/closes or knowledge changes
  React.useEffect(() => {
    if (open) {
      if (knowledge) {
        setFormData({
          title: knowledge.title,
          summary: knowledge.summary,
          knowledge_type: knowledge.knowledge_type,
          primary_category_id: knowledge.primary_category?.id?.toString() || '',
          secondary_category_id: knowledge.secondary_category?.id?.toString() || '',
          operation_tags: knowledge.operation_tags || [],
          content: knowledge.content || '',
          fault_scenario: knowledge.emergency_content?.fault_scenario || '',
          trigger_process: knowledge.emergency_content?.trigger_process || '',
          solution: knowledge.emergency_content?.solution || '',
          verification: knowledge.emergency_content?.verification || '',
          recovery: knowledge.emergency_content?.recovery || '',
        });
      } else {
        setFormData(initialFormData);
      }
      setErrors({});
      setNewTag('');
    }
  }, [open, knowledge]);
  
  // Reset secondary category when primary changes
  React.useEffect(() => {
    if (formData.secondary_category_id) {
      const isValid = secondaryCategories.some(
        cat => cat.id.toString() === formData.secondary_category_id
      );
      if (!isValid) {
        setFormData(prev => ({ ...prev, secondary_category_id: '' }));
      }
    }
  }, [formData.primary_category_id, secondaryCategories]);
  
  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };
  
  const handleSelectChange = (field: keyof FormData) => (value: string | string[]) => {
    const stringValue = Array.isArray(value) ? value[0] : value;
    setFormData(prev => ({ ...prev, [field]: stringValue }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };
  
  const handleTypeChange = (value: string | string[]) => {
    const type = (Array.isArray(value) ? value[0] : value) as KnowledgeType;
    setFormData(prev => ({ ...prev, knowledge_type: type }));
  };
  
  const handleAddTag = () => {
    const tag = newTag.trim();
    if (tag && !formData.operation_tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        operation_tags: [...prev.operation_tags, tag],
      }));
      setNewTag('');
    }
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      operation_tags: prev.operation_tags.filter(tag => tag !== tagToRemove),
    }));
  };
  
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };
  
  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = '请输入标题';
    }
    
    if (!formData.summary.trim()) {
      newErrors.summary = '请输入摘要';
    }
    
    if (!formData.primary_category_id) {
      newErrors.primary_category_id = '请选择一级分类';
    }
    
    // Validate based on knowledge type
    if (formData.knowledge_type === 'EMERGENCY') {
      if (!formData.fault_scenario.trim()) {
        newErrors.fault_scenario = '请输入故障场景';
      }
      if (!formData.solution.trim()) {
        newErrors.solution = '请输入解决方案';
      }
    } else {
      if (!formData.content.trim()) {
        newErrors.content = '请输入知识内容';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    try {
      const baseData = {
        title: formData.title,
        summary: formData.summary,
        knowledge_type: formData.knowledge_type,
        primary_category_id: parseInt(formData.primary_category_id),
        secondary_category_id: formData.secondary_category_id 
          ? parseInt(formData.secondary_category_id) 
          : undefined,
        operation_tags: formData.operation_tags,
      };
      
      if (formData.knowledge_type === 'EMERGENCY') {
        const emergencyContent: EmergencyContent = {
          fault_scenario: formData.fault_scenario || undefined,
          trigger_process: formData.trigger_process || undefined,
          solution: formData.solution || undefined,
          verification: formData.verification || undefined,
          recovery: formData.recovery || undefined,
        };
        
        if (isEditMode && knowledge) {
          await updateKnowledge.mutateAsync({
            id: knowledge.id,
            data: { ...baseData, emergency_content: emergencyContent } as KnowledgeUpdateRequest,
          });
        } else {
          await createKnowledge.mutateAsync({
            ...baseData,
            emergency_content: emergencyContent,
          } as KnowledgeCreateRequest);
        }
      } else {
        if (isEditMode && knowledge) {
          await updateKnowledge.mutateAsync({
            id: knowledge.id,
            data: { ...baseData, content: formData.content } as KnowledgeUpdateRequest,
          });
        } else {
          await createKnowledge.mutateAsync({
            ...baseData,
            content: formData.content,
          } as KnowledgeCreateRequest);
        }
      }
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };
  
  // Build select options
  const primaryCategoryOptions: SelectOption[] = [
    { value: '', label: '请选择一级分类' },
    ...primaryCategories.map(cat => ({
      value: cat.id.toString(),
      label: cat.name,
    })),
  ];
  
  const secondaryCategoryOptions: SelectOption[] = [
    { value: '', label: '请选择二级分类（可选）' },
    ...secondaryCategories.map(cat => ({
      value: cat.id.toString(),
      label: cat.name,
    })),
  ];
  
  const isEmergency = formData.knowledge_type === 'EMERGENCY';
  
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditMode ? '编辑知识文档' : '新建知识文档'}
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
        {/* Knowledge Type Selection */}
        {/* Requirements: 17.2 - Knowledge type selection */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => handleTypeChange('OTHER')}
            className={`flex-1 p-4 rounded-lg border-2 transition-all ${
              !isEmergency
                ? 'border-primary bg-primary/10'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <BookOpen className={`mx-auto mb-2 ${!isEmergency ? 'text-primary' : 'text-text-muted'}`} size={24} />
            <div className={`font-medium ${!isEmergency ? 'text-white' : 'text-text-muted'}`}>
              普通知识
            </div>
            <div className="text-xs text-text-muted mt-1">
              使用 Markdown 编辑内容
            </div>
          </button>
          
          <button
            type="button"
            onClick={() => handleTypeChange('EMERGENCY')}
            className={`flex-1 p-4 rounded-lg border-2 transition-all ${
              isEmergency
                ? 'border-red-500 bg-red-500/10'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <AlertTriangle className={`mx-auto mb-2 ${isEmergency ? 'text-red-400' : 'text-text-muted'}`} size={24} />
            <div className={`font-medium ${isEmergency ? 'text-white' : 'text-text-muted'}`}>
              应急预案
            </div>
            <div className="text-xs text-text-muted mt-1">
              结构化字段表单
            </div>
          </button>
        </div>
        
        {/* Basic Info */}
        <Input
          label="标题"
          placeholder="请输入知识文档标题"
          value={formData.title}
          onChange={handleInputChange('title')}
          error={errors.title}
          disabled={isLoading}
        />
        
        <Textarea
          label="摘要"
          placeholder="请输入知识文档摘要"
          value={formData.summary}
          onChange={handleInputChange('summary')}
          error={errors.summary}
          disabled={isLoading}
          rows={3}
        />
        
        {/* Category Selection */}
        {/* Requirements: 17.5 - Category tags, 22.4 - Responsive layout */}
        <FormGrid columns={2} gap={4}>
          <FormField>
            <Select
              label="一级分类"
              options={primaryCategoryOptions}
              value={formData.primary_category_id}
              onChange={handleSelectChange('primary_category_id')}
              error={errors.primary_category_id}
              disabled={isLoading}
            />
          </FormField>
          
          <FormField>
            <Select
              label="二级分类"
              options={secondaryCategoryOptions}
              value={formData.secondary_category_id}
              onChange={handleSelectChange('secondary_category_id')}
              disabled={isLoading || !formData.primary_category_id}
            />
          </FormField>
        </FormGrid>
        
        {/* Operation Tags */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            操作标签
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.operation_tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-red-400"
                >
                  <X size={12} />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="输入标签后按回车添加"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleTagKeyDown}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddTag}
              disabled={isLoading || !newTag.trim()}
            >
              <Plus size={16} />
            </Button>
          </div>
        </div>
        
        {/* Content based on type */}
        {isEmergency ? (
          /* Requirements: 17.3 - Emergency type structured fields */
          <div className="space-y-4 p-4 bg-red-500/5 rounded-lg border border-red-500/20">
            <h4 className="font-medium text-red-400 flex items-center gap-2">
              <AlertTriangle size={16} />
              应急预案内容
            </h4>
            
            <Textarea
              label="故障场景 *"
              placeholder="描述故障发生的场景和现象"
              value={formData.fault_scenario}
              onChange={handleInputChange('fault_scenario')}
              error={errors.fault_scenario}
              disabled={isLoading}
              rows={3}
            />
            
            <Textarea
              label="触发流程"
              placeholder="描述故障触发的流程和条件"
              value={formData.trigger_process}
              onChange={handleInputChange('trigger_process')}
              disabled={isLoading}
              rows={3}
            />
            
            <Textarea
              label="解决方案 *"
              placeholder="描述解决故障的具体步骤"
              value={formData.solution}
              onChange={handleInputChange('solution')}
              error={errors.solution}
              disabled={isLoading}
              rows={4}
            />
            
            <Textarea
              label="验证方案"
              placeholder="描述如何验证故障已解决"
              value={formData.verification}
              onChange={handleInputChange('verification')}
              disabled={isLoading}
              rows={3}
            />
            
            <Textarea
              label="恢复方案"
              placeholder="描述系统恢复的步骤"
              value={formData.recovery}
              onChange={handleInputChange('recovery')}
              disabled={isLoading}
              rows={3}
            />
          </div>
        ) : (
          /* Requirements: 17.4 - Other type Markdown editor */
          <Textarea
            label="知识内容 (支持 Markdown)"
            placeholder="请输入知识内容，支持 Markdown 格式..."
            value={formData.content}
            onChange={handleInputChange('content')}
            error={errors.content}
            disabled={isLoading}
            rows={12}
            className="font-mono text-sm"
          />
        )}
      </form>
    </Modal>
  );
};

KnowledgeForm.displayName = 'KnowledgeForm';
