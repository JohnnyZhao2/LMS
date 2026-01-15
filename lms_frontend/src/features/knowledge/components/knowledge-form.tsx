import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  FileText,
  Settings,
  Save,
  PanelLeftClose,
  PanelLeft,
  ArrowLeft,
  Loader2,
  ListOrdered,
  X,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Textarea } from '@/components/ui/textarea';

import { useKnowledgeDetail } from '../api/knowledge';
import { useLineTypeTags, useSystemTags, useOperationTags, useCreateTag } from '../api/get-tags';
import { useCreateKnowledge, useUpdateKnowledge } from '../api/manage-knowledge';
import { EMERGENCY_TABS, parseOutline } from '../utils';
import { showApiError } from '@/utils/error-handler';
import { ROUTES } from '@/config/routes';
import type { KnowledgeType, KnowledgeCreateRequest, KnowledgeUpdateRequest, Tag } from '@/types/api';

const RichTextEditor = lazy(() => import('./rich-text-editor').then(m => ({ default: m.RichTextEditor })));



/**
 * 知识表单组件 - Unified Layout 版本 (Tasks/Quizzes Style)
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
  const createTag = useCreateTag();

  const [outlineCollapsed, setOutlineCollapsed] = useState(false);

  // 表单状态
  const [title, setTitle] = useState('');
  const [knowledgeType, setKnowledgeType] = useState<KnowledgeType>('OTHER');
  const [lineTypeId, setLineTypeId] = useState<number | undefined>();
  const [systemTagIds, setSystemTagIds] = useState<number[]>([]);
  const [operationTagIds, setOperationTagIds] = useState<number[]>([]);

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
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 编辑模式下填充数据
  useEffect(() => {
    if (isEdit && knowledgeDetail) {
      if (title === '') setTitle(knowledgeDetail.title || '');
      setKnowledgeType(knowledgeDetail.knowledge_type);
      setLineTypeId(knowledgeDetail.line_type?.id);
      setSystemTagIds(knowledgeDetail.system_tags?.map((t) => t.id) || []);
      setOperationTagIds(knowledgeDetail.operation_tags?.map((t) => t.id) || []);
      setContent(knowledgeDetail.content || '');
      setSummary(knowledgeDetail.summary || '');
      setFaultScenario(knowledgeDetail.fault_scenario || '');
      setTriggerProcess(knowledgeDetail.trigger_process || '');
      setSolution(knowledgeDetail.solution || '');
      setVerificationPlan(knowledgeDetail.verification_plan || '');
      setRecoveryPlan(knowledgeDetail.recovery_plan || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, knowledgeDetail]);

  // 新建模式下设置默认值
  useEffect(() => {
    if (!isEdit && lineTypeTags.length > 0 && !lineTypeId) {
      const defaultLineType = lineTypeTags.find((t: Tag) => t.name === '其他');
      if (defaultLineType) {
        setLineTypeId(defaultLineType.id);
      }
    }
  }, [isEdit, lineTypeTags, lineTypeId]);

  const handleClose = useCallback(() => {
    navigate(ROUTES.ADMIN_KNOWLEDGE);
  }, [navigate]);



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
      system_tag_ids: systemTagIds,
      operation_tag_ids: operationTagIds,
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
    title, knowledgeType, lineTypeId, systemTagIds, operationTagIds,
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
        const currentId = Number(id);
        const result = await updateKnowledge.mutateAsync({ id: currentId, data: requestData });
        toast.success('保存成功');
        if (result?.id && result.id !== currentId) {
          navigate(`${ROUTES.ADMIN_KNOWLEDGE}/${result.id}/edit`, { replace: true });
        }
      } else {
        const result = await createKnowledge.mutateAsync(requestData as KnowledgeCreateRequest);
        toast.success('创建成功');
        navigate(`${ROUTES.ADMIN_KNOWLEDGE}/${result.id}/edit`, { replace: true });
      }
    } catch (error) {
      showApiError(error, isEdit ? '保存失败' : '创建失败');
    }
  }, [validateForm, buildRequestData, isEdit, id, updateKnowledge, createKnowledge, navigate]);

  const isSubmitting = createKnowledge.isPending || updateKnowledge.isPending;

  const statusInfo = useMemo(() => {
    if (!isEdit) {
      return {
        label: '新建',
        isDraft: false,
        description: '保存后将立即对所有用户可见。'
      };
    }

    return {
      label: '当前版本',
      isDraft: false,
      description: '保存修改后将创建新版本并立即对所有用户可见。'
    };
  }, [isEdit]);

  const outline = useMemo(() => {
    return parseOutline(knowledgeType === 'EMERGENCY' ? '' : content, knowledgeType === 'EMERGENCY');
  }, [knowledgeType, content]);

  if (isEdit && detailLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-100 z-[1000]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height)-1px)] -m-6 bg-gray-50 overflow-hidden">
      {/* 顶部导航栏 - Unified Style */}
      <div className="flex items-center h-16 px-6 bg-white border-b border-gray-200 shrink-0 gap-4">
        <div className="flex items-center gap-4 shrink-0">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="flex items-center gap-2.5 px-3 h-10 text-gray-600 hover:text-primary-500 hover:bg-primary-50 transition-all group rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm font-semibold">返回列表</span>
          </Button>
          <div className="w-px h-5 bg-gray-200" />
        </div>

        <div className="flex-1 min-w-0">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入知识标题..."
            className={cn(
              "text-lg font-semibold h-10 border border-gray-200 bg-white rounded-lg px-4 shadow-sm",
              "hover:border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100",
              "transition-all duration-200",
              errors.title && "border-red-300 placeholder:text-red-300 focus:border-red-500 focus:ring-red-100"
            )}
          />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Badge
            className={`flex items-center gap-1.5 px-3 py-1 font-semibold rounded-full text-[10px] uppercase border ${statusInfo.isDraft
              ? 'bg-amber-50 text-amber-600 border-amber-200'
              : 'bg-emerald-50 text-emerald-600 border-emerald-200'
              }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {statusInfo.label}
          </Badge>

          <Button
            size="default"
            onClick={handleSave}
            disabled={isSubmitting}
            className="h-10 px-6 font-semibold"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isSubmitting ? '保存中...' : '保存修改'}
          </Button>
        </div>
      </div>

      {/* 主体内容区域 - 三栏结构 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧目录 */}
        <div className={cn(
          "flex flex-col border-r border-gray-200 bg-white transition-all duration-300",
          outlineCollapsed ? "w-14" : "w-64"
        )}>
          {outlineCollapsed ? (
            <div className="flex flex-col items-center py-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOutlineCollapsed(false)}
                title="展开目录"
              >
                <PanelLeft className="w-6 h-6" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 text-sm font-semibold text-gray-900 shrink-0">
                <div className="flex items-center gap-2">
                  <ListOrdered className="w-5 h-5 text-primary-500" />
                  内容大纲
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-primary-500"
                  onClick={() => setOutlineCollapsed(true)}
                >
                  <PanelLeftClose className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                {outline.length > 0 ? (
                  <div className="space-y-1.5">
                    {outline.map((item, index) => {
                      const outlineKey = `${item.id}-${index}`;
                      const paddingLeft = (item.level - 1) * 12 + 8;
                      return (
                        <div
                          key={outlineKey}
                          className={cn(
                            "group flex items-center gap-3 py-3 px-4 text-xs rounded-lg cursor-pointer transition-all",
                            item.level === 1 ? 'font-semibold text-gray-900 bg-gray-50' : 'text-gray-500 hover:bg-gray-50',
                            knowledgeType === 'EMERGENCY' && activeEmergencyTab === item.id && 'bg-primary-50 text-primary-600 ring-1 ring-primary-100'
                          )}
                          style={{ paddingLeft: `${paddingLeft}px` }}
                          onClick={() => {
                            if (knowledgeType === 'EMERGENCY') {
                              setActiveEmergencyTab(item.id);
                            } else {
                              const element = document.getElementById(item.id);
                              if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            }
                          }}
                        >
                          <span className="truncate group-hover:translate-x-1 transition-transform">{item.text}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-60 px-6 text-center text-gray-400">
                    <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center mb-4">
                      <FileText className="w-8 h-8 opacity-20" />
                    </div>
                    <p className="text-xs font-semibold text-gray-500">暂无大纲数据</p>
                    <p className="text-[10px] mt-2 opacity-60">添加标题后将自动在此生成目录</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 中间编辑区 */}
        <div className="flex-1 flex flex-col bg-white min-w-0">
          <div className="flex-1 overflow-y-auto">
            <div className="w-full h-full">
              {knowledgeType === 'EMERGENCY' ? (
                <div className="flex flex-col h-full overflow-hidden">
                  {EMERGENCY_TABS.map((tab, index) => {
                    if (tab.key !== activeEmergencyTab) return null;

                    return (
                      <div key={tab.key} className="flex flex-col h-full animate-in fade-in duration-300">
                        {/* Tab Header */}
                        <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-gray-50">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-50 text-primary-600 text-xs font-bold ring-1 ring-primary-100">
                              {index + 1}
                            </span>
                            <h2 className="text-base font-bold text-gray-900 tracking-tight">{tab.label}</h2>
                          </div>
                        </div>

                        {/* Editor Area */}
                        <div className="flex-1 overflow-hidden">
                          <Suspense fallback={null}>
                            <RichTextEditor
                              value={
                                tab.key === 'fault_scenario' ? faultScenario :
                                  tab.key === 'trigger_process' ? triggerProcess :
                                    tab.key === 'solution' ? solution :
                                      tab.key === 'verification_plan' ? verificationPlan :
                                        tab.key === 'recovery_plan' ? recoveryPlan : ''
                              }
                              onChange={(val) => {
                                if (tab.key === 'fault_scenario') setFaultScenario(val);
                                else if (tab.key === 'trigger_process') setTriggerProcess(val);
                                else if (tab.key === 'solution') setSolution(val);
                                else if (tab.key === 'verification_plan') setVerificationPlan(val);
                                else if (tab.key === 'recovery_plan') setRecoveryPlan(val);
                              }}
                              placeholder={`在此输入${tab.label}详情...`}
                              className="border-none shadow-none ring-0 w-full h-full"
                              contentClassName="p-6 px-8 max-w-6xl text-base leading-relaxed"
                            />
                          </Suspense>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <Suspense fallback={null}>
                      <RichTextEditor
                        value={content}
                        onChange={setContent}
                        placeholder="请输入知识正文..."
                        className="border-none shadow-none ring-0 h-full min-h-[calc(100vh-160px)]"
                        contentClassName="p-6 px-8 max-w-6xl mx-auto text-base leading-relaxed"
                      />
                    </Suspense>
                  </div>
                  {errors.content && (
                    <div className="m-6 p-4 bg-red-50 border border-red-100 rounded-lg text-xs font-semibold text-red-600 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      {errors.content}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧配置 */}
        <div className="w-[380px] flex flex-col bg-white border-l border-gray-200 shrink-0 overflow-y-auto">
          <div className="flex items-center h-16 px-8 bg-white border-b border-gray-100 shrink-0">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-3">
              <Settings className="w-5 h-5 text-primary-500" />
              页面配置
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {/* 基础定义 */}
            <section className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-5">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                基础配置
              </h3>
              <div className="space-y-2.5">
                <Label className="text-xs font-semibold text-gray-700 ml-1">知识分类</Label>
                <SegmentedControl
                  options={[
                    { label: '标准类', value: 'OTHER' },
                    { label: '应急类', value: 'EMERGENCY' },
                  ]}
                  value={knowledgeType}
                  onChange={(val) => setKnowledgeType(val as KnowledgeType)}
                  className="w-full"
                  activeColor="white"
                  variant="premium"
                />
              </div>
            </section>

            {/* 内容摘要 */}
            <section className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-5">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                内容摘要
              </h3>
              <div className="space-y-4">
                <Textarea
                  placeholder="添加说明..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="min-h-[120px] font-medium"
                />
              </div>
            </section>

            {/* 分类归属 */}
            <section className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-5">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                分类归属
              </h3>
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold text-gray-700 ml-1">所属条线</Label>
                  <SearchableSelect
                    items={lineTypeTags}
                    value={lineTypeId}
                    onSelect={(v) => setLineTypeId(Number(v))}
                    onCreate={async (name) => {
                      const newTag = await createTag.mutateAsync({ name, tag_type: 'LINE', is_active: true });
                      setLineTypeId(newTag.id);
                      toast.success('新条线已创建');
                    }}
                    placeholder="选择条线..."
                    getLabel={(t) => t.name}
                    getValue={(t) => t.id}
                  />
                </div>
              </div>
            </section>

            {/* 精细标签 */}
            <section className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-5">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                精细标签
              </h3>
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between ml-1">
                    <Label className="text-xs font-semibold text-gray-700">系统标签</Label>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full min-w-[1.5rem] text-center">{systemTagIds.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {systemTagIds.map(id => {
                      const tag = systemTags.find(t => t.id === id);
                      return tag ? (
                        <Badge key={id} variant="info" className="h-8 px-3 text-[10px] rounded-lg border-none shadow-sm bg-blue-50 text-blue-600 hover:bg-red-50 hover:text-red-500 transition-all group">
                          {tag.name}
                          <X className="w-3 h-3 ml-2 cursor-pointer group-hover:scale-125 transition-transform" onClick={() => setSystemTagIds(prev => prev.filter(i => i !== id))} />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                  <SearchableSelect
                    items={systemTags.filter(t => !systemTagIds.includes(t.id))}
                    onSelect={(v) => setSystemTagIds(prev => [...prev, Number(v)])}
                    onCreate={async (name) => {
                      const newTag = await createTag.mutateAsync({ name, tag_type: 'SYSTEM', is_active: true });
                      setSystemTagIds(prev => [...prev, newTag.id]);
                      toast.success('标签已创建');
                    }}
                    placeholder="关联系统..."
                    getLabel={(t) => t.name}
                    getValue={(t) => t.id}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between ml-1">
                    <Label className="text-xs font-semibold text-gray-700">操作标签</Label>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full min-w-[1.5rem] text-center">{operationTagIds.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {operationTagIds.map(id => {
                      const tag = operationTags.find(t => t.id === id);
                      return tag ? (
                        <Badge key={id} variant="success" className="h-8 px-3 text-[10px] rounded-lg border-none shadow-sm bg-emerald-50 text-emerald-600 hover:bg-red-50 hover:text-red-500 transition-all group">
                          {tag.name}
                          <X className="w-3 h-3 ml-2 cursor-pointer group-hover:scale-125 transition-transform" onClick={() => setOperationTagIds(prev => prev.filter(i => i !== id))} />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                  <SearchableSelect
                    items={operationTags.filter(t => !operationTagIds.includes(t.id))}
                    onSelect={(v) => setOperationTagIds(prev => [...prev, Number(v)])}
                    onCreate={async (name) => {
                      const newTag = await createTag.mutateAsync({ name, tag_type: 'OPERATION', is_active: true });
                      setOperationTagIds(prev => [...prev, newTag.id]);
                      toast.success('标签已创建');
                    }}
                    placeholder="选择操作..."
                    getLabel={(t) => t.name}
                    getValue={(t) => t.id}
                  />
                </div>
              </div>
            </section>

            <div className="pt-8 border-t border-gray-100">
              <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                <span>当前版本</span>
                <span className="text-primary-500">PUBLISHED</span>
              </div>
              <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex gap-3">
                <div className="w-5 h-5 flex-shrink-0 bg-primary-100 rounded-md flex items-center justify-center">
                  <Settings className="w-3 h-3 text-primary-600" />
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                  {statusInfo.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeForm;
