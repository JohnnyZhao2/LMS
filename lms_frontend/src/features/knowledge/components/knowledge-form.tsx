import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Select, Spin, message, Divider, Input, Button, Space, Segmented } from 'antd';
import {
  CloseOutlined,
  BoldOutlined,
  ItalicOutlined,
  LinkOutlined,
  UnorderedListOutlined,
  TableOutlined,
  FileTextOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  SaveOutlined,
  SendOutlined,
  OrderedListOutlined,
  CodeOutlined,
  StrikethroughOutlined,
  MenuUnfoldOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useKnowledgeDetail } from '../api/get-admin-knowledge';
import { useLineTypeTags, useSystemTags, useOperationTags } from '../api/get-tags';
import { useCreateKnowledge, useUpdateKnowledge, usePublishKnowledge } from '../api/manage-knowledge';
import { showApiError } from '@/utils/error-handler';
import { ROUTES } from '@/config/routes';
import type { KnowledgeType, KnowledgeCreateRequest, KnowledgeUpdateRequest, Tag } from '@/types/api';
import styles from './knowledge-form.module.css';

const { Option } = Select;

/**
 * 编辑模式
 */
type EditorMode = 'edit' | 'split' | 'preview';

/**
 * 将 HTML 转换回 Markdown（简化版）
 */
const htmlToMarkdown = (html: string): string => {
  const markdown = html
    // 先处理块级元素
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '###### $1\n\n')
    // 引用块
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
      return content.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '> $1\n').trim() + '\n\n';
    })
    // 代码块
    .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n')
    // 列表
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
    // 段落
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
    // 分隔线
    .replace(/<hr[^>]*\/?>/gi, '---\n\n')
    // 换行
    .replace(/<br[^>]*\/?>/gi, '\n')
    // 行内元素
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
    // 清理剩余标签
    .replace(/<[^>]+>/g, '')
    // 解码 HTML 实体
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    // 清理多余空行
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return markdown;
};

/**
 * 简单的 Markdown 渲染（不依赖第三方库）
 * 支持 GitHub Flavored Markdown 常用语法
 */
