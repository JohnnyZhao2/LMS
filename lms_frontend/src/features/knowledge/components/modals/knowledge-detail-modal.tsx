import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Eye,
  Calendar,
  User,
  Edit,
  Trash2,
  Check,
  CheckCircle,
  ExternalLink,
  Link as LinkIcon,
  X,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';

import { Skeleton } from '@/components/ui/skeleton';
import { useKnowledgeDetail } from '../../api/knowledge';
import { useCreateKnowledge, useUpdateKnowledge } from '../../api/manage-knowledge';
import { useLineTypeTags } from '../../api/get-tags';
import { useCompleteLearning } from '@/features/tasks/api/complete-learning';
import { useStudentLearningTaskDetail } from '@/features/tasks/api/get-task-detail';
import { useAuth } from '@/features/auth/hooks/use-auth';
import type { KnowledgeDetail as KnowledgeDetailType } from '@/types/api';
import type { SimpleTag } from '@/types/common';
import type { RelatedLink } from '@/types/knowledge';
import { FocusOrbIcon } from '../shared/focus-icon';
import { SlashQuillEditor } from '../editor/rich-text-editor';
import { TagInput } from '../shared/tag-input';
import { KnowledgeFocusShell } from './knowledge-focus-shell';
import { getKnowledgeTitleFromHtml } from '../../utils/content-utils';
import { hasMeaningfulKnowledgeHtml, textToKnowledgeHtml } from '../../utils/slash-shortcuts';
import dayjs from '@/lib/dayjs';

function relTime(dateStr: string): string {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d === 0) return '今天';
  if (d === 1) return '昨天';
  if (d < 30) return `${d} 天前`;
  return `${Math.floor(d / 30)} 个月前`;
}

function createEmptyRelatedLink(): RelatedLink {
  return {
    title: '',
    url: '',
  };
}

const RELATED_LINK_DISPLAY_MAX_LENGTH = 42;

function normalizeRelatedLinkUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

function truncateRelatedLinkText(text: string): string {
  if (text.length <= RELATED_LINK_DISPLAY_MAX_LENGTH) {
    return text;
  }

  return `${text.slice(0, RELATED_LINK_DISPLAY_MAX_LENGTH).trimEnd()}...`;
}

function getRelatedLinkDisplayText(link: RelatedLink): string {
  const title = link.title?.trim();
  if (title) {
    return truncateRelatedLinkText(title);
  }

  return truncateRelatedLinkText(normalizeRelatedLinkUrl(link.url) || '相关链接');
}

interface KnowledgeDetailModalProps {
  knowledgeId?: number;
  startEditing?: boolean;
  startInFocus?: boolean;
  closeOnExitFocus?: boolean;
  forceFocus?: boolean;
  draftInitialContent?: string;
  draftInitialLineTagId?: number;
  taskId?: number;
  taskKnowledgeId?: number;
  onClose: () => void;
  onFocusOpen?: (id: number) => void;
  onDelete?: (id: number) => void;
  onCreated?: (id: number) => void;
  onUpdated?: () => void;
}

