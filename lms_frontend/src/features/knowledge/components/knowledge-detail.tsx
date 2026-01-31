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
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

import { Button, ConfirmDialog } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { useStudentTaskKnowledgeDetail } from '../api/get-student-task-knowledge-detail';
import { useKnowledgeDetail } from '../api/knowledge';
import { useDeleteKnowledge } from '../api/manage-knowledge';
import { useCompleteLearning } from '@/features/tasks/api/complete-learning';
import { useStudentLearningTaskDetail } from '@/features/tasks/api/get-task-detail';
import { useAuth } from '@/features/auth/hooks/use-auth';
import type { KnowledgeDetail as KnowledgeDetailType } from '@/types/api';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { showApiError } from '@/utils/error-handler';
import dayjs from '@/lib/dayjs';

import { parseOutline } from '../utils';

export const KnowledgeDetail: React.FC = () => {
  const { id, role } = useParams<{ id: string; role: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { getRolePath } = useRoleNavigate();

  const [outlineCollapsed, setOutlineCollapsed] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ visible: boolean; type: 'delete' | null }>({
    visible: false,
    type: null,
  });

  const searchParams = new URLSearchParams(location.search);
  const taskKnowledgeId = Number(searchParams.get('taskKnowledgeId') || 0);
  const taskId = Number(searchParams.get('task') || 0);
  const fromDashboard = searchParams.get('from') === 'dashboard';

  const { currentRole } = useAuth();
  const effectiveRole = role?.toUpperCase() || currentRole;
  const isStudent = effectiveRole === 'STUDENT';
  const isAdmin = effectiveRole === 'ADMIN';

  const knowledgeQuery = useKnowledgeDetail(Number(id));
  const studentTaskQuery = useStudentTaskKnowledgeDetail(taskKnowledgeId);
  const { data: learningDetail } = useStudentLearningTaskDetail(taskId, {
    enabled: !!taskId && isStudent,
  });

  const { data, isLoading } = taskKnowledgeId ? studentTaskQuery : knowledgeQuery;

  const completeLearning = useCompleteLearning();
  const deleteKnowledge = useDeleteKnowledge();

  const knowledge = data as KnowledgeDetailType | undefined;
  const isEmergency = knowledge?.knowledge_type === 'EMERGENCY';

  const taskKnowledgeItem = useMemo(() => {
    return learningDetail?.knowledge_items.find((item) => item.knowledge_id === Number(id));
  }, [learningDetail, id]);

  const isCompleted = taskKnowledgeItem?.is_completed;

  const outline = useMemo(() => {
    if (!knowledge) return [];
    return parseOutline(knowledge.content || '', isEmergency);
  }, [knowledge, isEmergency]);



  const handleEdit = () => {
    navigate(getRolePath(`knowledge/${id}/edit`));
  };

  const handleComplete = async () => {
    if (!taskId || !id) return;
    try {
      await completeLearning.mutateAsync({
        taskId,
        knowledgeId: Number(id),
      });
      toast.success('已标记为完成');
    } catch {
      toast.error('操作失败，请稍后重试');
    }
  };

  const handleBack = () => {
    if (fromDashboard) {
      navigate(getRolePath('dashboard'));
    } else if (taskId) {
      navigate(getRolePath(`tasks/${taskId}`));
    } else {
      navigate(getRolePath('knowledge'));
    }
  };

  const handleDelete = () => {
    setConfirmModal({ visible: true, type: 'delete' });
  };

  const executeConfirmAction = async () => {
    try {
      await deleteKnowledge.mutateAsync(Number(id));
      toast.success('删除成功');
      navigate(getRolePath('knowledge'));
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
      <div className="flex flex-col h-[calc(100vh-var(--header-height))] -m-6 bg-muted" style={{ fontFamily: "'Outfit', sans-serif" }}>
        <div className="flex items-center justify-between p-4 px-6 bg-background border-b-2 border-border">
          <div className="flex items-center gap-4">
            <Skeleton className="w-9 h-9 rounded-md" />
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="w-52 border-r-2 border-border bg-background" />
          <div className="flex-1 m-4 bg-background rounded-lg">
            <div className="p-12 px-20">
              <Skeleton className="h-10 w-3/4 mb-8" />
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
      <div className="flex flex-col h-[calc(100vh-var(--header-height))] -m-6 bg-muted" style={{ fontFamily: "'Outfit', sans-serif" }}>
        <div className="flex items-center justify-center h-full text-text-muted font-semibold">知识文档不存在</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))] -m-6 bg-muted overflow-hidden" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* 顶部栏 */}
      <div className="flex items-center justify-between h-16 px-6 bg-background border-b border-border shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="flex items-center gap-2.5 px-3 h-10 text-text-muted hover:text-primary-500 hover:bg-primary-50 transition-all group rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm font-semibold">{fromDashboard ? '返回首页' : taskId ? '返回任务' : '返回列表'}</span>
          </Button>
          <div className="w-px h-5 bg-muted" />
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-foreground m-0 leading-tight">{knowledge.title}</h1>
              {knowledge.source_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-primary-600 hover:text-primary-700"
                  onClick={() => window.open(knowledge.source_url, '_blank')}
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                  <span className="text-xs">原始文档</span>
                </Button>
              )}
            </div>
            <div className="flex items-center gap-4 text-[11px] text-text-muted">
              {(knowledge.updated_by_name || knowledge.created_by_name) && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {knowledge.updated_by_name || knowledge.created_by_name}
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

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleEdit} className="h-9 rounded-lg font-semibold">
              <Edit className="w-4 h-4 mr-1.5" />
              编辑
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} className="h-9 bg-destructive-500 hover:bg-destructive-600 rounded-lg font-semibold">
              <Trash2 className="w-4 h-4 mr-1.5" />
              删除
            </Button>
          </div>
        )}

        {isStudent && !!taskId && (
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <span className="text-xs font-bold text-secondary-600 flex items-center gap-1.5 bg-secondary-50 px-4 py-2 rounded-lg border border-secondary-100">
                <CheckCircle className="w-4 h-4" />
                已学习
              </span>
            ) : (
              <Button
                size="sm"
                onClick={handleComplete}
                disabled={completeLearning.isPending}
                className="h-10 bg-primary-600 hover:bg-primary-700 text-white font-bold px-6 rounded-lg transition-all flex items-center gap-2"
              >
                {completeLearning.isPending ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                标记已学习
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 主体内容 */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 左侧目录 */}
        <div className="flex flex-col border-r border-border bg-background w-52 max-lg:hidden">
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
              <div className="flex items-center justify-between px-6 py-5 border-b border-border text-sm font-semibold text-foreground shrink-0">
                <div className="flex items-center gap-2">
                  <List className="w-4 h-4 text-primary-500" />
                  内容大纲
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-text-muted hover:text-primary-500"
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
                          item.level === 1 ? 'font-semibold text-foreground hover:bg-muted' : 'text-text-muted hover:bg-muted'
                        )}
                        style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
                        onClick={() => {
                          const element = document.getElementById(item.id);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }}
                      >
                        <span className="truncate">{item.text}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-[10px] text-text-muted text-center font-medium">暂无目录</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 flex flex-col bg-background overflow-hidden min-w-0">
          {/* 标签栏 */}
          {(knowledge.system_tags?.length || knowledge.operation_tags?.length) ? (
            <div className="flex items-center gap-2 py-4 px-6 md:px-20 border-b border-border flex-wrap bg-muted">
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
          <div className="flex-1 overflow-y-auto p-8 md:p-12 px-6 md:px-20 w-full">
            <h1 className="text-3xl font-bold text-foreground mb-10 tracking-tight">{knowledge.title}</h1>
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
                    <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-3 -ml-4.5">
                      <span className="w-1.5 h-6 bg-primary-500 rounded-full" />
                      {section.label}
                    </h3>
                    <div
                      className="prose prose-gray max-w-none prose-sm sm:prose-base leading-relaxed text-foreground"
                      dangerouslySetInnerHTML={{ __html: section.content || '' }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="prose prose-gray max-w-none prose-sm sm:prose-base leading-relaxed text-foreground"
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
          contentClassName="sm:max-w-md rounded-lg border-2 border-border"
        />
      )}
    </div>
  );
};