const renderMarkdown = (markdown: string): string => {
  if (!markdown) return '<p style="color: #656d76; font-style: italic;">暂无内容，开始编辑...</p>';
  
  // 预处理：保护代码块
  const codeBlocks: string[] = [];
  let html = markdown.replace(/```([\s\S]*?)```/g, (_, code) => {
    codeBlocks.push(code.trim());
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });
  
  // 转义 HTML（在代码块保护之后）
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // 标题（支持 h1-h6）
  html = html
    .replace(/^###### (.+)$/gm, '<h6>$1</h6>')
    .replace(/^##### (.+)$/gm, '<h5>$1</h5>')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // 分隔线
  html = html.replace(/^(-{3,}|_{3,}|\*{3,})$/gm, '<hr/>');
  
  // 引用块
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote><p>$1</p></blockquote>');
  // 合并连续的引用块
  html = html.replace(/<\/blockquote>\s*<blockquote>/g, '');
  
  // 粗体和斜体（注意顺序）
  html = html
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>');
  
  // 删除线
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
  
  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // 链接和图片
  html = html
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // 任务列表
  html = html
    .replace(/^- \[x\] (.+)$/gm, '<li class="task-item"><input type="checkbox" checked disabled /> $1</li>')
    .replace(/^- \[ \] (.+)$/gm, '<li class="task-item"><input type="checkbox" disabled /> $1</li>');
  
  // 无序列表
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
  
  // 有序列表
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  
  // 表格处理
  html = html.replace(/^\|(.+)\|$/gm, (_, content) => {
    const cells = content.split('|').map((cell: string) => cell.trim());
    // 检测是否是分隔行
    if (cells.every((cell: string) => /^[-:]+$/.test(cell))) {
      return '__TABLE_SEP__';
    }
    return `<tr>${cells.map((cell: string) => `<td>${cell}</td>`).join('')}</tr>`;
  });
  // 将表头后的分隔行转换为 thead
  html = html.replace(/<tr>(.+?)<\/tr>\s*__TABLE_SEP__/g, '<thead><tr>$1</tr></thead><tbody>');
  html = html.replace(/__TABLE_SEP__/g, '');
  // 包装表格
  html = html.replace(/(<thead>[\s\S]*?<\/thead>[\s\S]*?)(<tr>[\s\S]*?<\/tr>)+/g, (match) => {
    if (match.includes('<thead>')) {
      return `<table>${match}</tbody></table>`;
    }
    return match;
  });
  // 单独的表格行也包装
  html = html.replace(/(<tr>[\s\S]*?<\/tr>)+(?![\s\S]*<\/tbody>)/g, (match) => {
    if (!match.includes('<table>')) {
      return `<table><tbody>${match}</tbody></table>`;
    }
    return match;
  });
  // 将 td 改为 th（在 thead 中）
  html = html.replace(/<thead><tr>([\s\S]*?)<\/tr><\/thead>/g, (_, content) => {
    return `<thead><tr>${content.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>')}</tr></thead>`;
  });
  
  // 包装连续的 li 为 ul
  html = html.replace(/(<li>[\s\S]*?<\/li>)+/g, (match) => {
    if (match.includes('task-item')) {
      return `<ul class="task-list">${match}</ul>`;
    }
    return `<ul>${match}</ul>`;
  });
  
  // 段落处理：将连续的非标签文本包装为 p
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
  
  // 还原代码块
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
 * 知识表单组件
 * 
 * 布局：
 * - 左侧：大面积内容编辑区（Markdown编辑器）
 * - 右侧：元数据面板（分组显示属性）
 * - 顶部：面包屑、状态、操作按钮
 */
export const KnowledgeForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  // 编辑器 ref
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

  // 编辑模式
  const [editorMode, setEditorMode] = useState<EditorMode>('edit');
  
  // 目录面板折叠状态
  const [outlineCollapsed, setOutlineCollapsed] = useState(false);

  // 表单状态
  const [title, setTitle] = useState('');
  const [knowledgeType, setKnowledgeType] = useState<KnowledgeType>('OTHER');
  const [lineTypeId, setLineTypeId] = useState<number | undefined>();
  const [systemTagNames, setSystemTagNames] = useState<string[]>([]);
  const [operationTagNames, setOperationTagNames] = useState<string[]>([]);

  // 获取所有标签供选择
  const { data: systemTags = [] } = useSystemTags();
  const { data: operationTags = [] } = useOperationTags();
  
  // 内容状态
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [faultScenario, setFaultScenario] = useState('');
  const [triggerProcess, setTriggerProcess] = useState('');
  const [solution, setSolution] = useState('');
  const [verificationPlan, setVerificationPlan] = useState('');
  const [recoveryPlan, setRecoveryPlan] = useState('');

  // 应急类知识的当前标签页
  const [activeEmergencyTab, setActiveEmergencyTab] = useState('fault_scenario');

  // 标签输入
  const [systemTagInput, setSystemTagInput] = useState('');
  const [operationTagInput, setOperationTagInput] = useState('');

  // 表单错误
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * 编辑模式下填充数据
   * 这是表单初始化的标准模式，需要从服务端数据同步到本地状态
   */
  useEffect(() => {
    if (isEdit && knowledgeDetail) {
      // 表单初始化：从服务端数据同步到本地状态（这是必要的副作用）
      const initFormData = () => {
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
      };
      initFormData();
    }
  }, [isEdit, knowledgeDetail]);

  /**
   * 新建模式下设置默认值
   */
  useEffect(() => {
    if (!isEdit && lineTypeTags.length > 0) {
      const defaultLineType = lineTypeTags.find((t: Tag) => t.name === '其他');
      if (defaultLineType && !lineTypeId) {
        // 设置默认条线类型（这是必要的副作用）
        const setDefaultLineType = () => setLineTypeId(defaultLineType.id);
        setDefaultLineType();
      }
    }
  }, [isEdit, lineTypeTags, lineTypeId]);

  /**
   * 关闭/返回
   */
  const handleClose = useCallback(() => {
    navigate(ROUTES.ADMIN_KNOWLEDGE);
  }, [navigate]);

  /**
   * 获取当前应急类知识内容
   */
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

  /**
   * 设置当前应急类知识内容
   */
  const setCurrentEmergencyContent = useCallback((value: string) => {
    switch (activeEmergencyTab) {
      case 'fault_scenario': setFaultScenario(value); break;
      case 'trigger_process': setTriggerProcess(value); break;
      case 'solution': setSolution(value); break;
      case 'verification_plan': setVerificationPlan(value); break;
      case 'recovery_plan': setRecoveryPlan(value); break;
    }
  }, [activeEmergencyTab]);

  /**
   * 处理预览区域编辑完成（失去焦点时）
   * 将 HTML 内容转换回 Markdown
   * @param isEmergency 是否是应急类知识
   * @param isSplit 是否是分屏模式
   */
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

  /**
   * 处理预览区域输入时的提示
   */
  const handlePreviewInput = useCallback(() => {
    // 可以在这里添加实时同步逻辑，但为了性能考虑，我们只在 blur 时同步
  }, []);

  /**
   * 在文本框中插入 Markdown 语法
   */
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
    
    // 更新内容
    if (knowledgeType === 'EMERGENCY') {
      setCurrentEmergencyContent(newValue);
    } else {
      setContent(newValue);
    }
    
    // 恢复焦点和选择
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + textToInsert.length + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [knowledgeType, setCurrentEmergencyContent]);

  /**
   * 工具栏按钮处理
   */
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

  /**
   * 添加自定义系统标签
   */
  const handleAddSystemTag = useCallback(() => {
    if (!systemTagInput.trim()) return;
    if (!systemTagNames.includes(systemTagInput.trim())) {
      setSystemTagNames(prev => [...prev, systemTagInput.trim()]);
    }
    setSystemTagInput('');
  }, [systemTagInput, systemTagNames]);

  /**
   * 添加自定义操作标签
   */
  const handleAddOperationTag = useCallback(() => {
    if (!operationTagInput.trim()) return;
    if (!operationTagNames.includes(operationTagInput.trim())) {
      setOperationTagNames(prev => [...prev, operationTagInput.trim()]);
    }
    setOperationTagInput('');
  }, [operationTagInput, operationTagNames]);

  /**
   * 表单验证
   */
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

  /**
   * 构建请求数据
   */
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

  /**
   * 保存为草稿
   */
  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      message.error('请检查表单填写是否完整');
      return;
    }

    const requestData = buildRequestData();

    try {
      if (isEdit && id) {
        await updateKnowledge.mutateAsync({ id: Number(id), data: requestData });
        message.success('保存成功');
      } else {
        const result = await createKnowledge.mutateAsync(requestData as KnowledgeCreateRequest);
        message.success('创建成功');
        // 跳转到编辑页面
        navigate(`${ROUTES.ADMIN_KNOWLEDGE}/${result.id}/edit`, { replace: true });
      }
    } catch (error) {
      showApiError(error, isEdit ? '保存失败' : '创建失败');
    }
  }, [validateForm, buildRequestData, isEdit, id, updateKnowledge, createKnowledge, navigate]);

  /**
   * 保存并发布
   */
  const handlePublish = useCallback(async () => {
    if (!validateForm()) {
      message.error('请检查表单填写是否完整');
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

      // 发布
      await publishKnowledge.mutateAsync(savedId);
      message.success('发布成功');
      navigate(ROUTES.ADMIN_KNOWLEDGE);
    } catch (error) {
      showApiError(error, '发布失败');
    }
  }, [validateForm, buildRequestData, isEdit, id, updateKnowledge, createKnowledge, publishKnowledge, navigate]);

  const isSubmitting = createKnowledge.isPending || updateKnowledge.isPending || publishKnowledge.isPending;

  /**
   * 获取面包屑信息
   */
  const breadcrumbInfo = useMemo(() => {
    const lineType = lineTypeTags.find((t: Tag) => t.id === lineTypeId);
    return {
      lineTypeName: lineType?.name || '未分类',
      documentTitle: title || (isEdit ? '编辑知识' : '新建知识'),
    };
  }, [lineTypeTags, lineTypeId, title, isEdit]);

  /**
   * 获取状态信息
   */
  const statusInfo = useMemo(() => {
    if (!isEdit) return { label: '草稿', isDraft: true };
    if (!knowledgeDetail) return { label: '草稿', isDraft: true };
    return {
      label: knowledgeDetail.status === 'PUBLISHED' ? '已发布' : '草稿',
      isDraft: knowledgeDetail.status !== 'PUBLISHED',
    };
  }, [isEdit, knowledgeDetail]);

  /**
   * 解析内容目录
   */
  const outline = useMemo(() => {
    if (knowledgeType === 'EMERGENCY') {
      // 应急类知识：显示结构化章节
      return EMERGENCY_TABS.map((tab) => ({
        id: tab.key,
        level: 1,
        text: tab.label,
      }));
    }
    // 其他类型：从 Markdown 解析标题
    return parseOutline(content);
  }, [knowledgeType, content]);

  // 加载状态
  if (isEdit && detailLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 顶部导航栏 */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <button className={styles.closeButton} onClick={handleClose} title="返回">
            <CloseOutlined />
          </button>
          <div className={styles.breadcrumb}>
            <span className={styles.breadcrumbItem} onClick={handleClose}>知识库</span>
            <span className={styles.breadcrumbSeparator}>/</span>
            <span className={styles.breadcrumbItem}>{breadcrumbInfo.lineTypeName}</span>
            <span className={styles.breadcrumbSeparator}>/</span>
            <span className={styles.breadcrumbActive}>{breadcrumbInfo.documentTitle}</span>
          </div>
        </div>

        {/* 中间：编辑模式切换 */}
        <div className={styles.topBarCenter}>
          <Segmented
            value={editorMode}
            onChange={(value) => setEditorMode(value as EditorMode)}
            options={[
              { label: '编辑', value: 'edit' },
              { label: '分屏', value: 'split' },
              { label: '预览', value: 'preview' },
            ]}
            size="small"
          />
        </div>

        <div className={styles.topBarRight}>
          <div className={`${styles.statusBadge} ${statusInfo.isDraft ? styles.statusDraft : styles.statusPublished}`}>
            <span className={styles.statusDot} />
            <span>{statusInfo.label}</span>
          </div>
          
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={isSubmitting}
          >
            <SaveOutlined />
            保存草稿
          </button>

          <button
            className={styles.publishButton}
            onClick={handlePublish}
            disabled={isSubmitting}
          >
            <SendOutlined />
            {isSubmitting ? '处理中...' : '保存并发布'}
          </button>
        </div>
      </div>

      {/* 主体内容区域 */}
      <div className={styles.mainContent}>
        {/* 左侧目录导航 */}
        <div className={styles.outlineWrapper}>
          {outlineCollapsed ? (
            /* 折叠状态：只显示展开按钮 */
            <button 
              className={styles.outlineExpandBtn}
              onClick={() => setOutlineCollapsed(false)}
              title="展开目录"
            >
              <MenuUnfoldOutlined />
            </button>
          ) : (
            /* 展开状态：显示完整目录面板 */
            <div className={styles.outlinePanel}>
              <div className={styles.outlineHeader}>
                <div className={styles.outlineHeaderTitle}>
                  <OrderedListOutlined style={{ marginRight: 8 }} />
                  目录
                </div>
                <button 
                  className={styles.outlineCollapseBtn}
                  onClick={() => setOutlineCollapsed(true)}
                  title="折叠目录"
                >
                  <CloseCircleOutlined />
                </button>
              </div>
              <div className={styles.outlineContent}>
                {outline.length > 0 ? (
                  outline.map((item) => (
                    <div
                      key={item.id}
                      className={`${styles.outlineItem} ${
                        item.level === 1 ? styles.outlineItemH1 : 
                        item.level === 2 ? styles.outlineItemH2 : 
                        styles.outlineItemH3
                      } ${
                        knowledgeType === 'EMERGENCY' && activeEmergencyTab === item.id 
                          ? styles.outlineItemActive 
                          : ''
                      }`}
                      onClick={() => {
                        if (knowledgeType === 'EMERGENCY') {
                          setActiveEmergencyTab(item.id);
                        }
                      }}
                    >
                      <span className={styles.outlineItemIcon}>{'#'.repeat(item.level)}</span>
                      <span className={styles.outlineItemText}>{item.text}</span>
                    </div>
                  ))
                ) : (
                  <div className={styles.outlineEmpty}>
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
        <div className={styles.editorSection}>
          {/* 编辑器头部 */}
          <div className={styles.editorHeader}>
            <span className={styles.editorTitle}>
              {knowledgeType === 'EMERGENCY' ? '应急知识内容' : '知识内容'}
            </span>
            {editorMode !== 'preview' && (
              <div className={styles.editorActions}>
                <button className={styles.toolbarButton} title="标题" onClick={handleHeading}>
                  <FileTextOutlined />
                </button>
                <button className={styles.toolbarButton} title="加粗" onClick={handleBold}>
                  <BoldOutlined />
                </button>
                <button className={styles.toolbarButton} title="斜体" onClick={handleItalic}>
                  <ItalicOutlined />
                </button>
                <button className={styles.toolbarButton} title="删除线" onClick={handleStrikethrough}>
                  <StrikethroughOutlined />
                </button>
                <button className={styles.toolbarButton} title="代码" onClick={handleCode}>
                  <CodeOutlined />
                </button>
                <button className={styles.toolbarButton} title="链接" onClick={handleLink}>
                  <LinkOutlined />
                </button>
                <button className={styles.toolbarButton} title="无序列表" onClick={handleList}>
                  <UnorderedListOutlined />
                </button>
                <button className={styles.toolbarButton} title="有序列表" onClick={handleOrderedList}>
                  <OrderedListOutlined />
                </button>
                <button className={styles.toolbarButton} title="表格" onClick={handleTable}>
                  <TableOutlined />
                </button>
              </div>
            )}
          </div>

          {/* 编辑内容 */}
          {knowledgeType === 'EMERGENCY' ? (
            <div className={styles.structuredEditor}>
              <div className={styles.structuredTabs}>
                {EMERGENCY_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    className={`${styles.structuredTab} ${activeEmergencyTab === tab.key ? styles.structuredTabActive : ''}`}
                    onClick={() => setActiveEmergencyTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className={styles.structuredContent}>
                {editorMode === 'preview' ? (
                  <div 
                    ref={emergencyPreviewRef}
                    className={`${styles.previewContent} ${styles.editablePreview}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={() => handlePreviewBlur(true)}
                    onInput={handlePreviewInput}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(getCurrentEmergencyContent()) }}
                  />
                ) : editorMode === 'split' ? (
                  <div className={styles.splitView}>
                    <textarea
                      ref={textareaRef}
                      className={styles.editorTextarea}
                      value={getCurrentEmergencyContent()}
                      onChange={(e) => setCurrentEmergencyContent(e.target.value)}
                      placeholder={`在此输入${EMERGENCY_TABS.find(t => t.key === activeEmergencyTab)?.label}内容，支持 Markdown 格式...`}
                    />
                    <div 
                      ref={splitEmergencyPreviewRef}
                      className={`${styles.previewContent} ${styles.editablePreview}`}
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={() => handlePreviewBlur(true, true)}
                      onInput={handlePreviewInput}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(getCurrentEmergencyContent()) }}
                    />
                  </div>
                ) : (
                  <textarea
                    ref={textareaRef}
                    className={styles.editorTextarea}
                    value={getCurrentEmergencyContent()}
                    onChange={(e) => setCurrentEmergencyContent(e.target.value)}
                    placeholder={`在此输入${EMERGENCY_TABS.find(t => t.key === activeEmergencyTab)?.label}内容，支持 Markdown 格式...`}
                  />
                )}
              </div>
              {errors.emergency && <div className={styles.fieldError} style={{ padding: '0 20px 20px' }}>{errors.emergency}</div>}
            </div>
          ) : (
            <div className={styles.editorContent}>
              {editorMode === 'preview' ? (
                <div 
                  ref={previewRef}
                  className={`${styles.previewContent} ${styles.editablePreview}`}
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={() => handlePreviewBlur(false)}
                  onInput={handlePreviewInput}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                />
              ) : editorMode === 'split' ? (
                <div className={styles.splitView}>
                  <textarea
                    ref={textareaRef}
                    className={styles.editorTextarea}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="在此输入知识内容，支持 Markdown 格式..."
                  />
                  <div 
                    ref={splitPreviewRef}
                    className={`${styles.previewContent} ${styles.editablePreview}`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={() => handlePreviewBlur(false, true)}
                    onInput={handlePreviewInput}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                  />
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  className={styles.editorTextarea}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="在此输入知识内容，支持 Markdown 格式..."
                />
              )}
              {errors.content && <div className={styles.fieldError}>{errors.content}</div>}
            </div>
          )}
        </div>

        {/* 右侧元数据面板 */}
        <div className={styles.metadataPanel}>
          {/* 基本信息 */}
          <div className={styles.metadataSection}>
            <div className={styles.metadataSectionHeader}>
              <FileTextOutlined className={styles.metadataSectionIcon} />
              <span className={styles.metadataSectionTitle}>基本信息</span>
            </div>
            
            <div className={styles.field}>
              <label className={styles.fieldLabel}>标题</label>
              <input
                type="text"
                className={styles.fieldInput}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入知识文档标题"
              />
              {errors.title && <div className={styles.fieldError}>{errors.title}</div>}
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>知识概要</label>
              <textarea
                className={styles.fieldTextarea}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="简要描述这篇知识的核心内容（用于卡片预览展示）"
                rows={2}
                maxLength={500}
              />
              <div className={styles.fieldHint}>{summary.length}/500 字符</div>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>知识类型</label>
                <Select
                  value={knowledgeType}
                  onChange={setKnowledgeType}
                  className={styles.fieldSelect}
                >
                  {KNOWLEDGE_TYPE_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                  ))}
                </Select>
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>版本</label>
                <div className={styles.versionBadge}>
                  v{isEdit && knowledgeDetail ? `${knowledgeDetail.version_number || 1}.0` : '1.0'}
                </div>
              </div>
            </div>
          </div>

          {/* 分类标签 */}
          <div className={styles.metadataSection}>
            <div className={styles.metadataSectionHeader}>
              <SettingOutlined className={styles.metadataSectionIcon} />
              <span className={styles.metadataSectionTitle}>分类标签</span>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>条线类型</label>
              <Select
                value={lineTypeId}
                onChange={setLineTypeId}
                className={styles.fieldSelect}
                placeholder="选择条线类型"
              >
                {lineTypeTags.map((tag: Tag) => (
                  <Option key={tag.id} value={tag.id}>{tag.name}</Option>
                ))}
              </Select>
              {errors.lineTypeId && <div className={styles.fieldError}>{errors.lineTypeId}</div>}
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>系统标签</label>
              <Select
                mode="tags"
                value={systemTagNames}
                onChange={setSystemTagNames}
                className={styles.tagsSelect}
                placeholder="选择或输入系统标签"
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: '8px 0' }} />
                    <Space style={{ padding: '0 8px 8px' }}>
                      <Input
                        placeholder="新建标签"
                        value={systemTagInput}
                        onChange={(e) => setSystemTagInput(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        size="small"
                        style={{ width: 120 }}
                      />
                      <Button type="text" icon={<PlusOutlined />} onClick={handleAddSystemTag} size="small">
                        添加
                      </Button>
                    </Space>
                  </>
                )}
              >
                {systemTags.map((tag: Tag) => (
                  <Option key={tag.name} value={tag.name}>{tag.name}</Option>
                ))}
              </Select>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>操作标签</label>
              <Select
                mode="tags"
                value={operationTagNames}
                onChange={setOperationTagNames}
                className={styles.tagsSelect}
                placeholder="选择或输入操作标签"
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: '8px 0' }} />
                    <Space style={{ padding: '0 8px 8px' }}>
                      <Input
                        placeholder="新建标签"
                        value={operationTagInput}
                        onChange={(e) => setOperationTagInput(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        size="small"
                        style={{ width: 120 }}
                      />
                      <Button type="text" icon={<PlusOutlined />} onClick={handleAddOperationTag} size="small">
                        添加
                      </Button>
                    </Space>
                  </>
                )}
              >
                {operationTags.map((tag: Tag) => (
                  <Option key={tag.name} value={tag.name}>{tag.name}</Option>
                ))}
              </Select>
            </div>
          </div>

          {/* 发布状态 */}
          <div className={styles.metadataSection}>
            <div className={styles.metadataSectionHeader}>
              <CheckCircleOutlined className={styles.metadataSectionIcon} />
              <span className={styles.metadataSectionTitle}>发布状态</span>
            </div>

            <div className={styles.statusCard}>
              <div className={styles.statusCardHeader}>
                <span className={styles.statusCardLabel}>当前状态</span>
                <span className={`${styles.statusCardValue} ${statusInfo.isDraft ? styles.statusCardPending : styles.statusCardApproved}`}>
                  <span className={styles.statusDot} />
                  {statusInfo.isDraft ? '待发布' : '已发布'}
                </span>
              </div>
              <div className={styles.statusCardNote}>
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
