import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, X, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

import { useKnowledgeDetail } from '../api/get-admin-knowledge';
import { useLineTypeTags, useSystemTags, useOperationTags } from '../api/get-tags';
import { useCreateKnowledge, useUpdateKnowledge, usePublishKnowledge } from '../api/manage-knowledge';
import { showApiError } from '@/utils/error-handler';
import type { KnowledgeType, KnowledgeCreateRequest, KnowledgeUpdateRequest, Tag } from '@/types/api';

/**
 * 知识类型选项
 */
const KNOWLEDGE_TYPE_OPTIONS = [
  { value: 'EMERGENCY', label: '应急类' },
  { value: 'OTHER', label: '标准类' },
];

interface KnowledgeFormModalProps {
  /** 是否打开 */
  open: boolean;
  /** 知识ID（编辑模式时传入） */
  knowledgeId?: number;
  /** 默认知识类型（新建时使用） */
  defaultKnowledgeType?: KnowledgeType;
  /** 关闭回调 */
  onClose: () => void;
  /** 成功回调 */
  onSuccess?: () => void;
}

interface FormData {
  title: string;
  knowledge_type: KnowledgeType;
  line_type_id: number | undefined;
  fault_scenario: string;
  trigger_process: string;
  solution: string;
  verification_plan: string;
  recovery_plan: string;
  content: string;
  system_tag_names: string[];
  operation_tag_names: string[];
}

interface FormErrors {
  title?: string;
  knowledge_type?: string;
  line_type_id?: string;
  content?: string;
  emergency_content?: string;
}

/**
 * 知识文档表单弹窗
 * 使用 ShadCN UI 重构，保持原有视觉设计
 */
