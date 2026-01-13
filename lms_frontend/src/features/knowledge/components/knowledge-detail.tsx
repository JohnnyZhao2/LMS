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
import { cn } from '@/lib/utils';

import { useStudentKnowledgeDetail } from '../api/get-student-knowledge-detail';
import { useStudentTaskKnowledgeDetail } from '../api/get-student-task-knowledge-detail';
import { useKnowledgeDetail as useAdminKnowledgeDetail } from '../api/get-admin-knowledge';
import { useDeleteKnowledge } from '../api/manage-knowledge';
import type { KnowledgeDetail as KnowledgeDetailType } from '@/types/api';
import { ROUTES } from '@/config/routes';
import { showApiError } from '@/utils/error-handler';
import dayjs from '@/lib/dayjs';

import { parseOutline } from '../utils';

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

  const { data, isLoading } = isAdminRoute
    ? adminQuery
    : (taskKnowledgeId ? studentTaskQuery : studentQuery);

  const deleteKnowledge = useDeleteKnowledge();

  const knowledge = data as KnowledgeDetailType | undefined;
  const isEmergency = knowledge?.knowledge_type === 'EMERGENCY';

  const outline = useMemo(() => {
    if (!knowledge) return [];
    return parseOutline(knowledge.content || '', isEmergency);
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
    <div className="flex flex-col h-[calc(100vh-var(--header-height))] -m-6 bg-gray-50 overflow-hidden">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(isAdminRoute ? ROUTES.ADMIN_KNOWLEDGE : ROUTES.KNOWLEDGE)}
            className="flex items-center gap-2.5 px-3 h-10 text-gray-600 hover:text-primary-500 hover:bg-primary-50 transition-all group rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm font-semibold">返回列表</span>
          </Button>
          <div className="w-px h-5 bg-gray-200" />
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-gray-900 m-0 leading-tight">{knowledge.title}</h1>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-gray-500">
              {knowledge.updated_by_name && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {knowledge.updated_by_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {dayjs(knowledge.updated_at).format('YYYY-MM-DD HH:mm')}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {knowledge.view_count} 次阅读
              </span>
            </div>
          </div>
        </div>

        {isAdminRoute && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleEdit} className="h-9 rounded-lg font-semibold">
              <Edit className="w-4 h-4 mr-1.5" />
              编辑
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} className="h-9 bg-red-500 hover:bg-red-600 rounded-lg font-semibold">
              <Trash2 className="w-4 h-4 mr-1.5" />
              删除
            </Button>
          </div>
        )}
      </div>

      {/* 主体内容 */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 左侧目录 */}
        <div className="flex flex-col border-r border-gray-200 bg-white w-64 max-lg:hidden">
          {outlineCollapsed ? (
            <div className="flex flex-col items-center py-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOutlineCollapsed(false)}
                title="展开目录"
              >
                <PanelLeft className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 text-sm font-semibold text-gray-900 shrink-0">
                <div className="flex items-center gap-2">
                  <List className="w-4 h-4 text-primary-500" />
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
              <div className="flex-1 overflow-y-auto py-4 px-2">
                {outline.length > 0 ? (
                  <div className="space-y-0.5">
                    {outline.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center gap-3 py-2.5 px-4 text-xs rounded-lg cursor-pointer transition-all",
                          item.level === 1 ? 'font-semibold text-gray-900 hover:bg-gray-50' : 'text-gray-500 hover:bg-gray-50'
                        )}
                        onClick={() => {
                          const element = document.getElementById(item.id);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }}
                      >
                        <span className="w-4 text-[10px] text-gray-300 font-mono">{'#'.repeat(item.level)}</span>
                        <span className="truncate">{item.text}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-[10px] text-gray-400 text-center font-medium">暂无目录</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden min-w-0 border-l border-gray-200">
          {/* 标签栏 */}
          {(knowledge.system_tags?.length || knowledge.operation_tags?.length) ? (
            <div className="flex items-center gap-2 p-4 px-6 border-b border-gray-200 flex-wrap bg-gray-50/30">
              {knowledge.system_tags?.map((tag) => (
                <Badge key={tag.id} variant="info" className="text-[10px] rounded-md border-none px-2.5 py-1">
                  {tag.name}
                </Badge>
              ))}
              {knowledge.operation_tags?.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="text-[10px] rounded-md border-none px-2.5 py-1">
                  {tag.name}
                </Badge>
              ))}
            </div>
          ) : null}

          {/* 内容 */}
          <div className="flex-1 overflow-y-auto p-12 px-20 w-full">
            {isEmergency ? (
              <div className="space-y-12">
                {[
                  { key: 'fault_scenario', label: '故障场景', content: knowledge.fault_scenario, id: 'tab-0' },
                  { key: 'trigger_process', label: '触发流程', content: knowledge.trigger_process, id: 'tab-1' },
                  { key: 'solution', label: '解决方案', content: knowledge.solution, id: 'tab-2' },
                  { key: 'verification_plan', label: '验证方案', content: knowledge.verification_plan, id: 'tab-3' },
                  { key: 'recovery_plan', label: '恢复方案', content: knowledge.recovery_plan, id: 'tab-4' },
                ].filter(s => s.content).map((section) => (
                  <div key={section.key} id={section.id} className="scroll-mt-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <span className="w-1.5 h-5 bg-primary-500 rounded-full" />
                      {section.label}
                    </h3>
                    <div
                      className="prose prose-gray max-w-none prose-sm sm:prose-base leading-relaxed text-gray-700"
                      dangerouslySetInnerHTML={{ __html: section.content || '' }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="prose prose-gray max-w-none prose-sm sm:prose-base leading-relaxed text-gray-700"
                dangerouslySetInnerHTML={{ __html: knowledge.content || '' }}
              />
            )}
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