export const KnowledgeDetailModal: React.FC<KnowledgeDetailModalProps> = ({
  knowledgeId,
  startEditing = false,
  startInFocus = false,
  closeOnExitFocus = false,
  forceFocus = false,
  draftInitialContent,
  draftInitialLineTagId,
  taskId,
  taskKnowledgeId,
  onClose,
  onFocusOpen,
  onDelete,
  onCreated,
  onUpdated,
}) => {
  const { currentRole, hasPermission } = useAuth();
  const isStudent = currentRole === 'STUDENT';
  const canUpdateKnowledge = hasPermission('knowledge.update');
  const canDeleteKnowledge = hasPermission('knowledge.delete');
  const isDraftMode = !knowledgeId;
  const normalizedDraftContent = draftInitialContent
    ? (draftInitialContent.includes('<') ? draftInitialContent : textToKnowledgeHtml(draftInitialContent))
    : '';

  const { data, isLoading } = useKnowledgeDetail({
    knowledgeId,
    taskKnowledgeId,
  });
  const createKnowledge = useCreateKnowledge();
  const updateKnowledge = useUpdateKnowledge();
  const completeLearning = useCompleteLearning();
  const knowledgeFromQuery = data as KnowledgeDetailType | undefined;
  const [localKnowledgeSnapshot, setLocalKnowledgeSnapshot] = useState<{
    knowledgeId: number;
    detail: KnowledgeDetailType;
  } | undefined>(undefined);
  const { data: learningDetail } = useStudentLearningTaskDetail(taskId || 0, {
    enabled: isStudent && !!taskId && !isDraftMode,
  });
  const hasLocalSnapshot = Boolean(localKnowledgeSnapshot && localKnowledgeSnapshot.knowledgeId === knowledgeId);
  const fetchedKnowledge = hasLocalSnapshot
    ? localKnowledgeSnapshot!.detail
    : knowledgeFromQuery;
  const knowledge = isDraftMode ? undefined : fetchedKnowledge;

  // 条线列表
  const { data: allLineTypes = [] } = useLineTypeTags();

  // 编辑状态
  const [editing, setEditing] = useState(startEditing);
  const [editContent, setEditContent] = useState<string | undefined>(undefined);
  const [editTitle, setEditTitle] = useState<string | undefined>(undefined);
  const [editTags, setEditTags] = useState<SimpleTag[] | undefined>(undefined);
  const [editLineTagId, setEditLineTagId] = useState<number | undefined | null>(undefined);
  const [editRelatedLinks, setEditRelatedLinks] = useState<RelatedLink[] | undefined>(undefined);

  // 标签输入展开
  const [showTagInput, setShowTagInput] = useState(false);
  // 条线选择
  const [showLineTypes, setShowLineTypes] = useState(false);
  // 专注模式（全屏查看）
  const [isFocusMode, setIsFocusMode] = useState(forceFocus || startInFocus);
  const canEditInFocus = isFocusMode && canUpdateKnowledge;
  const isSaving = isDraftMode ? createKnowledge.isPending : updateKnowledge.isPending;

  const activeContent = editContent ?? knowledge?.content ?? normalizedDraftContent;

  // 实际使用的值
  const activeTitle = editTitle ?? knowledge?.title ?? '';
  const activeTags = editTags ?? knowledge?.tags ?? [];
  const shouldShowSystemTagsSection = !isStudent || activeTags.length > 0;
  const activeLineTagId = editLineTagId === undefined
    ? knowledge?.line_tag?.id ?? null
    : editLineTagId;
  const activeRelatedLinks = editRelatedLinks ?? knowledge?.related_links ?? [];
  const taskKnowledgeItem = useMemo(() => {
    if (!learningDetail) return undefined;
    return learningDetail.knowledge_items.find((item) => (
      taskKnowledgeId ? item.id === taskKnowledgeId : item.knowledge_id === knowledgeId
    ));
  }, [learningDetail, taskKnowledgeId, knowledgeId]);
  const isCompleted = taskKnowledgeItem?.is_completed;

  useEffect(() => {
    setEditing(isDraftMode ? true : startEditing);
    setIsFocusMode(forceFocus || startInFocus || isDraftMode);
    setEditContent(isDraftMode ? normalizedDraftContent : undefined);
    setEditTitle(isDraftMode ? getKnowledgeTitleFromHtml(normalizedDraftContent) : undefined);
    setEditTags(isDraftMode ? [] : undefined);
    setEditLineTagId(isDraftMode ? (draftInitialLineTagId ?? null) : undefined);
    setEditRelatedLinks(isDraftMode ? [] : undefined);
    setShowTagInput(false);
    setShowLineTypes(false);
  }, [draftInitialLineTagId, forceFocus, isDraftMode, knowledgeId, normalizedDraftContent, startEditing, startInFocus]);

  // 判断是否有改动
  const hasChanges = isDraftMode
    ? hasMeaningfulKnowledgeHtml(activeContent)
    : (knowledge && (
      (editContent !== undefined && editContent !== knowledge.content) ||
      (editTitle !== undefined && editTitle !== knowledge.title) ||
      (editTags !== undefined) ||
      (editLineTagId !== undefined) ||
      (editRelatedLinks !== undefined)
    ));
  const canSubmit = Boolean(hasChanges);

  // 标签操作
  const addTag = useCallback((tag: { id: number; name: string }) => {
    const current = editTags ?? knowledge?.tags ?? [];
    if (current.some(t => t.id === tag.id)) return;
    setEditTags([...current, tag]);
  }, [editTags, knowledge?.tags]);

  const removeTag = useCallback((tagId: number) => {
    const current = editTags ?? knowledge?.tags ?? [];
    setEditTags(current.filter(t => t.id !== tagId));
  }, [editTags, knowledge?.tags]);

  const handleRelatedLinkChange = useCallback((
    index: number,
    field: keyof RelatedLink,
    value: string,
  ) => {
    const current = editRelatedLinks ?? knowledge?.related_links ?? [];
    setEditRelatedLinks(current.map((item, itemIndex) => (
      itemIndex === index
        ? { ...item, [field]: value }
        : item
    )));
  }, [editRelatedLinks, knowledge?.related_links]);

  const handleAddRelatedLink = useCallback(() => {
    const current = editRelatedLinks ?? knowledge?.related_links ?? [];
    setEditRelatedLinks([...current, createEmptyRelatedLink()]);
  }, [editRelatedLinks, knowledge?.related_links]);

  const handleRemoveRelatedLink = useCallback((index: number) => {
    const current = editRelatedLinks ?? knowledge?.related_links ?? [];
    setEditRelatedLinks(current.filter((_, itemIndex) => itemIndex !== index));
  }, [editRelatedLinks, knowledge?.related_links]);

  const handleExitFocusMode = useCallback(() => {
    if (closeOnExitFocus || forceFocus) {
      onClose();
      return;
    }
    setIsFocusMode(false);
  }, [closeOnExitFocus, forceFocus, onClose]);

  // Esc 关闭 + 禁止背景滚动
  useEffect(() => {
    const htmlStyle = document.documentElement.style;
    const bodyStyle = document.body.style;
    const previousHtmlOverflow = htmlStyle.overflow;
    const previousBodyOverflow = bodyStyle.overflow;
    const previousHtmlOverscrollBehavior = htmlStyle.overscrollBehavior;
    const previousBodyOverscrollBehavior = bodyStyle.overscrollBehavior;
    const previousHtmlScrollbarGutter = htmlStyle.scrollbarGutter;
    const previousBodyScrollbarGutter = bodyStyle.scrollbarGutter;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFocusMode) {
          handleExitFocusMode();
        } else if (showLineTypes) {
          setShowLineTypes(false);
        } else if (editing) {
          setEditing(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    htmlStyle.overflow = 'hidden';
    bodyStyle.overflow = 'hidden';
    htmlStyle.overscrollBehavior = 'none';
    bodyStyle.overscrollBehavior = 'none';
    htmlStyle.scrollbarGutter = 'auto';
    bodyStyle.scrollbarGutter = 'auto';
    return () => {
      window.removeEventListener('keydown', handler);
      htmlStyle.overflow = previousHtmlOverflow;
      bodyStyle.overflow = previousBodyOverflow;
      htmlStyle.overscrollBehavior = previousHtmlOverscrollBehavior;
      bodyStyle.overscrollBehavior = previousBodyOverscrollBehavior;
      htmlStyle.scrollbarGutter = previousHtmlScrollbarGutter;
      bodyStyle.scrollbarGutter = previousBodyScrollbarGutter;
    };
  }, [onClose, editing, showLineTypes, isFocusMode, handleExitFocusMode]);

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;
    if (!isDraftMode && !knowledge) return;
    try {
      const sanitizedRelatedLinks = activeRelatedLinks
        .filter((item) => item.url.trim())
        .map((item) => ({
          title: item.title?.trim() ?? '',
          url: item.url.trim(),
        }));
      const createDerivedTitle = getKnowledgeTitleFromHtml(activeContent);
      const createTitle = (createDerivedTitle || activeTitle || '未命名知识').trim();

      if (isDraftMode) {
        const created = await createKnowledge.mutateAsync({
          ...(createTitle && { title: createTitle }),
          ...(activeLineTagId ? { line_tag_id: activeLineTagId } : {}),
          content: activeContent,
          ...(sanitizedRelatedLinks.length > 0 ? { related_links: sanitizedRelatedLinks } : {}),
          ...(activeTags.length > 0 ? { tag_ids: activeTags.map((item) => item.id) } : {}),
        });
        toast.success('知识创建成功');
        onCreated?.(created.id);
        onUpdated?.();
        return;
      }

      const updateDerivedTitle = editContent !== undefined ? getKnowledgeTitleFromHtml(editContent) : '';
      const updateTitle = editContent !== undefined
        ? (updateDerivedTitle || editTitle || knowledge!.title)
        : (editTitle ?? knowledge!.title);
      const detailRelatedLinks = editRelatedLinks?.filter((item) => item.url.trim()).map((item) => ({
        title: item.title?.trim() ?? '',
        url: item.url.trim(),
      }));
      const updatedKnowledge = await updateKnowledge.mutateAsync({
        id: knowledgeId!,
        data: {
          title: updateTitle,
          ...(editContent !== undefined && { content: editContent }),
          ...(editTags !== undefined && { tag_ids: editTags.map(t => t.id) }),
          ...(editLineTagId !== undefined && { line_tag_id: editLineTagId ?? undefined }),
          ...(editRelatedLinks !== undefined && { related_links: detailRelatedLinks }),
        },
      });
      if (knowledgeId) {
        setLocalKnowledgeSnapshot({
          knowledgeId,
          detail: updatedKnowledge,
        });
      }
      toast.success('已保存');
      if (!canEditInFocus) {
        setEditing(false);
      }
      setEditContent(undefined);
      setEditTitle(undefined);
      setEditTags(undefined);
      setEditLineTagId(undefined);
      setEditRelatedLinks(undefined);
      onUpdated?.();
    } catch {
      toast.error(isDraftMode ? '创建失败' : '保存失败');
    }
  }, [knowledge, hasChanges, activeRelatedLinks, activeContent, activeTitle, isDraftMode, createKnowledge, activeLineTagId, activeTags, onCreated, onUpdated, editContent, editLineTagId, editRelatedLinks, editTags, editTitle, canEditInFocus, knowledgeId, updateKnowledge]);

  const handleContentChange = useCallback((nextContent: string) => {
    setEditContent(nextContent);

    const derivedTitle = getKnowledgeTitleFromHtml(nextContent);
    if (derivedTitle) {
      setEditTitle(derivedTitle);
    }
  }, []);

  const handleDelete = () => {
    if (!knowledgeId) return;
    onDelete?.(knowledgeId);
    onClose();
  };

  const handleCancelEdit = useCallback(() => {
    setEditing(false);
    setEditContent(undefined);
    setEditTitle(undefined);
    setEditTags(undefined);
    setEditLineTagId(undefined);
    setEditRelatedLinks(undefined);
    setShowTagInput(false);
    setShowLineTypes(false);
  }, []);

  const handleComplete = useCallback(async () => {
    if (!taskId || !taskKnowledgeId) return;
    try {
      await completeLearning.mutateAsync({ taskId, taskKnowledgeId });
      toast.success('已标记为完成');
      onUpdated?.();
    } catch {
      toast.error('操作失败，请稍后重试');
    }
  }, [taskId, taskKnowledgeId, completeLearning, onUpdated]);

  const renderLearningAction = (immersive = false) => {
    if (!isStudent || !taskId || !taskKnowledgeId) {
      return null;
    }

    if (isCompleted) {
      return (
        <div className={`kd-complete-done${immersive ? ' kd-complete-done-immersive' : ''}`}>
          <CheckCircle style={{ width: 14, height: 14 }} />
          已学习
        </div>
      );
    }

    return (
      <button
        onClick={handleComplete}
        disabled={completeLearning.isPending}
        className={`kd-complete-btn${immersive ? ' kd-complete-btn-immersive' : ''}`}
      >
        {completeLearning.isPending ? '处理中…' : '标记已学习'}
      </button>
    );
  };

  const learningAction = renderLearningAction();
  const immersiveLearningAction = renderLearningAction(true);

  const modalContent = (
    <div
      className="kd-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`kd-container${isFocusMode ? ' kd-container-focus' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {!isFocusMode && (
          <button
            type="button"
            onClick={() => {
              if (onFocusOpen && knowledgeId) {
                onFocusOpen(knowledgeId);
                return;
              }
              if (isFocusMode) {
                handleExitFocusMode();
              } else {
                setIsFocusMode(true);
              }
            }}
            className="kd-focus-btn"
            data-tip={isFocusMode ? '退出专注' : '专注'}
            title={isFocusMode ? '退出专注' : '专注'}
            aria-label={isFocusMode ? '退出专注' : '专注'}
          >
            <FocusOrbIcon size={20} active={isFocusMode} interactive />
          </button>
        )}

        {isLoading && !isDraftMode ? (
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
        ) : !knowledge && !isDraftMode ? (
          <div className="kd-left" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#aaa', fontSize: 15, fontStyle: 'italic' }}>知识文档不存在</p>
          </div>
        ) : isFocusMode ? (
          <KnowledgeFocusShell
            content={activeContent}
            onContentChange={handleContentChange}
            onExit={handleExitFocusMode}
            editorClassName="kd-immersive-editor"
            editorMaxWidth={1040}
            editorPadding="64px 40px 144px"
            editorMinHeight={380}
            minimizeIconSize={22}
            readOnly={!canUpdateKnowledge}
          >
            {(canUpdateKnowledge || immersiveLearningAction) && (
              <div className="kd-immersive-bottom">
                {immersiveLearningAction}
                {canUpdateKnowledge && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!canSubmit || isSaving}
                    className="kd-immersive-save-btn"
                  >
                    {isSaving ? '保存中…' : '保存'}
                  </button>
                )}
              </div>
            )}
          </KnowledgeFocusShell>
        ) : (
          <>
            {/* ── 左侧：点击进入编辑 / 查看内容 ── */}
            <div className="kd-left scrollbar-subtle">
              <div
                onClick={() => {
                  if (!editing && canUpdateKnowledge) {
                    setEditing(true);
                  }
                }}
                style={{ cursor: !editing && canUpdateKnowledge ? 'text' : 'default' }}
              >
                <SlashQuillEditor
                  value={activeContent}
                  onChange={handleContentChange}
                  placeholder="编辑内容…"
                  className={`kd-content kd-content-shell${editing ? ' kd-content-editable' : ''}`}
                  minHeight={300}
                  autoFocus={editing}
                  readOnly={!editing}
                />
              </div>
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
                  <h2 className="kd-title">{activeTitle || '未命名知识'}</h2>
                )}
                <p className="kd-time">{isDraftMode ? '未保存' : relTime(knowledge?.updated_at ?? new Date().toISOString())}</p>
              </div>

              {/* body */}
              <div className="kd-right-body">

                {/* ── 系统标签 ── */}
                {shouldShowSystemTagsSection && (
                  <div className="kd-section">
                    <p className="kd-label">系统标签</p>

                    {/* 点击展开标签输入 */}
                    {canUpdateKnowledge && showTagInput && (
                      <TagInput
                        selectedTags={activeTags}
                        onAdd={addTag}
                        onRemove={removeTag}
                        hideChips
                      />
                    )}

                    <div className="kd-tags">
                      {canUpdateKnowledge && (
                        <button
                          onClick={() => setShowTagInput((v) => !v)}
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
                )}

                {/* 元信息 */}
                <div className="kd-section">
                  <p className="kd-label">详细信息</p>
                  <div className="kd-meta-list">
                    {!isDraftMode && (knowledge?.updated_by_name || knowledge?.created_by_name) && (
                      <div className="kd-meta-item">
                        <User className="kd-meta-icon" />
                        <span>{knowledge?.updated_by_name || knowledge?.created_by_name}</span>
                      </div>
                    )}
                    {!isDraftMode && (
                      <div className="kd-meta-item">
                        <Calendar className="kd-meta-icon" />
                        <span>{dayjs(knowledge?.updated_at ?? new Date()).format('YYYY-MM-DD HH:mm')}</span>
                      </div>
                    )}
                    {!isDraftMode && (
                      <div className="kd-meta-item">
                        <Eye className="kd-meta-icon" />
                        <span>{knowledge?.view_count ?? 0} 次阅读</span>
                      </div>
                    )}
                  </div>
                </div>

                {(editing || activeRelatedLinks.length > 0) && (
                  <div className="kd-section">
                    <div className="kd-links-header">
                      <p className="kd-label">相关链接</p>
                      {canUpdateKnowledge && editing && (
                        <button
                          type="button"
                          onClick={handleAddRelatedLink}
                          className="kd-links-add-btn"
                          aria-label="添加相关链接"
                        >
                          <Plus style={{ width: 12, height: 12 }} />
                        </button>
                      )}
                    </div>

                    {editing && canUpdateKnowledge ? (
                      activeRelatedLinks.length > 0 ? (
                        <div className="kd-links-edit-list">
                          {activeRelatedLinks.map((link, index) => (
                            <div key={`detail-link-${index}`} className="kd-link-edit-row">
                              <input
                                value={link.title ?? ''}
                                onChange={(e) => handleRelatedLinkChange(index, 'title', e.target.value)}
                                placeholder=""
                                aria-label="链接标题"
                                className="kd-link-input kd-link-input-title"
                              />
                              <input
                                value={link.url}
                                onChange={(e) => handleRelatedLinkChange(index, 'url', e.target.value)}
                                placeholder=""
                                aria-label="链接地址"
                                className="kd-link-input kd-link-input-url"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveRelatedLink(index)}
                                className="kd-link-remove-btn"
                                aria-label="删除相关链接"
                              >
                                <X style={{ width: 12, height: 12 }} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null
                    ) : (
                      <div className="kd-links-list">
                        {activeRelatedLinks.map((link, index) => (
                          <a
                            key={`detail-link-view-${index}`}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="kd-related-link"
                          >
                            <LinkIcon className="kd-related-link-icon" />
                            <span className="kd-related-link-title">
                              {getRelatedLinkDisplayText(link)}
                            </span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {learningAction && (
                  <div className="kd-section">
                    {learningAction}
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
                  <div className="kd-edit-actions">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="kd-edit-icon-btn"
                      title="取消编辑"
                      aria-label="取消编辑"
                    >
                      <X style={{ width: 15, height: 15 }} strokeWidth={1.9} />
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={!canSubmit || isSaving}
                      className="kd-edit-icon-btn kd-edit-icon-btn-confirm"
                      title={isSaving ? '保存中…' : '保存'}
                      aria-label={isSaving ? '保存中' : '保存'}
                      style={{
                        opacity: !canSubmit || isSaving ? 0.5 : 1,
                        cursor: !canSubmit || isSaving ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <Check style={{ width: 15, height: 15 }} strokeWidth={1.9} />
                    </button>
                  </div>
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
                    {activeRelatedLinks[0]?.url && (
                      <button
                        onClick={() => {
                          const firstLinkUrl = activeRelatedLinks[0]?.url;
                          if (firstLinkUrl) {
                            window.open(firstLinkUrl, '_blank');
                          }
                        }}
                        className="kd-action-btn"
                        title="打开首个相关链接"
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
                    {canDeleteKnowledge && !isDraftMode && (
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
          height: 100dvh;
          border-radius: 0;
          padding: 0;
          gap: 0;
          background: transparent;
          box-shadow: none;
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
        .kd-links-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }
        .kd-links-header .kd-label {
          margin-bottom: 0;
        }
        .kd-links-add-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border: none;
          border-radius: 999px;
          background: transparent;
          color: #7a8698;
          padding: 0;
          font-size: 12px;
          cursor: pointer;
          font-family: inherit;
          transition: color 0.15s ease, background 0.15s ease;
        }
        .kd-links-add-btn:hover {
          background: rgba(255,255,255,0.32);
          color: #526277;
        }
        .kd-links-list,
        .kd-links-edit-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .kd-related-link {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          text-decoration: none;
          color: #777;
          transition: color 0.15s ease;
        }
        .kd-related-link:hover {
          color: #526277;
        }
        .kd-related-link-icon {
          width: 12px;
          height: 12px;
          color: #aaa;
          flex-shrink: 0;
        }
        .kd-related-link-title {
          min-width: 0;
          font-size: 12px;
          color: inherit;
          line-height: 1.45;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .kd-link-edit-row {
          display: grid;
          grid-template-columns: minmax(0, 108px) minmax(0, 1fr) 28px;
          gap: 10px;
          align-items: center;
        }
        .kd-link-input {
          width: 100%;
          min-width: 0;
          border: none;
          border-bottom: 1px solid rgba(95, 109, 132, 0.18);
          border-radius: 0;
          background: transparent;
          padding: 8px 2px 6px;
          font-size: 12px;
          color: #48576a;
          outline: none;
          font-family: inherit;
          transition: border-color 0.15s ease, color 0.15s ease;
        }
        .kd-link-input::placeholder {
          color: transparent;
        }
        .kd-link-input:focus {
          border-bottom-color: rgba(86, 109, 145, 0.42);
          color: #334155;
        }
        .kd-link-input-title {
          max-width: 108px;
        }
        .kd-link-remove-btn {
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 999px;
          background: transparent;
          color: #7a8698;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
          transition: color 0.15s ease, background 0.15s ease;
        }
        .kd-link-remove-btn:hover {
          background: rgba(255,255,255,0.32);
          color: #526277;
        }
        .kd-links-empty,
        .kd-links-empty-text {
          border-radius: 14px;
          background: rgba(255,255,255,0.54);
          color: #8a93a0;
          font-size: 12px;
        }
        .kd-links-empty {
          width: 100%;
          border: 1px dashed rgba(126, 141, 161, 0.24);
          padding: 14px 12px;
          cursor: pointer;
          font-family: inherit;
        }
        .kd-links-empty-text {
          padding: 12px;
        }

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

        .kd-immersive-bottom {
          position: absolute;
          right: 0;
          bottom: 0;
          left: 0;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          padding: 20px 26px 26px;
          pointer-events: none;
        }
        .kd-complete-done-immersive {
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          background: rgba(224, 245, 224, 0.92);
          backdrop-filter: blur(8px);
          pointer-events: auto;
        }
        .kd-complete-btn-immersive {
          width: auto;
          border-radius: 24px;
          padding: 10px 20px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          backdrop-filter: blur(8px);
          background: rgba(232, 121, 58, 0.92);
          pointer-events: auto;
        }
        .kd-immersive-save-btn {
          pointer-events: auto;
          margin-left: auto;
          border: none;
          border-radius: 24px;
          padding: 10px 28px;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.04em;
          cursor: pointer;
          font-family: inherit;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(8px);
          color: #555;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          transition: all 0.18s ease;
        }
        .kd-immersive-save-btn:hover {
          background: #fff;
          color: #333;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .kd-immersive-save-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

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
        .kd-edit-actions {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .kd-edit-icon-btn {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 50%;
          background: #fff;
          color: #9aa3af;
          cursor: pointer;
          font-family: inherit;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: color 0.15s ease, background 0.15s ease, opacity 0.15s ease;
        }
        .kd-edit-icon-btn:hover {
          background: #fff;
          color: #7f8998;
        }
        .kd-edit-icon-btn:disabled {
          cursor: not-allowed;
        }
        .kd-edit-icon-btn-confirm {
        }
        /* Content typography */
        .kd-content {
          font-family: var(--theme-font-sans);
          flex: 1; min-height: 100%;
          width: 100%;
          max-width: 860px;
          margin: 0 auto;
        }
        .kd-content-shell .ql-container {
          font-family: inherit;
          height: auto;
          overflow: visible;
        }
        .kd-content-shell .ql-editor {
          min-height: 300px;
          height: auto;
          padding: 0;
          font-family: inherit;
          font-size: 16px;
          line-height: 1.85;
          color: #333;
          overflow-y: visible;
        }
        .kd-content-shell .ql-editor[contenteditable='false'] {
          cursor: inherit;
        }
        .kd-content-shell .ql-editor.ql-blank::before {
          left: 0;
          right: 0;
          font-style: normal;
          color: #9aa0aa;
          font-size: 14px;
        }
        .kd-content-shell .ql-editor > *:last-child {
          margin-bottom: 0;
        }
        .kd-content-shell .ql-editor h1 {
          font-size: 32px; font-weight: 600; color: #111;
          margin: 0 0 28px; text-align: center;
          letter-spacing: -0.02em; line-height: 1.2;
        }
        .kd-content-shell .ql-editor h2 {
          font-size: 24px; font-weight: 600; color: #111;
          margin: 32px 0 14px; letter-spacing: -0.02em; line-height: 1.3;
        }
        .kd-content-shell .ql-editor h3 {
          font-size: 17px; font-weight: 600; color: #222;
          margin: 28px 0 10px;
        }
        .kd-content-shell .ql-editor p {
          font-size: 16px; line-height: 1.85; color: #333;
          margin: 0 0 18px;
        }
        .kd-content-shell .ql-editor ul, .kd-content-shell .ql-editor ol { padding-left: 24px; margin: 10px 0 18px; }
        .kd-content-shell .ql-editor li { font-size: 15px; line-height: 1.8; color: #444; margin-bottom: 7px; }
        .kd-content-shell .ql-editor strong { font-weight: 700; color: #111; }
        .kd-content-shell .ql-editor em { font-style: italic; }
        .kd-content-shell .ql-editor code {
          background: #f4f4f2; padding: 2px 6px; border-radius: 6px;
          font-size: 0.87em; font-family: 'SF Mono', monospace; color: #555;
        }
        .kd-content-shell .ql-editor .ql-code-block-container {
          background: #f4f4f2;
          border-radius: 6px;
          color: #1f2937;
          padding: 18px 22px;
          font-size: 13px;
          margin: 16px 0;
          overflow-x: auto;
          font-family: monospace;
          line-height: 1.6;
        }
        .kd-content-shell .ql-editor pre {
          background: #f4f4f2;
          border-radius: 6px;
          color: #1f2937;
          padding: 18px 22px;
          font-size: 13px;
          margin: 16px 0;
          overflow-x: auto;
          font-family: monospace;
          line-height: 1.6;
        }
        .kd-content-shell .ql-editor blockquote {
          border-left: 3px solid #e0e0e0; padding-left: 20px;
          color: #777; margin: 18px 0; font-style: italic; font-size: 18px;
        }
        .kd-content-shell .ql-editor hr {
          border: none;
          border-top: 1px solid #d9dde3;
          margin: 20px 0;
        }
        .kd-content-shell .ql-editor img { max-width: 100%; border-radius: 6px; margin: 16px 0; }
        .kd-content-shell .ql-editor table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
        .kd-content-shell .ql-editor th, .kd-content-shell .ql-editor td { text-align: left; padding: 10px 14px; border-bottom: 1px solid #eee; }
        .kd-content-shell .ql-editor th { font-weight: 600; color: #333; background: #fafafa; }

        .kd-content-editable {
          min-height: 300px;
          position: relative;
        }
        .kd-content-editable .ql-editor {
          cursor: text;
        }

        @keyframes kdFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes kdPopIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes kdOrbSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
};
