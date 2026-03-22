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
  ExternalLink,
  Link as LinkIcon,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';

import { useStudentTaskKnowledgeDetail } from '../api/get-student-task-knowledge-detail';
import { useKnowledgeDetail } from '../api/knowledge';
import { useDeleteKnowledge } from '../api/manage-knowledge';
import { useCompleteLearning } from '@/features/tasks/api/complete-learning';
import { useStudentLearningTaskDetail } from '@/features/tasks/api/get-task-detail';
import { useAuth } from '@/features/auth/hooks/use-auth';
import type { KnowledgeDetail as KnowledgeDetailType } from '@/types/api';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { showApiError } from '@/utils/error-handler';
import { bionicHtml } from '../utils/content-utils';
import dayjs from '@/lib/dayjs';

function relTime(dateStr: string): string {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d === 0) return '今天';
  if (d === 1) return '昨天';
  if (d < 30) return `${d} 天前`;
  return `${Math.floor(d / 30)} 个月前`;
}

export const KnowledgeDetail: React.FC = () => {
  const { id, role } = useParams<{ id: string; role: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { getRolePath } = useRoleNavigate();

  const [confirmModal, setConfirmModal] = useState<{ visible: boolean; type: 'delete' | null }>({
    visible: false,
    type: null,
  });

  const searchParams = new URLSearchParams(location.search);
  const taskKnowledgeId = Number(searchParams.get('taskKnowledgeId') || 0);
  const taskId = Number(searchParams.get('task') || 0);
  const fromDashboard = searchParams.get('from') === 'dashboard';

  const { currentRole, hasPermission } = useAuth();
  const effectiveRole = (role?.toUpperCase() as typeof currentRole) || currentRole;
  const isStudent = effectiveRole === 'STUDENT';
  const canUpdateKnowledge = hasPermission('knowledge.update');
  const canDeleteKnowledge = hasPermission('knowledge.delete');

  const knowledgeQuery = useKnowledgeDetail(Number(id));
  const studentTaskQuery = useStudentTaskKnowledgeDetail(taskKnowledgeId);
  const { data: learningDetail } = useStudentLearningTaskDetail(taskId, {
    enabled: !!taskId && isStudent,
  });

  const { data, isLoading } = taskKnowledgeId ? studentTaskQuery : knowledgeQuery;

  const completeLearning = useCompleteLearning();
  const deleteKnowledge = useDeleteKnowledge();

  const knowledge = data as KnowledgeDetailType | undefined;

  const taskKnowledgeItem = useMemo(() => {
    return learningDetail?.knowledge_items.find((item) => item.knowledge_id === Number(id));
  }, [learningDetail, id]);

  const isCompleted = taskKnowledgeItem?.is_completed;

  const renderedContent = useMemo(() => {
    if (!knowledge?.content) return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(knowledge.content, 'text/html');
    doc.querySelectorAll('h1, h2, h3').forEach((heading, index) => {
      heading.id = `heading-${index}`;
    });
    return bionicHtml(doc.body.innerHTML);
  }, [knowledge?.content]);

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
      <div className="flex h-[calc(100vh-9rem)] -mx-6 bg-[#e8eaec] rounded-[18px] overflow-hidden">
        <div className="flex-1 p-16">
          <Skeleton className="h-10 w-3/4 mb-8" />
          <Skeleton className="h-6 w-full mb-4" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="w-[300px] bg-[#eef0f3] p-5">
          <Skeleton className="h-7 w-full mb-3" />
          <Skeleton className="h-4 w-20 mb-6" />
          <Skeleton className="h-4 w-16 mb-3" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    );
  }

  if (!knowledge) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-9rem)] -mx-6 bg-[#e8eaec] rounded-[18px] text-text-muted font-semibold">
        知识文档不存在
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] -mx-6 overflow-hidden">
      {/* 返回按钮条 */}
      <div
        className="shrink-0 px-5 py-3 flex items-center"
        style={{ background: 'rgba(232,234,236,0.92)' }}
      >
        <Button
          variant="ghost"
          onClick={handleBack}
          className="flex items-center gap-2 px-3 h-9 text-text-muted hover:text-foreground transition-all group rounded-lg text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          {fromDashboard ? '返回首页' : taskId ? '返回任务' : '返回列表'}
        </Button>
      </div>

      {/* 主体：左内容 + 右meta */}
      <div
        className="flex flex-1 min-h-0 overflow-hidden rounded-[18px] mx-4 mb-4"
        style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }}
      >
        {/* 左侧内容 */}
        <div
          className="flex-1 overflow-y-auto scrollbar-subtle"
          style={{
            padding: '60px 72px 80px',
            background: '#fff',
            fontFamily: "Georgia, 'Times New Roman', 'PingFang SC', serif",
          }}
        >
          <div
            className="detail-content-mymind"
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        </div>

        {/* 右侧 meta 面板 */}
        <div
          className="w-[300px] shrink-0 flex flex-col overflow-y-auto scrollbar-subtle"
          style={{ background: '#eef0f3' }}
        >
          {/* Header 渐变区 */}
          <div
            style={{
              background: 'linear-gradient(160deg, #dce4ee 0%, #eef0f3 100%)',
              padding: '22px 20px 16px',
            }}
          >
            <h1
              style={{
                fontSize: 17,
                fontWeight: 400,
                color: '#4a5a6a',
                margin: 0,
                lineHeight: 1.3,
                letterSpacing: '-0.01em',
              }}
            >
              {knowledge.title}
            </h1>
            <p style={{ fontSize: 12, color: '#9aa0aa', margin: '5px 0 0' }}>
              {relTime(knowledge.updated_at)}
            </p>
          </div>

          {/* Body */}
          <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* 元信息 */}
            <div style={{ marginBottom: 18 }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const,
                  color: '#a0a8b0',
                  margin: '0 0 10px',
                }}
              >
                详细信息
              </p>
              <div className="space-y-2.5">
                {(knowledge.updated_by_name || knowledge.created_by_name) && (
                  <div className="flex items-center gap-2 text-xs text-[#777]">
                    <User className="w-3.5 h-3.5 text-[#aaa]" />
                    <span>{knowledge.updated_by_name || knowledge.created_by_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-[#777]">
                  <Calendar className="w-3.5 h-3.5 text-[#aaa]" />
                  <span>{dayjs(knowledge.updated_at).format('YYYY-MM-DD HH:mm')}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#777]">
                  <Eye className="w-3.5 h-3.5 text-[#aaa]" />
                  <span>{knowledge.view_count} 次阅读</span>
                </div>
              </div>
            </div>

            {/* 标签 */}
            {knowledge.tags?.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase' as const,
                    color: '#a0a8b0',
                    margin: '0 0 10px',
                  }}
                >
                  系统标签
                </p>
                <div className="flex flex-wrap gap-[7px]">
                  {knowledge.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] text-[#555]"
                      style={{ background: '#e0e3e8' }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 条线 */}
            {knowledge.line_tag && (
              <div style={{ marginBottom: 18 }}>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase' as const,
                    color: '#a0a8b0',
                    margin: '0 0 10px',
                  }}
                >
                  所属条线
                </p>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium"
                  style={{ background: '#e8793a18', color: '#e8793a', border: '1.5px solid #e8793a40' }}
                >
                  {knowledge.line_tag.name}
                </span>
              </div>
            )}

            {/* 来源链接 */}
            {knowledge.source_url && (
              <a
                href={knowledge.source_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs no-underline mb-4 break-all"
                style={{ color: '#7a9baa' }}
              >
                <LinkIcon className="w-3 h-3 shrink-0" />
                {knowledge.source_url.replace(/^https?:\/\//, '')}
              </a>
            )}

            {/* 学生标记已学习 */}
            {isStudent && !!taskId && (
              <div style={{ marginBottom: 18 }}>
                {isCompleted ? (
                  <div
                    className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
                    style={{ background: '#e0f5e0', color: '#2d8a2d' }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    已学习
                  </div>
                ) : (
                  <button
                    onClick={handleComplete}
                    disabled={completeLearning.isPending}
                    className="w-full border-none rounded-xl py-3 text-sm font-semibold cursor-pointer transition-all"
                    style={{
                      background: '#e8793a',
                      color: '#fff',
                      fontFamily: 'inherit',
                      opacity: completeLearning.isPending ? 0.6 : 1,
                    }}
                  >
                    {completeLearning.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        处理中...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        标记已学习
                      </span>
                    )}
                  </button>
                )}
              </div>
            )}

            <div className="flex-1" />
          </div>

          {/* 底部操作按钮 */}
          <div
            style={{
              borderTop: '1px solid rgba(0,0,0,0.07)',
              padding: '14px 20px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
            }}
          >
            {knowledge.source_url && (
              <button
                onClick={() => window.open(knowledge.source_url, '_blank')}
                className="detail-action-btn"
                title="查看来源"
              >
                <ExternalLink className="w-[15px] h-[15px]" />
              </button>
            )}
            {canUpdateKnowledge && (
              <button
                onClick={handleEdit}
                className="detail-action-btn"
                title="编辑"
              >
                <Edit className="w-[15px] h-[15px]" />
              </button>
            )}
            {canDeleteKnowledge && (
              <button
                onClick={handleDelete}
                className="detail-action-btn detail-action-btn-danger"
                title="删除"
              >
                <Trash2 className="w-[15px] h-[15px]" />
              </button>
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

      {/* mymind Detail 内容样式 */}
      <style>{`
        .detail-content-mymind {
          font-family: Georgia, 'Times New Roman', 'PingFang SC', serif;
        }
        .detail-content-mymind h1 {
          font-size: 32px;
          font-weight: 600;
          color: #111;
          margin: 0 0 28px;
          text-align: center;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }
        .detail-content-mymind h2 {
          font-size: 24px;
          font-weight: 600;
          color: #111;
          margin: 32px 0 14px;
          letter-spacing: -0.02em;
          line-height: 1.3;
          font-family: 'DM Sans', 'PingFang SC', sans-serif;
        }
        .detail-content-mymind h3 {
          font-size: 17px;
          font-weight: 600;
          color: #222;
          margin: 28px 0 10px;
          font-family: 'DM Sans', 'PingFang SC', sans-serif;
        }
        .detail-content-mymind p {
          font-size: 16px;
          line-height: 1.85;
          color: #333;
          margin: 0 0 18px;
        }
        .detail-content-mymind p:last-child {
          margin: 0;
        }
        .detail-content-mymind ul,
        .detail-content-mymind ol {
          padding-left: 24px;
          margin: 10px 0 18px;
        }
        .detail-content-mymind li {
          font-size: 15px;
          line-height: 1.8;
          color: #444;
          margin-bottom: 7px;
        }
        .detail-content-mymind strong {
          font-weight: 700;
          color: #111;
        }
        .detail-content-mymind em {
          font-style: italic;
        }
        .detail-content-mymind code {
          background: #f4f4f2;
          padding: 2px 6px;
          border-radius: 5px;
          font-size: 0.87em;
          font-family: 'SF Mono', monospace;
          color: #555;
        }
        .detail-content-mymind pre {
          background: #f4f4f2;
          border-radius: 10px;
          padding: 18px 22px;
          font-size: 13px;
          margin: 16px 0;
          overflow-x: auto;
          font-family: monospace;
          line-height: 1.6;
        }
        .detail-content-mymind blockquote {
          border-left: 3px solid #e0e0e0;
          padding-left: 20px;
          color: #777;
          margin: 18px 0;
          font-style: italic;
          font-size: 18px;
        }
        .detail-content-mymind img {
          max-width: 100%;
          border-radius: 10px;
          margin: 16px 0;
        }
        .detail-content-mymind table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
          font-size: 14px;
        }
        .detail-content-mymind th,
        .detail-content-mymind td {
          text-align: left;
          padding: 10px 14px;
          border-bottom: 1px solid #eee;
        }
        .detail-content-mymind th {
          font-weight: 600;
          color: #333;
          background: #fafafa;
        }

        /* 底部操作按钮 */
        .detail-action-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1.5px solid #d0d4d8;
          background: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9aa0aa;
          transition: all 0.15s;
        }
        .detail-action-btn:hover {
          border-color: #888;
          color: #555;
        }
        .detail-action-btn-danger:hover {
          border-color: #e44;
          color: #e44;
        }
      `}</style>
    </div>
  );
};
