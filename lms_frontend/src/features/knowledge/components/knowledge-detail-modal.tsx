import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Eye,
  Calendar,
  User,
  Edit,
  Trash2,
  CheckCircle,
  ExternalLink,
  Link as LinkIcon,
  X,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';

import { Skeleton } from '@/components/ui/skeleton';
import { useKnowledgeDetail } from '../api/knowledge';
import { useUpdateKnowledge } from '../api/manage-knowledge';
import { useKnowledgeTags, useLineTypeTags } from '../api/get-tags';
import { useCompleteLearning } from '@/features/tasks/api/complete-learning';
import { useStudentLearningTaskDetail } from '@/features/tasks/api/get-task-detail';
import { useAuth } from '@/features/auth/hooks/use-auth';
import type { KnowledgeDetail as KnowledgeDetailType } from '@/types/api';
import type { SimpleTag } from '@/types/common';
import { bionicHtml } from '../utils/content-utils';
import { RichTextEditor } from './rich-text-editor';
import { FocusOrbIcon } from './focus-orb-icon';
import dayjs from '@/lib/dayjs';

function relTime(dateStr: string): string {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d === 0) return '今天';
  if (d === 1) return '昨天';
  if (d < 30) return `${d} 天前`;
  return `${Math.floor(d / 30)} 个月前`;
}

interface KnowledgeDetailModalProps {
  knowledgeId: number;
  startEditing?: boolean;
  taskId?: number;
  taskKnowledgeId?: number;
  onClose: () => void;
  onDelete?: (id: number) => void;
  onUpdated?: () => void;
}

