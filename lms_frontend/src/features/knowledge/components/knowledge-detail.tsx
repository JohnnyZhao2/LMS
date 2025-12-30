import { useState, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Eye,
  Calendar,
  User,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  List,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

import { useStudentKnowledgeDetail } from '../api/get-student-knowledge-detail';
import { useKnowledgeDetail as useAdminKnowledgeDetail } from '../api/get-admin-knowledge';
import { useDeleteKnowledge, usePublishKnowledge, useUnpublishKnowledge } from '../api/manage-knowledge';
import type { KnowledgeDetail as KnowledgeDetailType } from '@/types/api';
import { ROUTES } from '@/config/routes';
import { showApiError } from '@/utils/error-handler';
import dayjs from '@/lib/dayjs';

/**
 * 目录项接口
 */
interface OutlineItem {
  id: string;
  level: number;
  text: string;
}

/**
 * 从 Markdown/HTML 内容解析标题生成目录
 */
const parseOutline = (content: string, isEmergency: boolean): OutlineItem[] => {
  if (isEmergency) {
    return [
      { id: 'fault_scenario', level: 1, text: '故障场景' },
      { id: 'trigger_process', level: 1, text: '触发流程' },
      { id: 'solution', level: 1, text: '解决方案' },
      { id: 'verification_plan', level: 1, text: '验证方案' },
      { id: 'recovery_plan', level: 1, text: '恢复方案' },
    ];
  }

  if (!content) return [];

  const lines = content.split('\n');
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
 * 简单的 Markdown 渲染
 */
const renderMarkdown = (markdown: string): string => {
  if (!markdown) return '';

  let html = markdown;

  const escapeHtml = (text: string) => {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  const codeBlocks: string[] = [];
  html = html.replace(/```(\w+)?\n([\s\S]+?)\n```/g, (_, lang, code) => {
    const index = codeBlocks.length;
    codeBlocks.push(`<pre class="p-4 overflow-auto text-sm leading-relaxed bg-gray-50 rounded-lg mb-4"><code class="${lang || ''}">${escapeHtml(code)}</code></pre>`);
    return `__CODE_BLOCK_${index}__`;
  });

  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-6 mb-3 text-gray-900">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-4 pb-2 border-b border-gray-200 text-gray-900">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4 pb-3 border-b border-gray-200 text-gray-900">$1</h1>');

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
  html = html.replace(/~~(.+?)~~/g, '<del class="line-through text-gray-500">$1</del>');

  html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 text-sm bg-gray-100 rounded font-mono">$1</code>');

  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded-lg" />');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary-500 hover:underline">$1</a>');

  html = html.replace(/^> (.+)$/gm, '<blockquote class="pl-4 border-l-4 border-gray-200 text-gray-600 my-4">$1</blockquote>');

  html = html.replace(/^---$/gm, '<hr class="my-6 border-gray-200" />');

  html = html.replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>');
  html = html.replace(/^\* (.+)$/gm, '<li class="ml-4">$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4">$1</li>');
  html = html.replace(/(<li[\s\S]*?<\/li>)+/g, (match) => `<ul class="list-disc pl-6 mb-4">${match}</ul>`);

  const lines = html.split('\n');
  const processedLines: string[] = [];
  const blockTags = ['<h', '<ul', '<ol', '<li', '<table', '<blockquote', '<hr', '<pre'];

  let inParagraph = false;
  let paragraphContent = '';

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      if (inParagraph && paragraphContent) {
        processedLines.push(`<p class="mb-4 leading-relaxed">${paragraphContent}</p>`);
        paragraphContent = '';
        inParagraph = false;
      }
      continue;
    }

    const isBlockElement = blockTags.some((tag) => trimmedLine.startsWith(tag));

    if (isBlockElement) {
      if (inParagraph && paragraphContent) {
        processedLines.push(`<p class="mb-4 leading-relaxed">${paragraphContent}</p>`);
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
    processedLines.push(`<p class="mb-4 leading-relaxed">${paragraphContent}</p>`);
  }

  html = processedLines.join('\n');

  codeBlocks.forEach((block, index) => {
    html = html.replace(`__CODE_BLOCK_${index}__`, block);
  });

  return html;
};

/**
 * 知识详情组件（ShadCN UI 版本）
 */
export const KnowledgeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [outlineCollapsed, setOutlineCollapsed] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ visible: boolean; type: 'delete' | 'unpublish' | null }>({
    visible: false,
    type: null,
  });

  const isAdminRoute = location.pathname.startsWith(ROUTES.ADMIN_KNOWLEDGE);
  const studentQuery = useStudentKnowledgeDetail(Number(id));
  const adminQuery = useAdminKnowledgeDetail(Number(id));

  const { data, isLoading, refetch } = isAdminRoute ? adminQuery : studentQuery;

  const deleteKnowledge = useDeleteKnowledge();
  const publishKnowledge = usePublishKnowledge();
  const unpublishKnowledge = useUnpublishKnowledge();

  const knowledge = data as KnowledgeDetailType | undefined;
  const isEmergency = knowledge?.knowledge_type === 'EMERGENCY';
  const isPublished = knowledge?.status === 'PUBLISHED';

  const outline = useMemo(() => {
    if (!knowledge) return [];
    return parseOutline(knowledge.content || '', isEmergency);
  }, [knowledge, isEmergency]);

  const renderedContent = useMemo(() => {
    if (!knowledge) return '';

    if (isEmergency) {
      const sections = [];
      if (knowledge.fault_scenario) {
        sections.push(`
          <div class="mb-6">
            <h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-primary-100">
              <span class="w-1 h-5 bg-gradient-to-b from-primary-500 to-purple-500 rounded"></span>
              故障场景
            </h3>
            <div class="p-4 bg-gray-50 rounded-lg">${renderMarkdown(knowledge.fault_scenario)}</div>
          </div>
        `);
      }
      if (knowledge.trigger_process) {
        sections.push(`
          <div class="mb-6">
            <h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-primary-100">
              <span class="w-1 h-5 bg-gradient-to-b from-primary-500 to-purple-500 rounded"></span>
              触发流程
            </h3>
            <div class="p-4 bg-gray-50 rounded-lg">${renderMarkdown(knowledge.trigger_process)}</div>
          </div>
        `);
      }
      if (knowledge.solution) {
        sections.push(`
          <div class="mb-6">
            <h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-primary-100">
              <span class="w-1 h-5 bg-gradient-to-b from-primary-500 to-purple-500 rounded"></span>
              解决方案
            </h3>
            <div class="p-4 bg-gray-50 rounded-lg">${renderMarkdown(knowledge.solution)}</div>
          </div>
        `);
      }
      if (knowledge.verification_plan) {
        sections.push(`
          <div class="mb-6">
            <h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-primary-100">
              <span class="w-1 h-5 bg-gradient-to-b from-primary-500 to-purple-500 rounded"></span>
              验证方案
            </h3>
            <div class="p-4 bg-gray-50 rounded-lg">${renderMarkdown(knowledge.verification_plan)}</div>
          </div>
        `);
      }
      if (knowledge.recovery_plan) {
        sections.push(`
          <div class="mb-6">
            <h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-primary-100">
              <span class="w-1 h-5 bg-gradient-to-b from-primary-500 to-purple-500 rounded"></span>
              恢复方案
            </h3>
            <div class="p-4 bg-gray-50 rounded-lg">${renderMarkdown(knowledge.recovery_plan)}</div>
          </div>
        `);
      }
      return sections.join('');
    }

    return renderMarkdown(knowledge.content || '');
  }, [knowledge, isEmergency]);

  const handleEdit = () => {
    navigate(`${ROUTES.ADMIN_KNOWLEDGE}/${id}/edit`);
  };

  const handleDelete = () => {
    setConfirmModal({ visible: true, type: 'delete' });
  };

  const handlePublish = async () => {
    try {
      await publishKnowledge.mutateAsync(Number(id));
      toast.success('发布成功');
      refetch?.();
    } catch (error) {
      showApiError(error, '发布失败');
    }
  };

  const handleUnpublish = () => {
    setConfirmModal({ visible: true, type: 'unpublish' });
  };

  const executeConfirmAction = async () => {
    try {
      if (confirmModal.type === 'delete') {
        await deleteKnowledge.mutateAsync(Number(id));
        toast.success('删除成功');
        navigate(ROUTES.ADMIN_KNOWLEDGE);
      } else if (confirmModal.type === 'unpublish') {
        await unpublishKnowledge.mutateAsync(Number(id));
        toast.success('取消发布成功');
        refetch?.();
      }
    } catch (error) {
      showApiError(error, confirmModal.type === 'delete' ? '删除失败' : '取消发布失败');
    }
    setConfirmModal({ visible: false, type: null });
  };

  const getConfirmModalContent = () => {
    if (confirmModal.type === 'delete') {
      return {
        title: '确认删除',
        content: `确定要删除知识文档「${knowledge?.title}」吗？此操作不可撤销。`,
      };
    }
    return {
      title: '确认取消发布',
      content: '取消发布后，该知识将变为草稿状态。确定要取消发布吗？',
    };
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-var(--header-height))] -m-6 bg-gray-50">
        <div className="flex items-center justify-between p-4 px-6 bg-white border-b border-gray-100">
          <div className="flex items-center gap-4">
            <Skeleton className="w-9 h-9 rounded-lg" />
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 m-4 bg-white rounded-xl shadow-sm">
            <div className="p-6">
              <Skeleton className="h-6 w-full mb-4" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!knowledge) {
    return (
      <div className="flex flex-col h-[calc(100vh-var(--header-height))] -m-6 bg-gray-50">
        <div className="flex items-center justify-center h-full text-gray-500">知识文档不存在</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))] -m-6 bg-gray-50">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between p-4 px-6 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-4">
          <button
            className="flex items-center justify-center w-9 h-9 bg-gray-50 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900 m-0">{knowledge.title}</h1>
              {isAdminRoute && (
                <Badge variant={isPublished ? 'success' : 'secondary'} className="text-xs">
                  {knowledge.status_display}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {knowledge.updated_by_name && (
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {knowledge.updated_by_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {dayjs(knowledge.updated_at).format('YYYY-MM-DD HH:mm')}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {knowledge.view_count} 次阅读
              </span>
            </div>
          </div>
        </div>

        {isAdminRoute && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit className="w-4 h-4 mr-1" />
              编辑
            </Button>
            {isPublished ? (
              <Button variant="outline" size="sm" onClick={handleUnpublish}>
                <XCircle className="w-4 h-4 mr-1" />
                取消发布
              </Button>
            ) : (
              <Button size="sm" onClick={handlePublish}>
                <CheckCircle className="w-4 h-4 mr-1" />
                发布
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-1" />
              删除
            </Button>
          </div>
        )}
      </div>

      {/* 主体内容 */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 左侧目录 */}
        <div className="flex flex-col m-4 mr-2 shrink-0 max-lg:hidden">
          {outlineCollapsed ? (
            <button
              className="flex items-center justify-center w-8 h-8 bg-white rounded-lg shadow-sm text-gray-500 hover:bg-gray-50 hover:text-primary-500 hover:shadow-md transition-all"
              onClick={() => setOutlineCollapsed(false)}
              title="展开目录"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-56 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[200px] max-h-[500px]">
              <div className="flex items-center justify-between p-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <div className="flex items-center">
                  <List className="w-3.5 h-3.5 mr-2" />
                  目录
                </div>
                <button
                  className="flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
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
                      className={`flex items-center gap-2 py-2 cursor-pointer transition-all text-gray-600 text-sm hover:bg-gray-50 hover:text-primary-500 ${
                        item.level === 1 ? 'pl-3 font-semibold' : item.level === 2 ? 'pl-5' : 'pl-7 text-xs'
                      }`}
                    >
                      <span className="text-xs font-mono font-semibold text-gray-400 min-w-6 text-right">
                        {'#'.repeat(item.level)}
                      </span>
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap">{item.text}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-xs text-gray-400 text-center">暂无目录</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 flex flex-col m-4 ml-2 bg-white rounded-xl shadow-sm overflow-hidden min-w-0">
          {/* 标签栏 */}
          {(knowledge.system_tags?.length || knowledge.operation_tags?.length) ? (
            <div className="flex items-center gap-2 p-3 px-5 border-b border-gray-100 flex-wrap">
              {knowledge.system_tags?.map((tag) => (
                <span
                  key={tag.id}
                  className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: 'rgba(155, 0, 255, 0.08)', color: '#9B00FF' }}
                >
                  {tag.name}
                </span>
              ))}
              {knowledge.operation_tags?.map((tag) => (
                <Badge key={tag.id} variant="info" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
            </div>
          ) : null}

          {/* 内容 */}
          <div className="flex-1 overflow-y-auto p-6 px-8">
            <div
              className="text-base leading-relaxed text-gray-800"
              dangerouslySetInnerHTML={{ __html: renderedContent }}
            />
          </div>
        </div>
      </div>

      {/* 确认弹窗 */}
      <Dialog open={confirmModal.visible} onOpenChange={(open) => setConfirmModal({ visible: open, type: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{getConfirmModalContent().title}</DialogTitle>
            <DialogDescription>{getConfirmModalContent().content}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmModal({ visible: false, type: null })}>
              取消
            </Button>
            <Button
              variant={confirmModal.type === 'delete' ? 'destructive' : 'default'}
              onClick={executeConfirmAction}
            >
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