export const KnowledgeFormModalNew: React.FC<KnowledgeFormModalProps> = ({
  open,
  knowledgeId,
  defaultKnowledgeType = 'OTHER',
  onClose,
  onSuccess,
}) => {
  const isEdit = !!knowledgeId;

  // 表单状态
  const [formData, setFormData] = useState<FormData>({
    title: '',
    knowledge_type: defaultKnowledgeType,
    line_type_id: undefined,
    fault_scenario: '',
    trigger_process: '',
    solution: '',
    verification_plan: '',
    recovery_plan: '',
    content: '',
    system_tag_names: [],
    operation_tag_names: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [systemTagInput, setSystemTagInput] = useState('');
  const [operationTagInput, setOperationTagInput] = useState('');

  // API Hooks
  const { data: knowledgeDetail, isLoading: detailLoading } = useKnowledgeDetail(knowledgeId || 0);
  const { data: lineTypeTags = [] } = useLineTypeTags();
  const { data: systemTags = [] } = useSystemTags();
  const { data: operationTags = [] } = useOperationTags();
  const createKnowledge = useCreateKnowledge();
  const updateKnowledge = useUpdateKnowledge();
  const publishKnowledge = usePublishKnowledge();

  /**
   * 编辑模式下填充表单
   */
  useEffect(() => {
    if (isEdit && knowledgeDetail && open) {
      setFormData({
        title: knowledgeDetail.title,
        knowledge_type: knowledgeDetail.knowledge_type,
        line_type_id: knowledgeDetail.line_type?.id,
        fault_scenario: knowledgeDetail.fault_scenario || '',
        trigger_process: knowledgeDetail.trigger_process || '',
        solution: knowledgeDetail.solution || '',
        verification_plan: knowledgeDetail.verification_plan || '',
        recovery_plan: knowledgeDetail.recovery_plan || '',
        content: knowledgeDetail.content || '',
        system_tag_names: knowledgeDetail.system_tags?.map(t => t.name) || [],
        operation_tag_names: knowledgeDetail.operation_tags?.map(t => t.name) || [],
      });
    }
  }, [isEdit, knowledgeDetail, open]);

  /**
   * 新建模式下重置表单
   */
  useEffect(() => {
    if (!isEdit && open) {
      const defaultLineType = lineTypeTags.find(t => t.name === '其他');
      setFormData({
        title: '',
        knowledge_type: defaultKnowledgeType,
        line_type_id: defaultLineType?.id,
        fault_scenario: '',
        trigger_process: '',
        solution: '',
        verification_plan: '',
        recovery_plan: '',
        content: '',
        system_tag_names: [],
        operation_tag_names: [],
      });
      setErrors({});
    }
  }, [isEdit, open, lineTypeTags, defaultKnowledgeType]);

  /**
   * 添加自定义系统标签
   */
  const handleAddSystemTag = () => {
    if (!systemTagInput.trim()) return;
    if (!formData.system_tag_names.includes(systemTagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        system_tag_names: [...prev.system_tag_names, systemTagInput.trim()],
      }));
    }
    setSystemTagInput('');
  };

  /**
   * 添加自定义操作标签
   */
  const handleAddOperationTag = () => {
    if (!operationTagInput.trim()) return;
    if (!formData.operation_tag_names.includes(operationTagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        operation_tag_names: [...prev.operation_tag_names, operationTagInput.trim()],
      }));
    }
    setOperationTagInput('');
  };

  /**
   * 移除系统标签
   */
  const handleRemoveSystemTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      system_tag_names: prev.system_tag_names.filter(t => t !== tag),
    }));
  };

  /**
   * 移除操作标签
   */
  const handleRemoveOperationTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      operation_tag_names: prev.operation_tag_names.filter(t => t !== tag),
    }));
  };

  /**
   * 验证表单
   */
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = '请输入标题';
    }
    if (!formData.knowledge_type) {
      newErrors.knowledge_type = '请选择知识类型';
    }
    if (!formData.line_type_id) {
      newErrors.line_type_id = '请选择条线类型';
    }

    if (formData.knowledge_type === 'EMERGENCY') {
      const hasAnyContent = formData.fault_scenario ||
        formData.trigger_process ||
        formData.solution ||
        formData.verification_plan ||
        formData.recovery_plan;
      if (!hasAnyContent) {
        newErrors.emergency_content = '至少需要填写一个结构化字段';
      }
    } else {
      if (!formData.content.trim()) {
        newErrors.content = '请填写正文内容';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * 构建请求数据
   */
  const buildRequestData = (): KnowledgeCreateRequest | KnowledgeUpdateRequest => {
    const requestData: KnowledgeCreateRequest | KnowledgeUpdateRequest = {
      title: formData.title,
      knowledge_type: formData.knowledge_type,
      line_type_id: formData.line_type_id,
      system_tag_names: formData.system_tag_names,
      operation_tag_names: formData.operation_tag_names,
    };

    if (formData.knowledge_type === 'EMERGENCY') {
      requestData.fault_scenario = formData.fault_scenario || '';
      requestData.trigger_process = formData.trigger_process || '';
      requestData.solution = formData.solution || '';
      requestData.verification_plan = formData.verification_plan || '';
      requestData.recovery_plan = formData.recovery_plan || '';
      requestData.content = '';
    } else {
      requestData.content = formData.content || '';
      requestData.fault_scenario = '';
      requestData.trigger_process = '';
      requestData.solution = '';
      requestData.verification_plan = '';
      requestData.recovery_plan = '';
    }

    return requestData;
  };

  /**
   * 提交表单（保存为草稿）
   */
  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      const requestData = buildRequestData();

      if (isEdit && knowledgeId) {
        await updateKnowledge.mutateAsync({ id: knowledgeId, data: requestData });
        toast.success('保存成功（已保存为草稿）');
      } else {
        await createKnowledge.mutateAsync(requestData as KnowledgeCreateRequest);
        toast.success('创建成功（已保存为草稿）');
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      showApiError(error, isEdit ? '保存失败' : '创建失败');
    }
  };

  /**
   * 保存并发布
   */
  const handleSubmitAndPublish = async () => {
    if (!validate()) return;

    try {
      const requestData = buildRequestData();

      let savedKnowledgeId: number;
      if (isEdit && knowledgeId) {
        const result = await updateKnowledge.mutateAsync({ id: knowledgeId, data: requestData });
        savedKnowledgeId = result.id;
      } else {
        const result = await createKnowledge.mutateAsync(requestData as KnowledgeCreateRequest);
        savedKnowledgeId = result.id;
      }

      await publishKnowledge.mutateAsync(savedKnowledgeId);
      toast.success('保存并发布成功');

      onSuccess?.();
      onClose();
    } catch (error) {
      showApiError(error, '保存并发布失败');
    }
  };

  const isSubmitting = createKnowledge.isPending || updateKnowledge.isPending || publishKnowledge.isPending;

  /**
   * 渲染应急类知识表单
   */
  const renderEmergencyForm = () => (
    <div className="space-y-4">
      <Tabs defaultValue="fault" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="fault">故障场景</TabsTrigger>
          <TabsTrigger value="trigger">触发流程</TabsTrigger>
          <TabsTrigger value="solution">解决方案</TabsTrigger>
          <TabsTrigger value="verification">验证方案</TabsTrigger>
          <TabsTrigger value="recovery">恢复方案</TabsTrigger>
        </TabsList>
        <TabsContent value="fault" className="mt-4">
          <textarea
            className="w-full min-h-[200px] p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="描述故障发生的场景和现象..."
            maxLength={5000}
            value={formData.fault_scenario}
            onChange={(e) => setFormData(prev => ({ ...prev, fault_scenario: e.target.value }))}
          />
          <div className="text-right text-xs text-gray-400 mt-1">
            {formData.fault_scenario.length}/5000
          </div>
        </TabsContent>
        <TabsContent value="trigger" className="mt-4">
          <textarea
            className="w-full min-h-[200px] p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="描述故障的触发条件和流程..."
            maxLength={5000}
            value={formData.trigger_process}
            onChange={(e) => setFormData(prev => ({ ...prev, trigger_process: e.target.value }))}
          />
          <div className="text-right text-xs text-gray-400 mt-1">
            {formData.trigger_process.length}/5000
          </div>
        </TabsContent>
        <TabsContent value="solution" className="mt-4">
          <textarea
            className="w-full min-h-[200px] p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="描述故障的解决方案和操作步骤..."
            maxLength={5000}
            value={formData.solution}
            onChange={(e) => setFormData(prev => ({ ...prev, solution: e.target.value }))}
          />
          <div className="text-right text-xs text-gray-400 mt-1">
            {formData.solution.length}/5000
          </div>
        </TabsContent>
        <TabsContent value="verification" className="mt-4">
          <textarea
            className="w-full min-h-[200px] p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="描述如何验证故障已被解决..."
            maxLength={5000}
            value={formData.verification_plan}
            onChange={(e) => setFormData(prev => ({ ...prev, verification_plan: e.target.value }))}
          />
          <div className="text-right text-xs text-gray-400 mt-1">
            {formData.verification_plan.length}/5000
          </div>
        </TabsContent>
        <TabsContent value="recovery" className="mt-4">
          <textarea
            className="w-full min-h-[200px] p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="描述系统恢复后的操作和注意事项..."
            maxLength={5000}
            value={formData.recovery_plan}
            onChange={(e) => setFormData(prev => ({ ...prev, recovery_plan: e.target.value }))}
          />
          <div className="text-right text-xs text-gray-400 mt-1">
            {formData.recovery_plan.length}/5000
          </div>
        </TabsContent>
      </Tabs>
      {errors.emergency_content && (
        <p className="text-sm font-medium text-red-500">{errors.emergency_content}</p>
      )}
    </div>
  );

  /**
   * 渲染其他类型知识表单
   */
  const renderOtherForm = () => (
    <div className="space-y-2">
      <Label>正文内容</Label>
      <textarea
        className="w-full min-h-[300px] p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        placeholder="支持 Markdown 格式..."
        maxLength={50000}
        value={formData.content}
        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
      />
      <div className="text-right text-xs text-gray-400">
        {formData.content.length}/50000
      </div>
      {errors.content && (
        <p className="text-sm font-medium text-red-500">{errors.content}</p>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑知识文档' : '新建知识文档'}</DialogTitle>
        </DialogHeader>

        {isEdit && detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* 基础信息 */}
            <div className="space-y-2">
              <Label htmlFor="title">标题</Label>
              <Input
                id="title"
                placeholder="请输入知识文档标题"
                maxLength={200}
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
              <div className="text-right text-xs text-gray-400">
                {formData.title.length}/200
              </div>
              {errors.title && (
                <p className="text-sm font-medium text-red-500">{errors.title}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>知识类型</Label>
                <Select
                  value={formData.knowledge_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, knowledge_type: value as KnowledgeType }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择知识类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {KNOWLEDGE_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.knowledge_type && (
                  <p className="text-sm font-medium text-red-500">{errors.knowledge_type}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>条线类型</Label>
                <Select
                  value={formData.line_type_id?.toString() || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, line_type_id: Number(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择条线类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {lineTypeTags.map((tag: Tag) => (
                      <SelectItem key={tag.id} value={tag.id.toString()}>{tag.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.line_type_id && (
                  <p className="text-sm font-medium text-red-500">{errors.line_type_id}</p>
                )}
              </div>
            </div>

            {/* 标签 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>系统标签</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.system_tag_names.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveSystemTag(tag)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (value && !formData.system_tag_names.includes(value)) {
                        setFormData(prev => ({
                          ...prev,
                          system_tag_names: [...prev.system_tag_names, value],
                        }));
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="选择系统标签" />
                    </SelectTrigger>
                    <SelectContent>
                      {systemTags
                        .filter((tag: Tag) => !formData.system_tag_names.includes(tag.name))
                        .map((tag: Tag) => (
                          <SelectItem key={tag.name} value={tag.name}>{tag.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="新建标签"
                    value={systemTagInput}
                    onChange={(e) => setSystemTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSystemTag();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddSystemTag}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>操作标签</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.operation_tag_names.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveOperationTag(tag)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (value && !formData.operation_tag_names.includes(value)) {
                        setFormData(prev => ({
                          ...prev,
                          operation_tag_names: [...prev.operation_tag_names, value],
                        }));
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="选择操作标签" />
                    </SelectTrigger>
                    <SelectContent>
                      {operationTags
                        .filter((tag: Tag) => !formData.operation_tag_names.includes(tag.name))
                        .map((tag: Tag) => (
                          <SelectItem key={tag.name} value={tag.name}>{tag.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="新建标签"
                    value={operationTagInput}
                    onChange={(e) => setOperationTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddOperationTag();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddOperationTag}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* 内容区域 */}
            {formData.knowledge_type === 'EMERGENCY' ? renderEmergencyForm() : renderOtherForm()}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="outline"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? '保存' : '创建'}
          </Button>
          <Button
            onClick={handleSubmitAndPublish}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? '保存并发布' : '创建并发布'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
