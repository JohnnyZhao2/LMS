import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  X,
  Bold,
  Italic,
  Link,
  List,
  ListOrdered,
  Table,
  FileText,
  Settings,
  CheckCircle,
  Plus,
  Save,
  Send,
  Code,
  Strikethrough,
  PanelLeftClose,
  PanelLeft,
  Loader2,
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
import { Separator } from '@/components/ui/separator';

import { useKnowledgeDetail } from '../api/get-admin-knowledge';
import { useLineTypeTags, useSystemTags, useOperationTags } from '../api/get-tags';
import { useCreateKnowledge, useUpdateKnowledge, usePublishKnowledge } from '../api/manage-knowledge';
import { showApiError } from '@/utils/error-handler';
import { ROUTES } from '@/config/routes';
import type { KnowledgeType, KnowledgeCreateRequest, KnowledgeUpdateRequest, Tag } from '@/types/api';

/**
 * 编辑模式
 */
type EditorMode = 'edit' | 'split' | 'preview';

/**
 * 将 HTML 转换回 Markdown（简化版）
 */
const htmlToMarkdown = (html: string): string => {
  const markdown = html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '###### $1\n\n')
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
      return content.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '> $1\n').trim() + '\n\n';
    })
    .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n')
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, content) => {
      return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n').trim() + '\n\n';
    })
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, content) => {
      let index = 0;
      return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, () => {
        index++;
        return `${index}. $1\n`;
      }).trim() + '\n\n';
    })
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
    .replace(/<hr[^>]*\/?>/gi, '---\n\n')
    .replace(/<br[^>]*\/?>/gi, '\n')
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
    .replace(/<del[^>]*>([\s\S]*?)<\/del>/gi, '~~$1~~')
    .replace(/<s[^>]*>([\s\S]*?)<\/s>/gi, '~~$1~~')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
    .replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi, '![$1]($2)')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return markdown;
};

/**
 * 简单的 Markdown 渲染
 */
const renderMarkdown = (markdown: string): string => {
  if (!markdown) return '<p style="color: #656d76; font-style: italic;">暂无内容，开始编辑...</p>';
  
  const codeBlocks: string[] = [];
  let html = markdown.replace(/```([\s\S]*?)```/g, (_, code) => {
    codeBlocks.push(code.trim());
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });
  
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  html = html
    .replace(/^###### (.+)$/gm, '<h6>$1</h6>')
    .replace(/^##### (.+)$/gm, '<h5>$1</h5>')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  html = html.replace(/^(-{3,}|_{3,}|\*{3,})$/gm, '<hr/>');
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote><p>$1</p></blockquote>');
  html = html.replace(/<\/blockquote>\s*<blockquote>/g, '');
  
  html = html
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>');
  
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  html = html
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  html = html
    .replace(/^- \[x\] (.+)$/gm, '<li class="task-item"><input type="checkbox" checked disabled /> $1</li>')
    .replace(/^- \[ \] (.+)$/gm, '<li class="task-item"><input type="checkbox" disabled /> $1</li>');
  
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  
  html = html.replace(/(<li>[\s\S]*?<\/li>)+/g, (match) => {
    if (match.includes('task-item')) {
      return `<ul class="task-list">${match}</ul>`;
    }
    return `<ul>${match}</ul>`;
  });
  
  const lines = html.split('\n');
  const processedLines: string[] = [];
  let inParagraph = false;
  let paragraphContent = '';
  
  const blockTags = ['<h', '<ul', '<ol', '<li', '<table', '<thead', '<tbody', '<tr', '<blockquote', '<hr', '<pre'];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      if (inParagraph && paragraphContent) {
        processedLines.push(`<p>${paragraphContent}</p>`);
        paragraphContent = '';
        inParagraph = false;
      }
      continue;
    }
    
    const isBlockElement = blockTags.some(tag => trimmedLine.startsWith(tag));
    
    if (isBlockElement) {
      if (inParagraph && paragraphContent) {
        processedLines.push(`<p>${paragraphContent}</p>`);
        paragraphContent = '';
        inParagraph = false;
      }
      processedLines.push(trimmedLine);
    } else {
      if (inParagraph) {
        paragraphContent += '<br/>' + trimmedLine;
      } else {
        paragraphContent = trimmedLine;
        inParagraph = true;
      }
    }
  }
  
  if (inParagraph && paragraphContent) {
    processedLines.push(`<p>${paragraphContent}</p>`);
  }
  
  html = processedLines.join('\n');
  
  codeBlocks.forEach((code, index) => {
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    html = html.replace(`__CODE_BLOCK_${index}__`, `<pre><code>${escapedCode}</code></pre>`);
  });
  
  return html;
};