export const KnowledgeDetailModal: React.FC<KnowledgeDetailModalProps> = ({
  knowledgeId,
  startEditing = false,
  taskId,
  taskKnowledgeId,
  onClose,
  onDelete,
  onUpdated,
}) => {
  const { currentRole, hasPermission } = useAuth();
  const isStudent = currentRole === 'STUDENT';
  const canUpdateKnowledge = hasPermission('knowledge.update');
  const canDeleteKnowledge = hasPermission('knowledge.delete');

  const { data, isLoading } = useKnowledgeDetail(knowledgeId);
  const updateKnowledge = useUpdateKnowledge();
  const completeLearning = useCompleteLearning();
  const knowledge = data as KnowledgeDetailType | undefined;
  const { data: learningDetail } = useStudentLearningTaskDetail(taskId || 0, {
    enabled: isStudent && !!taskId,
  });

  // 标签和条线列表
  const { data: allKnowledgeTags = [] } = useKnowledgeTags();
  const { data: allLineTypes = [] } = useLineTypeTags();

  // 编辑状态
  const [editing, setEditing] = useState(startEditing);
  const [editContent, setEditContent] = useState<string | undefined>(undefined);
  const [editTitle, setEditTitle] = useState<string | undefined>(undefined);
  const [editTags, setEditTags] = useState<SimpleTag[] | undefined>(undefined);
  const [editLineTagId, setEditLineTagId] = useState<number | undefined | null>(undefined);

  // 标签输入
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInput, setTagInput] = useState('');
  // 条线选择
  const [showLineTypes, setShowLineTypes] = useState(false);
  // 专注模式（全屏查看）
  const [isFocusMode, setIsFocusMode] = useState(false);

  const content = knowledge?.content ?? '';
  const renderedContent = useMemo(() => {
    if (!content) return '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    doc.querySelectorAll('h1, h2, h3').forEach((heading, index) => {
      heading.id = `heading-${index}`;
    });
    return bionicHtml(doc.body.innerHTML);
  }, [content]);

  // 实际使用的值
  const activeContent = editContent ?? knowledge?.content ?? '';
  const activeTitle = editTitle ?? knowledge?.title ?? '';
  const activeTags = editTags ?? knowledge?.tags ?? [];
  const activeLineTagId = editLineTagId === undefined
    ? knowledge?.line_tag?.id ?? null
    : editLineTagId;
  const taskKnowledgeItem = useMemo(() => {
    if (!learningDetail) return undefined;
    return learningDetail.knowledge_items.find((item) => (
      taskKnowledgeId ? item.id === taskKnowledgeId : item.knowledge_id === knowledgeId
    ));
  }, [learningDetail, taskKnowledgeId, knowledgeId]);
  const isCompleted = taskKnowledgeItem?.is_completed;

  // 判断是否有改动
  const hasChanges = knowledge && (
    (editContent !== undefined && editContent !== knowledge.content) ||
    (editTitle !== undefined && editTitle !== knowledge.title) ||
    (editTags !== undefined) ||
    (editLineTagId !== undefined)
  );

  // 标签操作
  const addTag = useCallback((tag: SimpleTag) => {
    const current = editTags ?? knowledge?.tags ?? [];
    if (current.some(t => t.id === tag.id)) return;
    setEditTags([...current, tag]);
    setTagInput('');
    setShowTagInput(false);
  }, [editTags, knowledge?.tags]);

  const removeTag = useCallback((tagId: number) => {
    const current = editTags ?? knowledge?.tags ?? [];
    setEditTags(current.filter(t => t.id !== tagId));
  }, [editTags, knowledge?.tags]);

  // 可选的标签（排除已选）
  const availableTags = allKnowledgeTags.filter(t =>
    !activeTags.some(at => at.id === t.id) &&
    (!tagInput || t.name.toLowerCase().includes(tagInput.toLowerCase()))
  );

  // Esc 关闭 + 禁止背景滚动
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showLineTypes) {
          setShowLineTypes(false);
        } else if (showTagInput) {
          setShowTagInput(false);
        } else if (editing) {
          setEditing(false);
        } else if (isFocusMode) {
          setIsFocusMode(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose, editing, showLineTypes, showTagInput, isFocusMode]);

  const handleSave = useCallback(async () => {
    if (!knowledge || !hasChanges) return;
    try {
      await updateKnowledge.mutateAsync({
        id: knowledgeId,
        data: {
          ...(editTitle !== undefined && { title: editTitle }),
          ...(editContent !== undefined && { content: editContent }),
          ...(editTags !== undefined && { tag_ids: editTags.map(t => t.id) }),
          ...(editLineTagId !== undefined && { line_tag_id: editLineTagId ?? undefined }),
        },
      });
      toast.success('已保存');
      setEditing(false);
      setEditContent(undefined);
      setEditTitle(undefined);
      setEditTags(undefined);
      setEditLineTagId(undefined);
      onUpdated?.();
    } catch {
      toast.error('保存失败');
    }
  }, [knowledge, hasChanges, editTitle, editContent, editTags, editLineTagId, knowledgeId, updateKnowledge, onUpdated]);

  const handleDelete = () => {
    onDelete?.(knowledgeId);
    onClose();
  };

  const handleComplete = useCallback(async () => {
    if (!taskId || !knowledgeId) return;
    try {
      await completeLearning.mutateAsync({ taskId, knowledgeId });
      toast.success('已标记为完成');
      onUpdated?.();
    } catch {
      toast.error('操作失败，请稍后重试');
    }
  }, [taskId, knowledgeId, completeLearning, onUpdated]);

  return (
    <div
      className="kd-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`kd-container${isFocusMode ? ' kd-container-focus' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setIsFocusMode(v => !v)}
          className="kd-focus-btn"
          data-tip={isFocusMode ? '退出专注' : '专注'}
          title={isFocusMode ? '退出专注' : '专注'}
          aria-label={isFocusMode ? '退出专注' : '专注'}
        >
          <FocusOrbIcon size={20} active={isFocusMode} interactive />
        </button>

        {isLoading ? (
          <>
            <div className="kd-left">
              <Skeleton className="h-10 w-3/4 mb-8" />
              <Skeleton className="h-5 w-full mb-4" />
              <Skeleton className="h-5 w-5/6 mb-4" />
              <Skeleton className="h-4 w-2/3 mb-3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="kd-right">
              <div className="kd-right-header">
                <Skeleton className="h-6 w-full mb-3" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="kd-right-body">
                <Skeleton className="h-3 w-12 mb-3" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          </>
        ) : !knowledge ? (
          <div className="kd-left" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#aaa', fontSize: 15, fontStyle: 'italic' }}>知识文档不存在</p>
          </div>
        ) : (
          <>
            {/* ── 左侧：点击进入编辑 / 查看内容 ── */}
            <div className="kd-left scrollbar-subtle">
              {editing ? (
                <div className="kd-editor-wrap">
                  <RichTextEditor
                    value={activeContent}
                    onChange={setEditContent}
                    placeholder="编辑内容…"
                    className="kd-tiptap-editor"
                    contentClassName="kd-tiptap-content"
                  />
                </div>
              ) : (
                <div
                  className="kd-content"
                  onClick={() => { if (canUpdateKnowledge) setEditing(true); }}
                  style={{ cursor: canUpdateKnowledge ? 'text' : 'default' }}
                  dangerouslySetInnerHTML={{ __html: renderedContent }}
                />
              )}
            </div>

            {/* ── 右侧 meta 面板 ── */}
            <div className="kd-right scrollbar-subtle">
              {/* 顶部渐变 header — 标题可编辑 */}
              <div className="kd-right-header">
                {canUpdateKnowledge ? (
                  <input
                    value={activeTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Title goes here"
                    className="kd-title-input"
                  />
                ) : (
                  <h2 className="kd-title">{knowledge.title}</h2>
                )}
                <p className="kd-time">{relTime(knowledge.updated_at)}</p>
              </div>

              {/* body */}
              <div className="kd-right-body">

                {/* ── 系统标签 ── */}
                <div className="kd-section">
                  <p className="kd-label">系统标签</p>

                  {/* 标签输入框（mymind 风格） */}
                  {canUpdateKnowledge && showTagInput && (
                    <div className="kd-tag-input-wrap">
                      <div className="kd-tag-input-row">
                        <input
                          autoFocus
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') { setTagInput(''); setShowTagInput(false); }
                          }}
                          placeholder=""
                          className="kd-tag-input"
                        />
                        <button
                          onClick={() => setShowTagInput(false)}
                          className="kd-tag-input-close"
                        >
                          <X style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                      {availableTags.length > 0 && (
                        <div className="kd-tag-suggestions">
                          {availableTags.slice(0, 8).map(t => (
                            <button
                              key={t.id}
                              onClick={() => addTag(t)}
                              className="kd-tag-suggestion-item"
                            >
                              {t.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="kd-tags">
                    {canUpdateKnowledge && (
                      <button
                        onClick={() => { setShowTagInput(v => !v); setTagInput(''); }}
                        className="kd-add-tag-btn"
                      >
                        <Plus style={{ width: 12, height: 12 }} />
                        添加标签
                      </button>
                    )}
                    {activeTags.map(t => (
                      <span key={t.id} className="kd-tag">
                        {t.name}
                        {canUpdateKnowledge && (
                          <button onClick={() => removeTag(t.id)} className="kd-tag-remove">
                            <X style={{ width: 10, height: 10 }} />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 元信息 */}
                <div className="kd-section">
                  <p className="kd-label">详细信息</p>
                  <div className="kd-meta-list">
                    {(knowledge.updated_by_name || knowledge.created_by_name) && (
                      <div className="kd-meta-item">
                        <User className="kd-meta-icon" />
                        <span>{knowledge.updated_by_name || knowledge.created_by_name}</span>
                      </div>
                    )}
                    {knowledge.source_url && (
                      <a
                        href={knowledge.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="kd-source-link"
                      >
                        <LinkIcon style={{ width: 11, height: 11, flexShrink: 0 }} />
                        {knowledge.source_url.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                    <div className="kd-meta-item">
                      <Calendar className="kd-meta-icon" />
                      <span>{dayjs(knowledge.updated_at).format('YYYY-MM-DD HH:mm')}</span>
                    </div>
                    <div className="kd-meta-item">
                      <Eye className="kd-meta-icon" />
                      <span>{knowledge.view_count} 次阅读</span>
                    </div>
                  </div>
                </div>

                {isStudent && !!taskId && (
                  <div className="kd-section">
                    {isCompleted ? (
                      <div className="kd-complete-done">
                        <CheckCircle style={{ width: 14, height: 14 }} />
                        已学习
                      </div>
                    ) : (
                      <button
                        onClick={handleComplete}
                        disabled={completeLearning.isPending}
                        className="kd-complete-btn"
                      >
                        {completeLearning.isPending ? '处理中…' : '标记已学习'}
                      </button>
                    )}
                  </div>
                )}

                <div style={{ flex: 1 }} />
              </div>

              {/* 底部操作 */}
              <div className="kd-bottom" style={{ position: 'relative' }}>
                {/* 条线选择弹窗 */}
                {showLineTypes && (
                  <div className="kd-linetype-popover">
                    {allLineTypes.map(lt => (
                      <button
                        key={lt.id}
                        onClick={() => { setEditLineTagId(lt.id); setShowLineTypes(false); }}
                        className="kd-linetype-item"
                        style={{ background: activeLineTagId === lt.id ? '#f0f4ff' : 'none' }}
                      >
                        <span
                          className="kd-linetype-dot"
                          style={{
                            borderColor: activeLineTagId === lt.id ? '#e8793a' : '#ccc',
                          }}
                        >
                          {activeLineTagId === lt.id && (
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#e8793a' }} />
                          )}
                        </span>
                        {lt.name}
                      </button>
                    ))}
                  </div>
                )}

                {canUpdateKnowledge && (editing || hasChanges) ? (
                  <button
                    onClick={handleSave}
                    disabled={!hasChanges || updateKnowledge.isPending}
                    className="kd-save-btn"
                    style={{
                      opacity: !hasChanges ? 0.5 : 1,
                      cursor: !hasChanges ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {updateKnowledge.isPending ? '保存中…' : '保存'}
                  </button>
                ) : (
                  <div className="kd-action-group">
                    {canUpdateKnowledge && (
                      <button
                        onClick={() => setShowLineTypes(!showLineTypes)}
                        className="kd-action-btn"
                        title="切换条线"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <circle cx="12" cy="12" r="9" />
                        </svg>
                      </button>
                    )}
                    {knowledge.source_url && (
                      <button
                        onClick={() => window.open(knowledge.source_url, '_blank')}
                        className="kd-action-btn"
                        title="查看来源"
                      >
                        <ExternalLink style={{ width: 15, height: 15 }} />
                      </button>
                    )}
                    {canUpdateKnowledge && (
                      <button
                        onClick={() => setEditing(true)}
                        className="kd-action-btn"
                        title="编辑"
                      >
                        <Edit style={{ width: 15, height: 15 }} />
                      </button>
                    )}
                    {canDeleteKnowledge && (
                      <button
                        onClick={handleDelete}
                        className="kd-action-btn kd-action-danger"
                        title="删除"
                      >
                        <Trash2 style={{ width: 15, height: 15 }} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── 样式 ── */}
      <style>{`
        .kd-overlay {
          position: fixed; inset: 0; z-index: 400;
          background: rgba(0,0,0,0.6);
          display: flex; align-items: center; justify-content: center;
          animation: kdFadeIn .18s ease;
        }
        .kd-container {
          display: flex;
          width: min(1640px, 96vw); height: min(900px, 94vh);
          border-radius: 6px; overflow: hidden;
          padding: 10px;
          gap: 10px;
          box-shadow: 0 40px 100px rgba(0,0,0,0.35);
          animation: kdPopIn .22s cubic-bezier(.4,0,.2,1);
          background: #f1f3f6;
          position: relative;
          transition: width 0.22s ease, height 0.22s ease, border-radius 0.22s ease;
        }
        .kd-container-focus {
          width: 100vw;
          height: 100vh;
          border-radius: 0;
          padding: 12px;
          gap: 12px;
        }
        .kd-focus-btn {
          position: absolute;
          left: 16px;
          top: 14px;
          width: 30px;
          height: 30px;
          border-radius: 999px;
          border: none;
          background: transparent;
          color: #7c8794;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          z-index: 20;
          transition: transform 0.18s ease;
        }
        .kd-focus-btn:hover {
          transform: translateY(-1px);
        }
        .kd-focus-btn::after {
          content: attr(data-tip);
          position: absolute;
          left: calc(100% + 12px);
          top: 50%;
          transform: translateY(-50%) translateX(-2px);
          border-radius: 999px;
          padding: 10px 24px;
          background: rgba(243, 245, 248, 0.96);
          color: #22252b;
          font-size: 17px;
          font-weight: 500;
          line-height: 1;
          opacity: 0;
          pointer-events: none;
          white-space: nowrap;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.1);
          transition: opacity 0.16s ease, transform 0.16s ease;
        }
        .kd-focus-btn:hover::after {
          opacity: 1;
          transform: translateY(-50%) translateX(0);
        }
        .kd-left {
          flex: 1; overflow-y: auto;
          background: #fff;
          border-radius: 6px;
          box-shadow: 0 10px 24px rgba(21, 38, 61, 0.07);
          padding: 60px 92px 80px;
          display: flex; flex-direction: column;
        }
        .kd-right {
          width: 320px; background: #eef2f6;
          border-radius: 6px;
          box-shadow: 0 10px 24px rgba(21, 38, 61, 0.08);
          display: flex; flex-direction: column; flex-shrink: 0;
          overflow: hidden; position: relative;
        }
        .kd-right-header {
          background: linear-gradient(160deg, #dce4ee 0%, #eef0f3 100%);
          padding: 22px 20px 16px;
        }
        .kd-title {
          font-size: 17px; font-weight: 400; color: #6a7a8a;
          margin: 0; line-height: 1.3; letter-spacing: -0.01em;
        }
        .kd-title-input {
          width: 100%; border: none; background: none; outline: none;
          font-size: 17px; font-weight: 400; color: #6a7a8a;
          margin-bottom: 5px; line-height: 1.3;
          font-family: inherit; padding: 0;
        }
        .kd-title-input::placeholder { color: #bbb; }
        .kd-time { font-size: 12px; color: #9aa0aa; margin: 5px 0 0; }
        .kd-right-body {
          padding: 18px 20px; flex: 1;
          display: flex; flex-direction: column;
          overflow-y: auto;
        }
        .kd-section { margin-bottom: 18px; }
        .kd-label {
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: #a0a8b0; margin: 0 0 10px;
        }
        .kd-meta-list { display: flex; flex-direction: column; gap: 8px; }
        .kd-meta-item {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: #777;
        }
        .kd-meta-icon { width: 14px; height: 14px; color: #aaa; flex-shrink: 0; }

        /* Tags */
        .kd-tags { display: flex; flex-wrap: wrap; gap: 7px; align-items: center; }
        .kd-tag {
          display: inline-flex; align-items: center; gap: 5px;
          background: #e0e3e8; border-radius: 100px;
          padding: 5px 12px; font-size: 13px; color: #555;
        }
        .kd-tag-remove {
          background: none; border: none; cursor: pointer;
          color: #aaa; display: flex; padding: 0;
          transition: color 0.15s;
        }
        .kd-tag-remove:hover { color: #666; }
        .kd-add-tag-btn {
          background: #e8793a; border: none; border-radius: 100px;
          padding: 6px 16px; font-size: 13px; color: #fff;
          cursor: pointer; font-family: inherit; font-weight: 600;
          display: inline-flex; align-items: center; gap: 4px;
          transition: background 0.15s;
        }
        .kd-add-tag-btn:hover { background: #d66b2e; }

        /* Tag input */
        .kd-tag-input-wrap {
          margin-bottom: 8px; background: #fff;
          border-radius: 6px; overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .kd-tag-input-row {
          display: flex; align-items: center;
        }
        .kd-tag-input {
          flex: 1; border: none; background: none;
          padding: 10px 14px; font-size: 13.5px;
          color: #333; outline: none; font-family: inherit;
        }
        .kd-tag-input-close {
          background: none; border: none; padding: 0 14px;
          cursor: pointer; color: #ccc; display: flex;
          align-items: center;
        }
        .kd-tag-input-close:hover { color: #999; }
        .kd-tag-suggestions { border-top: 1px solid #f0f0f0; }
        .kd-tag-suggestion-item {
          width: 100%; text-align: left; border: none;
          background: none; padding: 9px 14px; font-size: 13.5px;
          color: #333; cursor: pointer; font-family: inherit;
          display: block;
        }
        .kd-tag-suggestion-item:hover { background: #f5f5f5; }

        .kd-complete-done {
          display: flex; align-items: center; gap: 8px;
          border-radius: 6px; padding: 10px 12px;
          font-size: 13px; font-weight: 600;
          background: #e0f5e0; color: #2d8a2d;
        }
        .kd-complete-btn {
          width: 100%; border: none; border-radius: 6px;
          padding: 10px 12px; font-size: 13px; font-weight: 600;
          color: #fff; background: #e8793a; cursor: pointer;
          font-family: inherit; transition: opacity 0.15s;
        }
        .kd-complete-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Line type popover */
        .kd-linetype-popover {
          position: absolute; bottom: calc(100% + 8px);
          left: 20px; right: 20px; background: #fff;
          border-radius: 6px; box-shadow: 0 -4px 28px rgba(0,0,0,0.13);
          overflow: hidden; z-index: 10;
        }
        .kd-linetype-item {
          width: 100%; display: flex; align-items: center; gap: 10px;
          padding: 11px 16px; border: none; cursor: pointer;
          font-size: 13.5px; color: #333; font-family: inherit;
          background: none;
        }
        .kd-linetype-item:hover { background: #f9f9f9; }
        .kd-linetype-dot {
          width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid #ccc; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }

        /* Source link */
        .kd-source-link {
          font-size: 12px; color: #7a9baa;
          display: flex; align-items: center; gap: 5px;
          text-decoration: none; margin-bottom: 14px;
          word-break: break-all;
        }
        .kd-source-link:hover { color: #5a8baa; }

        /* Bottom */
        .kd-bottom {
          padding: 14px 20px 16px;
          display: flex; align-items: center; justify-content: center;
        }
        .kd-action-group { display: flex; align-items: center; gap: 24px; }
        .kd-action-btn {
          width: 36px; height: 36px; border-radius: 50%;
          border: none; background: #fff;
          cursor: pointer; display: flex; align-items: center;
          justify-content: center; color: #9aa0aa;
          transition: all 0.15s; padding: 0; font-family: inherit;
        }
        .kd-action-btn:hover { border-color: #aaa; color: #555; }
        .kd-action-danger:hover { border-color: #e44; color: #e44; }
        .kd-save-btn {
          width: 100%; background: #111; border: none;
          border-radius: 6px; padding: 12px 0; color: #fff;
          font-size: 14px; font-weight: 500; cursor: pointer;
          font-family: inherit; transition: opacity 0.15s;
        }
        .kd-save-btn:hover { background: #222; }

        /* Content typography */
        .kd-content {
          font-family: Georgia, 'Times New Roman', 'PingFang SC', serif;
          flex: 1; min-height: 100%;
          width: 100%;
          max-width: 860px;
          margin: 0 auto;
        }
        .kd-content h1 {
          font-size: 32px; font-weight: 600; color: #111;
          margin: 0 0 28px; text-align: center;
          letter-spacing: -0.02em; line-height: 1.2;
        }
        .kd-content h2 {
          font-size: 24px; font-weight: 600; color: #111;
          margin: 32px 0 14px; letter-spacing: -0.02em; line-height: 1.3;
          font-family: 'DM Sans', 'PingFang SC', sans-serif;
        }
        .kd-content h3 {
          font-size: 17px; font-weight: 600; color: #222;
          margin: 28px 0 10px;
          font-family: 'DM Sans', 'PingFang SC', sans-serif;
        }
        .kd-content p {
          font-size: 16px; line-height: 1.85; color: #333;
          margin: 0 0 18px;
        }
        .kd-content p:last-child { margin: 0; }
        .kd-content ul, .kd-content ol { padding-left: 24px; margin: 10px 0 18px; }
        .kd-content li { font-size: 15px; line-height: 1.8; color: #444; margin-bottom: 7px; }
        .kd-content strong { font-weight: 700; color: #111; }
        .kd-content em { font-style: italic; }
        .kd-content code {
          background: #f4f4f2; padding: 2px 6px; border-radius: 6px;
          font-size: 0.87em; font-family: 'SF Mono', monospace; color: #555;
        }
        .kd-content pre {
          background: #f4f4f2; border-radius: 6px; padding: 18px 22px;
          font-size: 13px; margin: 16px 0; overflow-x: auto;
          font-family: monospace; line-height: 1.6;
        }
        .kd-content blockquote {
          border-left: 3px solid #e0e0e0; padding-left: 20px;
          color: #777; margin: 18px 0; font-style: italic; font-size: 18px;
        }
        .kd-content img { max-width: 100%; border-radius: 6px; margin: 16px 0; }
        .kd-content table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
        .kd-content th, .kd-content td { text-align: left; padding: 10px 14px; border-bottom: 1px solid #eee; }
        .kd-content th { font-weight: 600; color: #333; background: #fafafa; }

        /* Editor */
        .kd-editor-wrap {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 200px;
          width: 100%;
          max-width: 860px;
          margin: 0 auto;
        }
        .kd-tiptap-editor {
          flex: 1; display: flex; flex-direction: column;
          border: none !important; border-radius: 0 !important; overflow: hidden;
        }
        .kd-tiptap-content {
          font-family: Georgia, 'Times New Roman', 'PingFang SC', serif !important;
          font-size: 16px !important; line-height: 1.85 !important;
          color: #333 !important; padding: 0 !important; min-height: 300px !important;
        }

        @keyframes kdFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes kdPopIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes kdOrbSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
