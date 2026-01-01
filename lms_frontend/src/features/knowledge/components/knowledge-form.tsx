import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import {
  X,
  FileText,
  Settings,
  CheckCircle,
  Plus,
  Save,
  Send,
  PanelLeftClose,
  PanelLeft,
  Loader2,
  ListOrdered,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import { useKnowledgeDetail } from '../api/get-admin-knowledge';
import { useLineTypeTags, useSystemTags, useOperationTags } from '../api/get-tags';
import { useCreateKnowledge, useUpdateKnowledge, usePublishKnowledge } from '../api/manage-knowledge';
import { EMERGENCY_TABS, parseOutlineFromHtml } from '../utils';
import { showApiError } from '@/utils/error-handler';
import { ROUTES } from '@/config/routes';
import type { KnowledgeType, KnowledgeCreateRequest, KnowledgeUpdateRequest, Tag } from '@/types/api';
import { RichTextEditor } from './rich-text-editor';

/**
 * 知识类型选项
 */
const KNOWLEDGE_TYPE_OPTIONS = [
  { value: 'EMERGENCY', label: '应急类' },
  { value: 'OTHER', label: '标准类' },
];

/**
 * 知识表单组件 - ShadCN UI 版本
 */
export const KnowledgeForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  // API Hooks
  const { data: knowledgeDetail, isLoading: detailLoading } = useKnowledgeDetail(Number(id));
  const { data: lineTypeTags = [] } = useLineTypeTags();
  const createKnowledge = useCreateKnowledge();
  const updateKnowledge = useUpdateKnowledge();
  const publishKnowledge = usePublishKnowledge();

  const [outlineCollapsed, setOutlineCollapsed] = useState(false);

  // 表单状态
  const [title, setTitle] = useState('');
  const [knowledgeType, setKnowledgeType] = useState<KnowledgeType>('OTHER');
  const [lineTypeId, setLineTypeId] = useState<number | undefined>();
  const [systemTagNames, setSystemTagNames] = useState<string[]>([]);
  const [operationTagNames, setOperationTagNames] = useState<string[]>([]);

  const { data: systemTags = [] } = useSystemTags();
  const { data: operationTags = [] } = useOperationTags();

  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [faultScenario, setFaultScenario] = useState('');
  const [triggerProcess, setTriggerProcess] = useState('');
  const [solution, setSolution] = useState('');
  const [verificationPlan, setVerificationPlan] = useState('');
  const [recoveryPlan, setRecoveryPlan] = useState('');

  const [activeEmergencyTab, setActiveEmergencyTab] = useState('fault_scenario');
  const [systemTagInput, setSystemTagInput] = useState('');
  const [operationTagInput, setOperationTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 编辑模式下填充数据
  useEffect(() => {
    if (isEdit && knowledgeDetail) {
      setTitle(knowledgeDetail.title || '');
      setKnowledgeType(knowledgeDetail.knowledge_type);
      setLineTypeId(knowledgeDetail.line_type?.id);
      setSystemTagNames(knowledgeDetail.system_tags?.map((t) => t.name) || []);
      setOperationTagNames(knowledgeDetail.operation_tags?.map((t) => t.name) || []);
      setContent(knowledgeDetail.content || '');
      setSummary(knowledgeDetail.summary || '');
      setFaultScenario(knowledgeDetail.fault_scenario || '');
      setTriggerProcess(knowledgeDetail.trigger_process || '');
      setSolution(knowledgeDetail.solution || '');
      setVerificationPlan(knowledgeDetail.verification_plan || '');
      setRecoveryPlan(knowledgeDetail.recovery_plan || '');
    }
  }, [isEdit, knowledgeDetail]);

  // 新建模式下设置默认值
  useEffect(() => {
    if (!isEdit && lineTypeTags.length > 0) {
      const defaultLineType = lineTypeTags.find((t: Tag) => t.name === '其他');
      if (defaultLineType && !lineTypeId) {
        setLineTypeId(defaultLineType.id);
      }
    }
  }, [isEdit, lineTypeTags, lineTypeId]);



  const handleClose = useCallback(() => {
    navigate(ROUTES.ADMIN_KNOWLEDGE);
  }, [navigate]);

  const getCurrentEmergencyContent = useCallback(() => {
    switch (activeEmergencyTab) {
      case 'fault_scenario': return faultScenario;
      case 'trigger_process': return triggerProcess;
      case 'solution': return solution;
      case 'verification_plan': return verificationPlan;
      case 'recovery_plan': return recoveryPlan;
      default: return '';
    }
  }, [activeEmergencyTab, faultScenario, triggerProcess, solution, verificationPlan, recoveryPlan]);

  const setCurrentEmergencyContent = useCallback((value: string) => {
    switch (activeEmergencyTab) {
      case 'fault_scenario': setFaultScenario(value); break;
      case 'trigger_process': setTriggerProcess(value); break;
      case 'solution': setSolution(value); break;
      case 'verification_plan': setVerificationPlan(value); break;
      case 'recovery_plan': setRecoveryPlan(value); break;
    }
  }, [activeEmergencyTab]);


  const handleAddSystemTag = useCallback(() => {
    if (!systemTagInput.trim()) return;
    if (!systemTagNames.includes(systemTagInput.trim())) {
      setSystemTagNames(prev => [...prev, systemTagInput.trim()]);
    }
    setSystemTagInput('');
  }, [systemTagInput, systemTagNames]);

  const handleAddOperationTag = useCallback(() => {
    if (!operationTagInput.trim()) return;
    if (!operationTagNames.includes(operationTagInput.trim())) {
      setOperationTagNames(prev => [...prev, operationTagInput.trim()]);
    }
    setOperationTagInput('');
  }, [operationTagInput, operationTagNames]);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = '请输入标题';
    }
    if (!lineTypeId) {
      newErrors.lineTypeId = '请选择条线类型';
    }

    if (knowledgeType === 'OTHER' && !content.trim()) {
      newErrors.content = '请填写正文内容';
    }

    if (knowledgeType === 'EMERGENCY') {
      const hasAnyContent = faultScenario || triggerProcess || solution || verificationPlan || recoveryPlan;
      if (!hasAnyContent) {
        newErrors.emergency = '至少需要填写一个结构化字段';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, lineTypeId, knowledgeType, content, faultScenario, triggerProcess, solution, verificationPlan, recoveryPlan]);

  const buildRequestData = useCallback((): KnowledgeCreateRequest | KnowledgeUpdateRequest => {
    const requestData: KnowledgeCreateRequest | KnowledgeUpdateRequest = {
      title,
      knowledge_type: knowledgeType,
      line_type_id: lineTypeId!,
      system_tag_names: systemTagNames,
      operation_tag_names: operationTagNames,
      summary,
    };

    if (knowledgeType === 'EMERGENCY') {
      requestData.fault_scenario = faultScenario;
      requestData.trigger_process = triggerProcess;
      requestData.solution = solution;
      requestData.verification_plan = verificationPlan;
      requestData.recovery_plan = recoveryPlan;
      requestData.content = '';
    } else {
      requestData.content = content;
      requestData.fault_scenario = '';
      requestData.trigger_process = '';
      requestData.solution = '';
      requestData.verification_plan = '';
      requestData.recovery_plan = '';
    }

    return requestData;
  }, [
    title, knowledgeType, lineTypeId, systemTagNames, operationTagNames,
    content, summary, faultScenario, triggerProcess, solution, verificationPlan, recoveryPlan
  ]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      toast.error('请检查表单填写是否完整');
      return;
    }

    const requestData = buildRequestData();

    try {
      if (isEdit && id) {
        await updateKnowledge.mutateAsync({ id: Number(id), data: requestData });
        toast.success('保存成功');
      } else {
        const result = await createKnowledge.mutateAsync(requestData as KnowledgeCreateRequest);
        toast.success('创建成功');
        navigate(`${ROUTES.ADMIN_KNOWLEDGE}/${result.id}/edit`, { replace: true });
      }
    } catch (error) {
      showApiError(error, isEdit ? '保存失败' : '创建失败');
    }
  }, [validateForm, buildRequestData, isEdit, id, updateKnowledge, createKnowledge, navigate]);

  const handlePublish = useCallback(async () => {
    if (!validateForm()) {
      toast.error('请检查表单填写是否完整');
      return;
    }

    const requestData = buildRequestData();

    try {
      let savedId: number;

      if (isEdit && id) {
        const result = await updateKnowledge.mutateAsync({ id: Number(id), data: requestData });
        savedId = result.id;
      } else {
        const result = await createKnowledge.mutateAsync(requestData as KnowledgeCreateRequest);
        savedId = result.id;
      }

      await publishKnowledge.mutateAsync(savedId);
      toast.success('发布成功');
      navigate(ROUTES.ADMIN_KNOWLEDGE);
    } catch (error) {
      showApiError(error, '发布失败');
    }
  }, [validateForm, buildRequestData, isEdit, id, updateKnowledge, createKnowledge, publishKnowledge, navigate]);

  const isSubmitting = createKnowledge.isPending || updateKnowledge.isPending || publishKnowledge.isPending;

  const breadcrumbInfo = useMemo(() => {
    const lineType = lineTypeTags.find((t: Tag) => t.id === lineTypeId);
    return {
      lineTypeName: lineType?.name || '未分类',
      documentTitle: title || (isEdit ? '编辑知识' : '新建知识'),
    };
  }, [lineTypeTags, lineTypeId, title, isEdit]);

  const statusInfo = useMemo(() => {
    if (!isEdit) return { label: '草稿', isDraft: true };
    if (!knowledgeDetail) return { label: '草稿', isDraft: true };
    return {
      label: knowledgeDetail.status === 'PUBLISHED' ? '已发布' : '草稿',
      isDraft: knowledgeDetail.status !== 'PUBLISHED',
    };
  }, [isEdit, knowledgeDetail]);

  const outline = useMemo(() => {
    if (knowledgeType === 'EMERGENCY') {
      return EMERGENCY_TABS.map((tab) => ({
        id: tab.key,
        level: 1,
        text: tab.label,
      }));
    }
    return parseOutlineFromHtml(content);
  }, [knowledgeType, content]);

  if (isEdit && detailLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-100 z-[1000]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }


  return createPortal(
    <div className="fixed inset-0 flex flex-col bg-gray-100 z-[1000] animate-fadeIn" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between h-16 px-6 bg-white border-b-2 border-gray-200 shrink-0">
        <div className="flex items-center gap-4">
          <button
            className="w-10 h-10 flex items-center justify-center bg-gray-100 border-none rounded-md text-gray-600 cursor-pointer transition-all duration-200 hover:bg-gray-200 hover:text-gray-900 hover:scale-105"
            onClick={handleClose}
            title="返回"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span
              className="text-gray-500 cursor-pointer transition-colors hover:text-gray-700"
              onClick={handleClose}
            >
              知识库
            </span>
            <span className="text-gray-300">/</span>
            <span className="text-gray-500">{breadcrumbInfo.lineTypeName}</span>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 font-medium">{breadcrumbInfo.documentTitle}</span>
          </div>
        </div>

        {/* 状态和操作按钮 */}

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold ${statusInfo.isDraft
              ? 'bg-amber-100 text-amber-700'
              : 'bg-emerald-100 text-emerald-700'
              }`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: 'currentColor' }}
            />
            <span>{statusInfo.label}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSubmitting}
            className="h-14 px-6 font-semibold"
          >
            <Save className="w-4 h-4 mr-2" />
            保存草稿
          </Button>

          <Button
            size="sm"
            onClick={handlePublish}
            disabled={isSubmitting}
            className="h-14 px-6 font-semibold"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {isSubmitting ? '处理中...' : '保存并发布'}
          </Button>
        </div>
      </div>

      {/* 主体内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧目录导航 */}
        <div className="flex flex-col m-4 mr-2 shrink-0">
          {outlineCollapsed ? (
            <button
              className="flex items-center justify-center w-10 h-10 bg-white border-none rounded-md cursor-pointer text-gray-600 transition-all duration-200 hover:bg-gray-100 hover:text-blue-600 hover:scale-105"
              onClick={() => setOutlineCollapsed(false)}
              title="展开目录"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-[200px] bg-white rounded-lg border-2 border-gray-200 overflow-hidden flex flex-col shrink-0 min-h-[200px] max-h-[400px]">
              <div className="flex items-center justify-between px-4 py-3 border-b-2 border-gray-200 text-xs font-bold text-gray-700 uppercase tracking-wider shrink-0 bg-gray-50">
                <div className="flex items-center whitespace-nowrap overflow-hidden">
                  <ListOrdered className="w-4 h-4 mr-2" />
                  目录
                </div>
                <button
                  className="flex items-center justify-center w-6 h-6 p-0 border-none bg-transparent text-gray-500 cursor-pointer rounded-md transition-all duration-200 hover:bg-gray-200 hover:text-gray-700 shrink-0"
                  onClick={() => setOutlineCollapsed(true)}
                  title="折叠目录"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                {outline.length > 0 ? (
                  outline.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-2 py-2.5 text-sm text-gray-700 cursor-pointer transition-all duration-200 border-l-2 border-transparent hover:bg-blue-50 hover:text-blue-600 ${item.level === 1 ? 'px-4 font-semibold' : item.level === 2 ? 'pl-6 pr-4' : 'pl-8 pr-4 text-xs'
                        } ${knowledgeType === 'EMERGENCY' && activeEmergencyTab === item.id
                          ? 'bg-blue-100 text-blue-700 border-l-blue-600'
                          : ''
                        }`}
                      onClick={() => {
                        if (knowledgeType === 'EMERGENCY') {
                          setActiveEmergencyTab(item.id);
                        }
                      }}
                    >
                      <span className="text-[11px] font-mono font-semibold text-gray-400 shrink-0 min-w-6 text-right">
                        {'#'.repeat(item.level)}
                      </span>
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap">{item.text}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-xs text-gray-500 text-center font-medium">
                    {knowledgeType === 'EMERGENCY'
                      ? '选择章节开始编辑'
                      : '使用标题按钮创建标题'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 中间编辑区 */}
        <div className="flex-1 flex flex-col bg-white m-4 mr-2 rounded-lg border-2 border-gray-200 min-h-0 overflow-hidden">
          {/* 编辑器头部 */}
          <div className="flex items-center px-6 py-4 border-b-2 border-gray-200 shrink-0 bg-gray-50">
            <span className="text-sm font-bold text-gray-900">
              {knowledgeType === 'EMERGENCY' ? '应急知识内容' : '知识内容'}
            </span>
          </div>

          {/* 编辑内容 */}
          {knowledgeType === 'EMERGENCY' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex px-6 border-b-2 border-gray-200 overflow-x-auto gap-1 bg-gray-50">
                {EMERGENCY_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    className={`px-5 py-3 bg-transparent border-none border-b-2 border-transparent text-gray-600 text-sm font-semibold cursor-pointer transition-all duration-200 whitespace-nowrap hover:text-blue-600 ${activeEmergencyTab === tab.key
                      ? 'text-blue-600 border-b-blue-600 bg-blue-50'
                      : ''
                      }`}
                    onClick={() => setActiveEmergencyTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto">
                <RichTextEditor
                  value={getCurrentEmergencyContent()}
                  onChange={setCurrentEmergencyContent}
                  placeholder={`在此编辑${EMERGENCY_TABS.find(t => t.key === activeEmergencyTab)?.label}内容...`}
                />
              </div>
              {errors.emergency && <div className="text-sm font-semibold text-red-600 px-6 pb-4">{errors.emergency}</div>}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="在此编辑知识内容..."
              />
              {errors.content && <div className="text-sm font-semibold text-red-600 px-6 pb-4">{errors.content}</div>}
            </div>
          )}
        </div>

        {/* 右侧元数据面板 */}
        <div className="w-[360px] flex flex-col bg-white m-4 ml-2 rounded-lg border-2 border-gray-200 overflow-y-auto shrink-0">
          {/* 基本信息 */}
          <div className="p-6 border-b-2 border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 flex items-center justify-center bg-blue-600 rounded-md">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-gray-900">基本信息</span>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">标题</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入知识文档标题"
              />
              {errors.title && <div className="text-sm font-semibold text-red-600 mt-2">{errors.title}</div>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">知识概要</label>
              <textarea
                className="w-full p-4 bg-gray-100 border-none rounded-md text-sm leading-relaxed resize-y min-h-[100px] transition-all duration-200 focus:outline-none focus:bg-white focus:border-2 focus:border-blue-600"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="简要描述这篇知识的核心内容（用于卡片预览展示）"
                rows={2}
                maxLength={500}
                style={{ fontFamily: "'Outfit', sans-serif" }}
              />
              <div className="text-xs text-gray-500 mt-2 text-right font-medium">{summary.length}/500 字符</div>
            </div>
          </div>

          {/* 分类信息 */}
          <div className="p-6 border-b-2 border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 flex items-center justify-center bg-emerald-500 rounded-md">
                <Settings className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-gray-900">分类信息</span>
            </div>

            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">文档类型</label>
                  <Select value={knowledgeType} onValueChange={(v) => setKnowledgeType(v as KnowledgeType)}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent className="z-[1050]">
                      {KNOWLEDGE_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">条线类型</label>
                  <Select value={lineTypeId?.toString() || ''} onValueChange={(v) => setLineTypeId(Number(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择" />
                    </SelectTrigger>
                    <SelectContent className="z-[1050]">
                      {lineTypeTags.map((tag: Tag) => (
                        <SelectItem key={tag.id} value={tag.id.toString()}>{tag.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.lineTypeId && <div className="text-sm font-semibold text-red-600 mt-1">{errors.lineTypeId}</div>}
                </div>
              </div>

              {/* 系统标签 */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">系统标签</label>
                <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-gray-50 rounded-md">
                  {systemTagNames.length > 0 ? systemTagNames.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs px-3 py-1 rounded-md">
                      {tag}
                      <button
                        className="ml-1.5 hover:text-red-600 transition-colors"
                        onClick={() => setSystemTagNames(prev => prev.filter(t => t !== tag))}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )) : (
                    <span className="text-xs text-gray-400 italic self-center">暂无标签 (可多选)</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Select
                    value=""
                    onValueChange={(v) => {
                      if (v && !systemTagNames.includes(v)) {
                        setSystemTagNames(prev => [...prev, v]);
                      }
                    }}
                  >
                    <SelectTrigger className="h-14 text-sm">
                      <SelectValue placeholder="选择已有..." />
                    </SelectTrigger>
                    <SelectContent className="z-[1050]">
                      {systemTags.filter((tag: Tag) => !systemTagNames.includes(tag.name)).map((tag: Tag) => (
                        <SelectItem key={tag.name} value={tag.name}>{tag.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Input
                      placeholder="新建..."
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
                    <Button variant="outline" size="sm" onClick={handleAddSystemTag} className="h-14 w-14">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* 操作标签 */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">操作标签</label>
                <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-gray-50 rounded-md">
                  {operationTagNames.length > 0 ? operationTagNames.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs px-3 py-1 rounded-md">
                      {tag}
                      <button
                        className="ml-1.5 hover:text-red-600 transition-colors"
                        onClick={() => setOperationTagNames(prev => prev.filter(t => t !== tag))}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )) : (
                    <span className="text-xs text-gray-400 italic self-center">暂无标签 (可多选)</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Select
                    value=""
                    onValueChange={(v) => {
                      if (v && !operationTagNames.includes(v)) {
                        setOperationTagNames(prev => [...prev, v]);
                      }
                    }}
                  >
                    <SelectTrigger className="h-14 text-sm">
                      <SelectValue placeholder="选择已有..." />
                    </SelectTrigger>
                    <SelectContent className="z-[1050]">
                      {operationTags.filter((tag: Tag) => !operationTagNames.includes(tag.name)).map((tag: Tag) => (
                        <SelectItem key={tag.name} value={tag.name}>{tag.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Input
                      placeholder="新建..."
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
                    <Button variant="outline" size="sm" onClick={handleAddOperationTag} className="h-14 w-14">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 发布状态 */}
          <div className="p-6 bg-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 flex items-center justify-center bg-amber-500 rounded-md">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-gray-900">发布状态</span>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">当前状态</span>
                <span className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold ${statusInfo.isDraft ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  <span className="w-2 h-2 rounded-full" style={{ background: 'currentColor' }} />
                  {statusInfo.isDraft ? '待发布' : '已发布'}
                </span>
              </div>
              <div className="text-xs text-gray-600 leading-relaxed font-medium">
                {statusInfo.isDraft
                  ? '当前为草稿状态，保存后可以继续编辑。点击「保存并发布」后，该知识将对所有用户可见。'
                  : '该知识已发布，修改后需要重新发布才能更新内容。'
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default KnowledgeForm;