/**
 * 知识类型选项
 */
const KNOWLEDGE_TYPE_OPTIONS = [
  { value: 'EMERGENCY', label: '应急类' },
  { value: 'OTHER', label: '标准类' },
];

/**
 * 应急类知识的结构化标签页
 */
const EMERGENCY_TABS = [
  { key: 'fault_scenario', label: '故障场景' },
  { key: 'trigger_process', label: '触发流程' },
  { key: 'solution', label: '解决方案' },
  { key: 'verification_plan', label: '验证方案' },
  { key: 'recovery_plan', label: '恢复方案' },
];

/**
 * 目录项接口
 */
interface OutlineItem {
  id: string;
  level: number;
  text: string;
}

/**
 * 从 Markdown 内容解析标题生成目录
 */
const parseOutline = (markdown: string): OutlineItem[] => {
  if (!markdown) return [];
  
  const lines = markdown.split('\n');
  const outline: OutlineItem[] = [];
  
  lines.forEach((line, index) => {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      outline.push({
        id: `heading-${index}`,
        level: match[1].length,
        text: match[2].trim(),
      });
    }
  });
  
  return outline;
};

/**
 * 知识表单组件 - ShadCN UI 版本
 */
export const KnowledgeFormNew: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const emergencyPreviewRef = useRef<HTMLDivElement>(null);
  const splitPreviewRef = useRef<HTMLDivElement>(null);
  const splitEmergencyPreviewRef = useRef<HTMLDivElement>(null);

  // API Hooks
  const { data: knowledgeDetail, isLoading: detailLoading } = useKnowledgeDetail(Number(id));
  const { data: lineTypeTags = [] } = useLineTypeTags();
  const createKnowledge = useCreateKnowledge();
  const updateKnowledge = useUpdateKnowledge();
  const publishKnowledge = usePublishKnowledge();

  const [editorMode, setEditorMode] = useState<EditorMode>('edit');
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

  // Textarea 自动高度
  useEffect(() => {
    const textarea = textareaRef.current;
    
    const adjustTextareaHeight = () => {
      if (textarea && editorMode !== 'preview' && editorMode !== 'split') {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    };

    adjustTextareaHeight();
    
    if (textarea) {
      textarea.addEventListener('input', adjustTextareaHeight);
    }

    window.addEventListener('resize', adjustTextareaHeight);

    return () => {
      if (textarea) {
        textarea.removeEventListener('input', adjustTextareaHeight);
      }
      window.removeEventListener('resize', adjustTextareaHeight);
    };
  }, [content, editorMode]);

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

  const handlePreviewBlur = useCallback((isEmergency: boolean = false, isSplit: boolean = false) => {
    let previewElement: HTMLDivElement | null = null;
    
    if (isEmergency) {
      previewElement = isSplit ? splitEmergencyPreviewRef.current : emergencyPreviewRef.current;
    } else {
      previewElement = isSplit ? splitPreviewRef.current : previewRef.current;
    }
    
    if (!previewElement) return;
    
    const htmlContent = previewElement.innerHTML;
    const markdownContent = htmlToMarkdown(htmlContent);
    
    if (isEmergency) {
      setCurrentEmergencyContent(markdownContent);
    } else {
      setContent(markdownContent);
    }
  }, [setCurrentEmergencyContent]);

  const insertMarkdown = useCallback((before: string, after: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const textToInsert = selectedText || placeholder;
    
    const newValue = 
      textarea.value.substring(0, start) + 
      before + textToInsert + after + 
      textarea.value.substring(end);
    
    if (knowledgeType === 'EMERGENCY') {
      setCurrentEmergencyContent(newValue);
    } else {
      setContent(newValue);
    }
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + textToInsert.length + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [knowledgeType, setCurrentEmergencyContent]);

  const handleBold = () => insertMarkdown('**', '**', '粗体文字');
  const handleItalic = () => insertMarkdown('*', '*', '斜体文字');
  const handleStrikethrough = () => insertMarkdown('~~', '~~', '删除线文字');
  const handleCode = () => insertMarkdown('`', '`', '代码');
  const handleLink = () => insertMarkdown('[', '](链接地址)', '链接文字');
  const handleList = () => insertMarkdown('- ', '', '列表项');
  const handleOrderedList = () => insertMarkdown('1. ', '', '列表项');
  const handleTable = () => insertMarkdown(
    '| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| ', ' |  |  |\n', '内容'
  );
  const handleHeading = () => insertMarkdown('## ', '', '标题');

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
    return parseOutline(content);
  }, [knowledgeType, content]);

  if (isEdit && detailLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-100 z-[1000]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }


  return (
    <div className="fixed inset-0 flex flex-col bg-gray-100 z-[1000] animate-fadeIn">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between h-14 px-5 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-4">
          <button
            className="w-9 h-9 flex items-center justify-center bg-transparent border border-gray-200 rounded-lg text-gray-600 cursor-pointer transition-all hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300"
            onClick={handleClose}
            title="返回"
          >
            <X className="w-4 h-4" />
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

        {/* 中间：编辑模式切换 */}
        <div className="flex items-center">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['edit', 'split', 'preview'] as EditorMode[]).map((mode) => (
              <button
                key={mode}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  editorMode === mode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setEditorMode(mode)}
              >
                {mode === 'edit' ? '编辑' : mode === 'split' ? '分屏' : '预览'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
              statusInfo.isDraft
                ? 'bg-yellow-50 text-yellow-700'
                : 'bg-green-50 text-green-600'
            }`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'currentColor' }}
            />
            <span>{statusInfo.label}</span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSubmitting}
            className="h-9 px-4 font-medium"
          >
            <Save className="w-4 h-4 mr-2" />
            保存草稿
          </Button>

          <Button
            size="sm"
            onClick={handlePublish}
            disabled={isSubmitting}
            className="h-9 px-4 font-medium"
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
              className="flex items-center justify-center w-8 h-8 bg-white border-none rounded-lg shadow-sm cursor-pointer text-gray-500 transition-all hover:bg-gray-50 hover:text-primary-500 hover:shadow-md"
              onClick={() => setOutlineCollapsed(false)}
              title="展开目录"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-[200px] bg-white rounded-xl shadow-sm overflow-hidden flex flex-col shrink-0 min-h-[200px] max-h-[400px]">
              <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider shrink-0">
                <div className="flex items-center whitespace-nowrap overflow-hidden">
                  <ListOrdered className="w-4 h-4 mr-2" />
                  目录
                </div>
                <button
                  className="flex items-center justify-center w-6 h-6 p-0 border-none bg-transparent text-gray-400 cursor-pointer rounded-md transition-all hover:bg-gray-100 hover:text-gray-600 shrink-0"
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
                      className={`flex items-center gap-2 py-2 text-sm text-gray-600 cursor-pointer transition-all border-l-2 border-transparent hover:bg-gray-50 hover:text-gray-900 ${
                        item.level === 1 ? 'px-4 font-medium' : item.level === 2 ? 'pl-6 pr-4' : 'pl-8 pr-4 text-xs'
                      } ${
                        knowledgeType === 'EMERGENCY' && activeEmergencyTab === item.id
                          ? 'bg-primary-50 text-primary-600 border-l-primary-500'
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
                  <div className="p-4 text-xs text-gray-400 text-center">
                    {knowledgeType === 'EMERGENCY' 
                      ? '选择章节开始编辑' 
                      : '使用 # ## ### 创建标题'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 中间编辑区 */}
        <div className="flex-1 flex flex-col bg-white m-4 mr-2 rounded-xl shadow-sm min-h-0">
          {/* 编辑器头部 */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <span className="text-sm font-semibold text-gray-900">
              {knowledgeType === 'EMERGENCY' ? '应急知识内容' : '知识内容'}
            </span>
            {editorMode !== 'preview' && (
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded-md text-gray-500 cursor-pointer transition-all hover:bg-gray-100 hover:text-gray-700" title="标题" onClick={handleHeading}>
                  <FileText className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded-md text-gray-500 cursor-pointer transition-all hover:bg-gray-100 hover:text-gray-700" title="加粗" onClick={handleBold}>
                  <Bold className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded-md text-gray-500 cursor-pointer transition-all hover:bg-gray-100 hover:text-gray-700" title="斜体" onClick={handleItalic}>
                  <Italic className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded-md text-gray-500 cursor-pointer transition-all hover:bg-gray-100 hover:text-gray-700" title="删除线" onClick={handleStrikethrough}>
                  <Strikethrough className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded-md text-gray-500 cursor-pointer transition-all hover:bg-gray-100 hover:text-gray-700" title="代码" onClick={handleCode}>
                  <Code className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded-md text-gray-500 cursor-pointer transition-all hover:bg-gray-100 hover:text-gray-700" title="链接" onClick={handleLink}>
                  <Link className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded-md text-gray-500 cursor-pointer transition-all hover:bg-gray-100 hover:text-gray-700" title="无序列表" onClick={handleList}>
                  <List className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded-md text-gray-500 cursor-pointer transition-all hover:bg-gray-100 hover:text-gray-700" title="有序列表" onClick={handleOrderedList}>
                  <ListOrdered className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded-md text-gray-500 cursor-pointer transition-all hover:bg-gray-100 hover:text-gray-700" title="表格" onClick={handleTable}>
                  <Table className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* 编辑内容 */}
          {knowledgeType === 'EMERGENCY' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex px-5 border-b border-gray-100 overflow-x-auto gap-1">
                {EMERGENCY_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    className={`px-4 py-3 bg-transparent border-none border-b-2 border-transparent text-gray-500 text-sm font-medium cursor-pointer transition-all whitespace-nowrap hover:text-gray-700 ${
                      activeEmergencyTab === tab.key
                        ? 'text-primary-500 border-b-primary-500'
                        : ''
                    }`}
                    onClick={() => setActiveEmergencyTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex-1 p-5 overflow-y-auto">
                {editorMode === 'preview' ? (
                  <div 
                    ref={emergencyPreviewRef}
                    className="prose prose-gray max-w-none min-h-[200px] cursor-text outline-none"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={() => handlePreviewBlur(true)}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(getCurrentEmergencyContent()) }}
                  />
                ) : editorMode === 'split' ? (
                  <div className="flex flex-1 min-h-0 gap-6">
                    <textarea
                      ref={textareaRef}
                      className="flex-1 min-h-0 bg-transparent border-none outline-none text-gray-900 font-sans text-base leading-relaxed resize-none overflow-hidden"
                      value={getCurrentEmergencyContent()}
                      onChange={(e) => setCurrentEmergencyContent(e.target.value)}
                      placeholder={`在此输入${EMERGENCY_TABS.find(t => t.key === activeEmergencyTab)?.label}内容，支持 Markdown 格式...`}
                    />
                    <Separator orientation="vertical" className="mx-4" />
                    <div 
                      ref={splitEmergencyPreviewRef}
                      className="flex-1 min-h-0 prose prose-gray max-w-none overflow-hidden cursor-text outline-none"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={() => handlePreviewBlur(true, true)}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(getCurrentEmergencyContent()) }}
                    />
                  </div>
                ) : (
                  <textarea
                    ref={textareaRef}
                    className="w-full bg-transparent border-none outline-none text-gray-900 font-sans text-base leading-relaxed resize-none overflow-hidden"
                    value={getCurrentEmergencyContent()}
                    onChange={(e) => setCurrentEmergencyContent(e.target.value)}
                    placeholder={`在此输入${EMERGENCY_TABS.find(t => t.key === activeEmergencyTab)?.label}内容，支持 Markdown 格式...`}
                  />
                )}
              </div>
              {errors.emergency && <div className="text-[11px] text-red-500 px-5 pb-5">{errors.emergency}</div>}
            </div>
          ) : (
            <div className="flex-1 p-5 overflow-y-auto">
              {editorMode === 'preview' ? (
                <div 
                  ref={previewRef}
                  className="prose prose-gray max-w-none min-h-[200px] cursor-text outline-none"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={() => handlePreviewBlur(false)}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                />
              ) : editorMode === 'split' ? (
                <div className="flex flex-1 min-h-0 gap-6">
                  <textarea
                    ref={textareaRef}
                    className="flex-1 min-h-0 bg-transparent border-none outline-none text-gray-900 font-sans text-base leading-relaxed resize-none overflow-hidden"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="在此输入知识内容，支持 Markdown 格式..."
                  />
                  <Separator orientation="vertical" className="mx-4" />
                  <div 
                    ref={splitPreviewRef}
                    className="flex-1 min-h-0 prose prose-gray max-w-none overflow-hidden cursor-text outline-none"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={() => handlePreviewBlur(false, true)}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                  />
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  className="w-full bg-transparent border-none outline-none text-gray-900 font-sans text-base leading-relaxed resize-none overflow-hidden"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="在此输入知识内容，支持 Markdown 格式..."
                />
              )}
              {errors.content && <div className="text-[11px] text-red-500 mt-2">{errors.content}</div>}
            </div>
          )}
        </div>

        {/* 右侧元数据面板 */}
        <div className="w-[360px] flex flex-col bg-white m-4 ml-2 rounded-xl shadow-sm overflow-y-auto shrink-0">
          {/* 基本信息 */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-semibold text-gray-900">基本信息</span>
            </div>
            
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-2">标题</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入知识文档标题"
                className="h-9"
              />
              {errors.title && <div className="text-[11px] text-red-500 mt-1">{errors.title}</div>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">知识概要</label>
              <textarea
                className="w-full p-3 bg-white border border-gray-200 rounded-md text-sm leading-relaxed resize-y min-h-[80px] transition-all focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="简要描述这篇知识的核心内容（用于卡片预览展示）"
                rows={2}
                maxLength={500}
              />
              <div className="text-xs text-gray-400 mt-1 text-right">{summary.length}/500 字符</div>
            </div>
          </div>

          {/* 分类信息 */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-semibold text-gray-900">分类信息</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">文档类型</label>
                <Select value={knowledgeType} onValueChange={(v) => setKnowledgeType(v as KnowledgeType)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {KNOWLEDGE_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">条线类型</label>
                <Select value={lineTypeId?.toString() || ''} onValueChange={(v) => setLineTypeId(Number(v))}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="选择" />
                  </SelectTrigger>
                  <SelectContent>
                    {lineTypeTags.map((tag: Tag) => (
                      <SelectItem key={tag.id} value={tag.id.toString()}>{tag.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.lineTypeId && <div className="text-[11px] text-red-500">{errors.lineTypeId}</div>}
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">系统标签</label>
                <div className="flex flex-wrap gap-1 mb-1">
                  {systemTagNames.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                      <button
                        className="ml-1 hover:text-red-500"
                        onClick={() => setSystemTagNames(prev => prev.filter(t => t !== tag))}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <Select
                  value=""
                  onValueChange={(v) => {
                    if (v && !systemTagNames.includes(v)) {
                      setSystemTagNames(prev => [...prev, v]);
                    }
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="选择" />
                  </SelectTrigger>
                  <SelectContent>
                    {systemTags.filter((tag: Tag) => !systemTagNames.includes(tag.name)).map((tag: Tag) => (
                      <SelectItem key={tag.name} value={tag.name}>{tag.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-1 mt-1">
                  <Input
                    placeholder="新建"
                    value={systemTagInput}
                    onChange={(e) => setSystemTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSystemTag();
                      }
                    }}
                    className="h-7 text-xs flex-1"
                  />
                  <Button variant="ghost" size="sm" onClick={handleAddSystemTag} className="h-7 w-7 p-0">
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">操作标签</label>
                <div className="flex flex-wrap gap-1 mb-1">
                  {operationTagNames.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                      <button
                        className="ml-1 hover:text-red-500"
                        onClick={() => setOperationTagNames(prev => prev.filter(t => t !== tag))}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <Select
                  value=""
                  onValueChange={(v) => {
                    if (v && !operationTagNames.includes(v)) {
                      setOperationTagNames(prev => [...prev, v]);
                    }
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="选择" />
                  </SelectTrigger>
                  <SelectContent>
                    {operationTags.filter((tag: Tag) => !operationTagNames.includes(tag.name)).map((tag: Tag) => (
                      <SelectItem key={tag.name} value={tag.name}>{tag.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-1 mt-1">
                  <Input
                    placeholder="新建"
                    value={operationTagInput}
                    onChange={(e) => setOperationTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddOperationTag();
                      }
                    }}
                    className="h-7 text-xs flex-1"
                  />
                  <Button variant="ghost" size="sm" onClick={handleAddOperationTag} className="h-7 w-7 p-0">
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* 发布状态 */}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-semibold text-gray-900">发布状态</span>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">当前状态</span>
                <span className={`flex items-center gap-1 text-xs font-semibold ${statusInfo.isDraft ? 'text-yellow-500' : 'text-green-500'}`}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
                  {statusInfo.isDraft ? '待发布' : '已发布'}
                </span>
              </div>
              <div className="text-xs text-gray-500 leading-relaxed">
                {statusInfo.isDraft 
                  ? '当前为草稿状态，保存后可以继续编辑。点击「保存并发布」后，该知识将对所有用户可见。'
                  : '该知识已发布，修改后需要重新发布才能更新内容。'
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeFormNew;
