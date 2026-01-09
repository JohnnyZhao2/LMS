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
  List,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';

import { Button, ConfirmDialog } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { useStudentKnowledgeDetail } from '../api/get-student-knowledge-detail';
import { useStudentTaskKnowledgeDetail } from '../api/get-student-task-knowledge-detail';
import { useKnowledgeDetail as useAdminKnowledgeDetail } from '../api/get-admin-knowledge';
import { useDeleteKnowledge } from '../api/manage-knowledge';
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

  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-6 mb-3 text-gray-900">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-4 pb-2 border-b-2 border-gray-200 text-gray-900">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4 pb-3 border-b-2 border-gray-200 text-gray-900">$1</h1>');

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
  html = html.replace(/~~(.+?)~~/g, '<del class="line-through text-gray-500">$1</del>');

  html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 text-sm bg-gray-100 rounded font-mono">$1</code>');

  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded-lg" />');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary-500 hover:underline">$1</a>');

  html = html.replace(/^> (.+)$/gm, '<blockquote class="pl-4 border-l-4 border-gray-300 text-gray-600 my-4">$1</blockquote>');

  html = html.replace(/^---$/gm, '<hr class="my-6 border-t-2 border-gray-200" />');

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
  const [confirmModal, setConfirmModal] = useState<{ visible: boolean; type: 'delete' | null }>({
    visible: false,
    type: null,
  });

  const isAdminRoute = location.pathname.startsWith(ROUTES.ADMIN_KNOWLEDGE);
  const taskKnowledgeId = Number(new URLSearchParams(location.search).get('taskKnowledgeId') || 0);
  const studentQuery = useStudentKnowledgeDetail(Number(id));
  const studentTaskQuery = useStudentTaskKnowledgeDetail(taskKnowledgeId);
  const adminQuery = useAdminKnowledgeDetail(Number(id));

  const { data, isLoading, refetch } = isAdminRoute
    ? adminQuery
    : (taskKnowledgeId ? studentTaskQuery : studentQuery);

  const deleteKnowledge = useDeleteKnowledge();

  const knowledge = data as KnowledgeDetailType | undefined;
  const isEmergency = knowledge?.knowledge_type === 'EMERGENCY';

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
            <h3 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b-2 border-blue-600">
              故障场景
            </h3>
            <div class="p-4 bg-gray-100 rounded-lg">${renderMarkdown(knowledge.fault_scenario)}</div>
          </div>
        `);
      }
      if (knowledge.trigger_process) {
        sections.push(`
          <div class="mb-6">
            <h3 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b-2 border-blue-600">
              触发流程
            </h3>
            <div class="p-4 bg-gray-100 rounded-lg">${renderMarkdown(knowledge.trigger_process)}</div>
          </div>
        `);
      }
      if (knowledge.solution) {
        sections.push(`
          <div class="mb-6">
            <h3 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b-2 border-blue-600">
              解决方案
            </h3>
            <div class="p-4 bg-gray-100 rounded-lg">${renderMarkdown(knowledge.solution)}</div>
          </div>
        `);
      }
      if (knowledge.verification_plan) {
        sections.push(`
          <div class="mb-6">
            <h3 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b-2 border-blue-600">
              验证方案
            </h3>
            <div class="p-4 bg-gray-100 rounded-lg">${renderMarkdown(knowledge.verification_plan)}</div>
          </div>
        `);
      }
      if (knowledge.recovery_plan) {
        sections.push(`
          <div class="mb-6">
            <h3 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b-2 border-blue-600">
              恢复方案
            </h3>
            <div class="p-4 bg-gray-100 rounded-lg">${renderMarkdown(knowledge.recovery_plan)}</div>
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

  const executeConfirmAction = async () => {
    try {
      await deleteKnowledge.mutateAsync(Number(id));
      toast.success('删除成功');
      navigate(ROUTES.ADMIN_KNOWLEDGE);
    } catch (error) {
      showApiError(error, '删除失败');
    }
    setConfirmModal({ visible: false, type: null });
  };

  const getConfirmModalContent = () => {
    return {
      title: '确认删除',
      content: `确定要删除知识文档「${knowledge?.title}」吗？此操作不可撤销。`,
    };
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-var(--header-height))] -m-6 bg-gray-100" style={{ fontFamily: "'Outfit', sans-serif" }}>
        <div className="flex items-center justify-between p-4 px-6 bg-white border-b-2 border-gray-200">
          <div className="flex items-center gap-4">
            <Skeleton className="w-9 h-9 rounded-md" />
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 m-4 bg-white rounded-lg">
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
      <div className="flex flex-col h-[calc(100vh-var(--header-height))] -m-6 bg-gray-100" style={{ fontFamily: "'Outfit', sans-serif" }}>
        <div className="flex items-center justify-center h-full text-gray-600 font-semibold">知识文档不存在</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))] -m-6 bg-gray-100" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* 顶部栏 */}
      <div className="flex items-center justify-between p-4 px-6 bg-white border-b-2 border-gray-200 shrink-0">
        <div className="flex items-center gap-4">
          <button
            className="flex items-center justify-center w-9 h-9 bg-gray-100 rounded-md text-gray-600 hover:bg-gray-200 transition-all duration-200"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900 m-0">{knowledge.title}</h1>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
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
            <Button variant="outline" size="sm" onClick={handleEdit} className="border-2 rounded-md">
              <Edit className="w-4 h-4 mr-1" />
              编辑
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} className="bg-red-600 hover:bg-red-700 rounded-md">
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
              className="flex items-center justify-center w-8 h-8 bg-white rounded-md text-gray-600 hover:bg-gray-100 hover:text-blue-600 transition-all duration-200 border-2 border-gray-200"
              onClick={() => setOutlineCollapsed(false)}
              title="展开目录"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-56 bg-white rounded-lg overflow-hidden flex flex-col min-h-[200px] max-h-[500px] border-2 border-gray-200">
              <div className="flex items-center justify-between p-3 border-b-2 border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <div className="flex items-center">
                  <List className="w-3.5 h-3.5 mr-2" />
                  目录
                </div>
                <button
                  className="flex items-center justify-center w-6 h-6 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all duration-200"
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
                      className={`flex items-center gap-2 py-2 cursor-pointer transition-all text-gray-700 text-sm hover:bg-gray-100 hover:text-blue-600 ${
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
                  <div className="p-4 text-xs text-gray-500 text-center">暂无目录</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 flex flex-col m-4 ml-2 bg-white rounded-lg overflow-hidden min-w-0 border-2 border-gray-200">
          {/* 标签栏 */}
          {(knowledge.system_tags?.length || knowledge.operation_tags?.length) ? (
            <div className="flex items-center gap-2 p-3 px-5 border-b-2 border-gray-200 flex-wrap">
              {knowledge.system_tags?.map((tag) => (
                <Badge key={tag.id} variant="info" className="text-xs rounded-md">
                  {tag.name}
                </Badge>
              ))}
              {knowledge.operation_tags?.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="text-xs rounded-md">
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
      {confirmModal.type && (
        <ConfirmDialog
          open={confirmModal.visible}
          onOpenChange={(open) => setConfirmModal({ visible: open, type: null })}
          title={getConfirmModalContent().title}
          description={getConfirmModalContent().content}
          confirmText="确定"
          cancelText="取消"
          confirmVariant="destructive"
          onConfirm={executeConfirmAction}
          isConfirming={deleteKnowledge.isPending}
          contentClassName="sm:max-w-md rounded-lg border-2 border-gray-200"
        />
      )}
    </div>
  );
};
