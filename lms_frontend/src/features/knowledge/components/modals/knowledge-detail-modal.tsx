import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal, flushSync } from 'react-dom';
import {
  Eye,
  Calendar,
  User,
  Edit,
  Trash2,
  Check,
  CheckCircle,
  Link as LinkIcon,
  X,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';

import { Skeleton } from '@/components/ui/skeleton';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { useTags } from '@/features/tags/api/tags';
import { TagAssignmentSection } from '@/features/tags/components/tag-assignment-section';
import { useKnowledgeDetail } from '../../api/knowledge';
import { useUpdateKnowledge } from '../../api/manage-knowledge';
import { useKnowledgeModalInteractions } from '../../hooks/use-knowledge-modal-interactions';
import { useCompleteLearning } from '@/features/tasks/api/complete-learning';
import { useStudentLearningTaskDetail } from '@/features/tasks/api/get-task-detail';
import { useAuth } from '@/features/auth/stores/auth-context';
import type { KnowledgeDetail as KnowledgeDetailType, KnowledgeUpdateRequest } from '@/types/knowledge';
import type { SimpleTag } from '@/types/common';
import type { RelatedLink } from '@/types/knowledge';
import { FocusOrbIcon } from '../shared/focus-icon';
import { SlashQuillEditor } from '../editor/rich-text-editor';
import { KnowledgeFocusShell } from './knowledge-focus-shell';
import { KnowledgeFocusMetadataBar } from './knowledge-focus-metadata-bar';
import { getKnowledgeTitleFromHtml } from '../../utils/content-utils';
import { showApiError } from '@/utils/error-handler';
import {
  createEmptyRelatedLink,
  getRelatedLinkDisplayText,
  sanitizeRelatedLinks,
} from '../../utils/related-links';
import dayjs from '@/lib/dayjs';

function relTime(dateStr: string): string {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d === 0) return '今天';
  if (d === 1) return '昨天';
  if (d < 30) return `${d} 天前`;
  return `${Math.floor(d / 30)} 个月前`;
}

function placeCaretAtPoint(container: HTMLElement, clientX: number, clientY: number) {
  const selection = window.getSelection();
  if (!selection) return;

  const docWithCaret = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };

  if (docWithCaret.caretPositionFromPoint) {
    const position = docWithCaret.caretPositionFromPoint(clientX, clientY);
    if (position && container.contains(position.offsetNode)) {
      const range = document.createRange();
      range.setStart(position.offsetNode, position.offset);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
  }

  if (docWithCaret.caretRangeFromPoint) {
    const range = docWithCaret.caretRangeFromPoint(clientX, clientY);
    if (range && container.contains(range.startContainer)) {
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
  }

  const fallbackRange = document.createRange();
  fallbackRange.selectNodeContents(container);
  fallbackRange.collapse(false);
  selection.removeAllRanges();
  selection.addRange(fallbackRange);
}

function hasSameTagIds(left: { id: number }[], right: { id: number }[]) {
  return left.length === right.length && left.every((tag, index) => tag.id === right[index]?.id);
}

function hasSameRelatedLinks(left: RelatedLink[], right: RelatedLink[]) {
  const normalizedLeft = sanitizeRelatedLinks(left);
  const normalizedRight = sanitizeRelatedLinks(right);

  return (
    normalizedLeft.length === normalizedRight.length
    && normalizedLeft.every((link, index) => (
      link.url === normalizedRight[index]?.url
      && (link.title ?? '') === (normalizedRight[index]?.title ?? '')
    ))
  );
}

function getRelatedLinksDraftError(relatedLinks: RelatedLink[]) {
  for (const link of relatedLinks) {
    const title = link.title?.trim() ?? '';
    const url = link.url.trim();

    if (!title && !url) {
      continue;
    }

    if (!url) {
      return '请填写链接地址';
    }

    try {
      new URL(url);
    } catch {
      return '链接地址格式不正确';
    }
  }

  return null;
}

interface KnowledgeDetailModalProps {
  knowledgeId: number;
  startEditing?: boolean;
  startInFocus?: boolean;
  closeOnExitFocus?: boolean;
  forceFocus?: boolean;
  taskId?: number;
  taskKnowledgeId?: number;
  onClose: () => void;
  onFocusOpen?: (id: number) => void;
  onDelete?: (id: number) => void;
  onUpdated?: () => void;
}

export const KnowledgeDetailModal: React.FC<KnowledgeDetailModalProps> = ({
  knowledgeId,
  startEditing = false,
  startInFocus = false,
  closeOnExitFocus = false,
  forceFocus = false,
  taskId,
  taskKnowledgeId,
  onClose,
  onFocusOpen,
  onDelete,
  onUpdated,
}) => {
  const { currentRole, hasCapability } = useAuth();
  const isStudent = currentRole === 'STUDENT';
  const canUpdateKnowledge = hasCapability('knowledge.update');
  const canDeleteKnowledge = hasCapability('knowledge.delete');

  const { data, isLoading } = useKnowledgeDetail({
    knowledgeId,
    taskKnowledgeId,
  });
  const updateKnowledge = useUpdateKnowledge();
  const completeLearning = useCompleteLearning();
  const knowledgeFromQuery = data as KnowledgeDetailType | undefined;
  const [localKnowledgeSnapshot, setLocalKnowledgeSnapshot] = useState<{
    knowledgeId: number;
    detail: KnowledgeDetailType;
  } | undefined>(undefined);
  const { data: learningDetail } = useStudentLearningTaskDetail(taskId || 0, {
    enabled: isStudent && !!taskId,
  });
  const hasLocalSnapshot = Boolean(localKnowledgeSnapshot && localKnowledgeSnapshot.knowledgeId === knowledgeId);
  const fetchedKnowledge = hasLocalSnapshot
    ? localKnowledgeSnapshot!.detail
    : knowledgeFromQuery;
  const knowledge = fetchedKnowledge;

  // space列表
  const { data: spaces = [] } = useTags({ tag_type: 'SPACE' });

  // 编辑状态
  const [editing, setEditing] = useState(startEditing);
  const [editContent, setEditContent] = useState<string | undefined>(undefined);
  const [editTitle, setEditTitle] = useState<string | undefined>(undefined);
  const [editTags, setEditTags] = useState<SimpleTag[] | undefined>(undefined);
  const [editSpaceTagId, setEditSpaceTagId] = useState<number | undefined | null>(undefined);
  const [editRelatedLinks, setEditRelatedLinks] = useState<RelatedLink[] | undefined>(undefined);
  const knowledgeContentShellRef = useRef<HTMLDivElement | null>(null);
  const relatedLinksSectionRef = useRef<HTMLDivElement | null>(null);
  const [editingLinks, setEditingLinks] = useState(false);

  // 标签输入展开
  const [showTagInput, setShowTagInput] = useState(false);
  // space选择
  const [showSpaceTags, setShowSpaceTags] = useState(false);
  const [showFocusTagPanel, setShowFocusTagPanel] = useState(false);
  const [showFocusRelatedLinksPanel, setShowFocusRelatedLinksPanel] = useState(false);
  // 专注模式（全屏查看）
  const [isFocusMode, setIsFocusMode] = useState(forceFocus || startInFocus);
  const canEditInFocus = isFocusMode && canUpdateKnowledge;
  const isSaving = updateKnowledge.isPending;

  const activeContent = editContent ?? knowledge?.content ?? '';

  // 实际使用的值
  const activeTitle = editTitle ?? knowledge?.title ?? '';
  const activeTags = editTags ?? knowledge?.tags ?? [];
  const shouldShowSystemTagsSection = !isStudent || activeTags.length > 0;
  const activeSpaceTagId = editSpaceTagId === undefined
    ? knowledge?.space_tag?.id ?? null
    : editSpaceTagId;
  const activeRelatedLinks = editRelatedLinks ?? knowledge?.related_links ?? [];
  const taskKnowledgeItem = useMemo(() => {
    if (!learningDetail) return undefined;
    return learningDetail.knowledge_items.find((item) => (
      taskKnowledgeId ? item.id === taskKnowledgeId : item.knowledge_id === knowledgeId
    ));
  }, [learningDetail, taskKnowledgeId, knowledgeId]);
  const isCompleted = taskKnowledgeItem?.is_completed;

  // 判断是否有改动
  const hasChanges = Boolean(knowledge && (
    (editContent !== undefined && editContent !== knowledge.content) ||
    (editTitle !== undefined && editTitle !== knowledge.title) ||
    (editTags !== undefined) ||
    (editSpaceTagId !== undefined) ||
    (editRelatedLinks !== undefined)
  ));
  const hasContentChanges = Boolean(knowledge && editContent !== undefined && editContent !== knowledge.content);
  const canSubmit = Boolean(hasContentChanges);
  const canSubmitFocus = Boolean(hasChanges);

  const applyKnowledgeSnapshot = useCallback((updatedKnowledge: KnowledgeDetailType) => {
    setLocalKnowledgeSnapshot({
      knowledgeId,
      detail: updatedKnowledge,
    });
  }, [knowledgeId]);

  const commitPatch = useCallback(async (
    data: KnowledgeUpdateRequest,
    errorMessage: string,
    onSuccess?: () => void,
  ) => {
    try {
      const updatedKnowledge = await updateKnowledge.mutateAsync({
        id: knowledgeId,
        data,
      });
      applyKnowledgeSnapshot(updatedKnowledge);
      onSuccess?.();
      onUpdated?.();
      return updatedKnowledge;
    } catch (error) {
      showApiError(error, errorMessage);
      return null;
    }
  }, [applyKnowledgeSnapshot, knowledgeId, onUpdated, updateKnowledge]);

  // 标签操作
  const addTag = useCallback((tag: { id: number; name: string }) => {
    const current = editTags ?? knowledge?.tags ?? [];
    if (current.some(t => t.id === tag.id)) return;
    const nextTags = [...current, tag];
    setEditTags(nextTags);
    if (isFocusMode) {
      return;
    }
    void commitPatch(
      { tag_ids: nextTags.map((item) => item.id) },
      '标签保存失败',
      () => {
        setEditTags((currentTags) => (
          currentTags && hasSameTagIds(currentTags, nextTags) ? undefined : currentTags
        ));
      },
    );
  }, [commitPatch, editTags, isFocusMode, knowledge?.tags]);

  const removeTag = useCallback((tagId: number) => {
    const current = editTags ?? knowledge?.tags ?? [];
    const nextTags = current.filter(t => t.id !== tagId);
    setEditTags(nextTags);
    if (isFocusMode) {
      return;
    }
    void commitPatch(
      { tag_ids: nextTags.map((item) => item.id) },
      '标签保存失败',
      () => {
        setEditTags((currentTags) => (
          currentTags && hasSameTagIds(currentTags, nextTags) ? undefined : currentTags
        ));
      },
    );
  }, [commitPatch, editTags, isFocusMode, knowledge?.tags]);

  const handleFocusRelatedLinkChange = useCallback((
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

  const handleFocusAddRelatedLink = useCallback(() => {
    const current = editRelatedLinks ?? knowledge?.related_links ?? [];
    setEditRelatedLinks([...current, createEmptyRelatedLink()]);
  }, [editRelatedLinks, knowledge?.related_links]);

  const handleFocusRemoveRelatedLink = useCallback((index: number) => {
    const current = editRelatedLinks ?? knowledge?.related_links ?? [];
    setEditRelatedLinks(current.filter((_, itemIndex) => itemIndex !== index));
  }, [editRelatedLinks, knowledge?.related_links]);

  const handleFocusSpaceTagChange = useCallback((nextSpaceTagId?: number) => {
    setEditSpaceTagId(nextSpaceTagId ?? null);
  }, []);

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
    const nextLinks = current.filter((_, itemIndex) => itemIndex !== index);
    setEditRelatedLinks(nextLinks);
    void commitPatch(
      { related_links: sanitizeRelatedLinks(nextLinks) },
      '相关链接保存失败',
      () => {
        setEditRelatedLinks((currentLinks) => (
          currentLinks && hasSameRelatedLinks(currentLinks, nextLinks) ? undefined : currentLinks
        ));
      },
    );
  }, [commitPatch, editRelatedLinks, knowledge?.related_links]);

  const handleExitFocusMode = useCallback(() => {
    setShowFocusTagPanel(false);
    setShowFocusRelatedLinksPanel(false);
    if (closeOnExitFocus || forceFocus) {
      onClose();
      return;
    }
    setIsFocusMode(false);
  }, [closeOnExitFocus, forceFocus, onClose]);

  useKnowledgeModalInteractions({
    onEscape: () => {
      if (isFocusMode && showFocusRelatedLinksPanel) {
        setShowFocusRelatedLinksPanel(false);
      } else if (isFocusMode && showFocusTagPanel) {
        setShowFocusTagPanel(false);
      } else if (isFocusMode) {
        handleExitFocusMode();
      } else if (showSpaceTags) {
        setShowSpaceTags(false);
      } else if (editing) {
        setEditing(false);
      } else {
        onClose();
      }
    },
  });

  const handleTitleBlur = useCallback(() => {
    if (!knowledge || editTitle === undefined || editTitle === knowledge.title) {
      return;
    }

    const nextTitle = editTitle;
    void commitPatch(
      { title: nextTitle },
      '标题保存失败',
      () => {
        setEditTitle((currentTitle) => (
          currentTitle === nextTitle ? undefined : currentTitle
        ));
      },
    );
  }, [commitPatch, editTitle, knowledge]);

  const handleOpenRelatedLinksEditor = useCallback((appendEmpty = false) => {
    setEditingLinks(true);
    if (!appendEmpty) {
      return;
    }

    setEditRelatedLinks((currentLinks) => [
      ...(currentLinks ?? knowledge?.related_links ?? []),
      createEmptyRelatedLink(),
    ]);
  }, [knowledge?.related_links]);

  const handleRelatedLinksBlur = useCallback(() => {
    if (!knowledge) {
      setEditingLinks(false);
      return;
    }

    if (editRelatedLinks === undefined) {
      setEditingLinks(false);
      return;
    }

    const nextLinks = editRelatedLinks;
    const draftError = getRelatedLinksDraftError(nextLinks);
    if (draftError) {
      toast.error(draftError);
      return;
    }

    if (hasSameRelatedLinks(nextLinks, knowledge.related_links ?? [])) {
      setEditRelatedLinks(undefined);
      setEditingLinks(false);
      return;
    }

    setEditingLinks(false);
    void commitPatch(
      { related_links: sanitizeRelatedLinks(nextLinks) },
      '相关链接保存失败',
      () => {
        setEditRelatedLinks(undefined);
      },
    );
  }, [commitPatch, editRelatedLinks, knowledge]);

  useEffect(() => {
    if (!editingLinks) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && relatedLinksSectionRef.current?.contains(target)) {
        return;
      }
      handleRelatedLinksBlur();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [editingLinks, handleRelatedLinksBlur]);

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;
    if (!knowledge) return;
    const draftError = editRelatedLinks ? getRelatedLinksDraftError(editRelatedLinks) : null;
    if (draftError) {
      toast.error(draftError);
      return;
    }
    try {
      const updateDerivedTitle = editContent !== undefined ? getKnowledgeTitleFromHtml(editContent) : '';
      const updateTitle = editContent !== undefined
        ? (updateDerivedTitle || editTitle || knowledge.title)
        : (editTitle ?? knowledge.title);
      const detailRelatedLinks = sanitizeRelatedLinks(editRelatedLinks ?? []);
      const updatedKnowledge = await updateKnowledge.mutateAsync({
        id: knowledgeId,
        data: {
          title: updateTitle,
          ...(editContent !== undefined && { content: editContent }),
          ...(editTags !== undefined && { tag_ids: editTags.map(t => t.id) }),
          ...(editSpaceTagId !== undefined && { space_tag_id: editSpaceTagId ?? undefined }),
          ...(editRelatedLinks !== undefined && { related_links: detailRelatedLinks }),
        },
      });
      applyKnowledgeSnapshot(updatedKnowledge);
      toast.success('已保存');
      if (!canEditInFocus) {
        setEditing(false);
      }
      setEditContent(undefined);
      setEditTitle(undefined);
      setEditTags(undefined);
      setEditSpaceTagId(undefined);
      setEditRelatedLinks(undefined);
      setShowFocusTagPanel(false);
      setShowFocusRelatedLinksPanel(false);
      onUpdated?.();
    } catch (error) {
      showApiError(error, '保存失败');
    }
  }, [knowledge, hasChanges, onUpdated, editContent, editSpaceTagId, editRelatedLinks, editTags, editTitle, canEditInFocus, knowledgeId, updateKnowledge, applyKnowledgeSnapshot]);

  const handleContentChange = useCallback((nextContent: string) => {
    setEditContent(nextContent);

    const derivedTitle = getKnowledgeTitleFromHtml(nextContent);
    if (derivedTitle) {
      setEditTitle(derivedTitle);
    }
  }, []);

  const handleContentBlur = useCallback(() => {
    if (hasChanges) {
      void handleSave();
      return;
    }

    setEditing(false);
  }, [handleSave, hasChanges]);

  const handleDelete = () => {
    onDelete?.(knowledgeId);
    onClose();
  };

  const handleCancelEdit = useCallback(() => {
    setEditing(false);
    setEditContent(undefined);
    setEditTitle(undefined);
    setEditTags(undefined);
    setEditSpaceTagId(undefined);
    setEditRelatedLinks(undefined);
    setEditingLinks(false);
    setShowTagInput(false);
    setShowSpaceTags(false);
    setShowFocusTagPanel(false);
    setShowFocusRelatedLinksPanel(false);
  }, []);

  const handleSpaceTagSelect = useCallback(async (nextSpaceTagId: number) => {
    setShowSpaceTags(false);

    if (activeSpaceTagId === nextSpaceTagId) {
      return;
    }

    try {
      const updatedKnowledge = await updateKnowledge.mutateAsync({
        id: knowledgeId,
        data: { space_tag_id: nextSpaceTagId },
      });
      applyKnowledgeSnapshot(updatedKnowledge);
      setEditSpaceTagId(undefined);
      toast.success('空间已更新');
      onUpdated?.();
    } catch (error) {
      showApiError(error, '空间更新失败');
    }
  }, [activeSpaceTagId, applyKnowledgeSnapshot, knowledgeId, onUpdated, updateKnowledge]);

  const handleComplete = useCallback(async () => {
    if (!taskId || !taskKnowledgeId) return;
    try {
      await completeLearning.mutateAsync({ taskId, taskKnowledgeId });
      toast.success('已标记为完成');
      onUpdated?.();
    } catch (error) {
      showApiError(error, '操作失败，请稍后重试');
    }
  }, [taskId, taskKnowledgeId, completeLearning, onUpdated]);

  const renderLearningAction = ({ immersive = false, docked = false }: { immersive?: boolean; docked?: boolean } = {}) => {
    if (!isStudent || !taskId || !taskKnowledgeId) {
      return null;
    }

    if (isCompleted) {
      return (
        <div className={immersive ? 'kd-immersive-save-btn kd-immersive-learning-state' : `kd-complete-done${docked ? ' kd-complete-done-docked' : ''}`}>
          <CheckCircle style={{ width: 14, height: 14 }} />
          已学习
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={handleComplete}
        disabled={completeLearning.isPending}
        className={immersive ? 'kd-immersive-save-btn' : `kd-complete-btn${docked ? ' kd-complete-btn-docked' : ''}`}
      >
        {completeLearning.isPending ? '处理中…' : '标记已学习'}
      </button>
    );
  };

  const learningAction = renderLearningAction({ docked: true });
  const immersiveLearningAction = renderLearningAction({ immersive: true });

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
              if (onFocusOpen) {
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
            {canUpdateKnowledge ? (
              <KnowledgeFocusMetadataBar
                spaces={spaces}
                spaceTagId={activeSpaceTagId}
                onSpaceTagChange={handleFocusSpaceTagChange}
                selectedTags={activeTags}
                onAddTag={addTag}
                onRemoveTag={removeTag}
                title={activeTitle}
                onTitleChange={(value) => setEditTitle(value)}
                relatedLinks={activeRelatedLinks}
                onRelatedLinkChange={handleFocusRelatedLinkChange}
                onAddRelatedLink={handleFocusAddRelatedLink}
                onRemoveRelatedLink={handleFocusRemoveRelatedLink}
                showTagPanel={showFocusTagPanel}
                onShowTagPanelChange={setShowFocusTagPanel}
                showRelatedLinksPanel={showFocusRelatedLinksPanel}
                onShowRelatedLinksPanelChange={setShowFocusRelatedLinksPanel}
                onSave={handleSave}
                saveDisabled={!canSubmitFocus}
                isSaving={isSaving}
                trailingActions={immersiveLearningAction}
              />
            ) : immersiveLearningAction ? (
              <div className="kd-immersive-bottom">
                {immersiveLearningAction}
              </div>
            ) : null}
          </KnowledgeFocusShell>
        ) : (
          <>
            {/* ── 左侧：点击进入编辑 / 查看内容 ── */}
            <ScrollContainer className="kd-left">
              <div
                ref={(node) => {
                  knowledgeContentShellRef.current = node;
                }}
                onMouseDownCapture={() => {
                  if (!editing && canUpdateKnowledge) {
                    const event = window.event as MouseEvent | undefined;
                    const point = event ? { x: event.clientX, y: event.clientY } : null;
                    flushSync(() => {
                      setEditing(true);
                    });
                    window.requestAnimationFrame(() => {
                      const editorRoot = knowledgeContentShellRef.current?.querySelector('.ql-editor') as HTMLElement | null;
                      if (!editorRoot) return;
                      editorRoot.focus();
                      if (point) {
                        placeCaretAtPoint(editorRoot, point.x, point.y);
                      }
                    });
                  }
                }}
                style={{ cursor: !editing && canUpdateKnowledge ? 'text' : 'default' }}
              >
                <SlashQuillEditor
                  key={editing ? 'editable' : 'readonly'}
                  value={activeContent}
                  onChange={handleContentChange}
                  onBlur={handleContentBlur}
                  placeholder="键入 / 调出快捷指令"
                  className={`kd-content kd-content-shell${editing ? ' kd-content-editable' : ''}`}
                  minHeight={300}
                  autoFocus={false}
                  readOnly={!editing}
                />
              </div>
            </ScrollContainer>

            {/* ── 右侧 meta 面板 ── */}
            <div className="kd-right">
              {/* 顶部渐变 header — 标题可编辑 */}
              <div className="kd-right-header">
                {canUpdateKnowledge ? (
                  <input
                    value={activeTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }
                    }}
                    placeholder="Title goes here"
                    className="kd-title-input"
                  />
                ) : (
                  <h2 className="kd-title">{activeTitle || '未命名知识'}</h2>
                )}
                <p className="kd-time">{relTime(knowledge?.updated_at ?? new Date().toISOString())}</p>
              </div>

              {/* body */}
              <ScrollContainer className="kd-right-body">

                {/* ── 系统标签 ── */}
                {shouldShowSystemTagsSection && (
                  <div className="kd-section">
                    <TagAssignmentSection
                      applicableTo="knowledge"
                      title="系统标签"
                      canEdit={canUpdateKnowledge}
                      selectedTags={activeTags}
                      expanded={showTagInput}
                      onExpandedChange={setShowTagInput}
                      onAdd={addTag}
                      onRemove={removeTag}
                      labelClassName="kd-label"
                      addButtonClassName="kd-add-tag-btn"
                      tagsWrapClassName="kd-tags"
                      tagClassName="kd-tag"
                      removeButtonClassName="kd-tag-remove"
                    />
                  </div>
                )}

                {/* 元信息 */}
                <div className="kd-section">
                  <p className="kd-label">详细信息</p>
                  <div className="kd-meta-list">
                    {(knowledge?.updated_by_name || knowledge?.created_by_name) && (
                      <div className="kd-meta-item">
                        <User className="kd-meta-icon" />
                        <span>{knowledge?.updated_by_name || knowledge?.created_by_name}</span>
                      </div>
                    )}
                    <div className="kd-meta-item">
                      <Calendar className="kd-meta-icon" />
                      <span>{dayjs(knowledge?.updated_at ?? new Date()).format('YYYY-MM-DD HH:mm')}</span>
                    </div>
                    <div className="kd-meta-item">
                      <Eye className="kd-meta-icon" />
                      <span>{knowledge?.view_count ?? 0} 次阅读</span>
                    </div>
                  </div>
                </div>

                {(canUpdateKnowledge || activeRelatedLinks.length > 0) && (
                  <div className="kd-section" ref={relatedLinksSectionRef}>
                    <div className="kd-links-header">
                      <p className="kd-label">相关链接</p>
                      {canUpdateKnowledge && (
                        <button
                          type="button"
                          onClick={() => {
                            if (editingLinks) {
                              handleAddRelatedLink();
                              return;
                            }

                            handleOpenRelatedLinksEditor(activeRelatedLinks.length === 0);
                          }}
                          className="kd-links-add-btn"
                          aria-label="添加相关链接"
                        >
                          <Plus style={{ width: 12, height: 12 }} />
                        </button>
                      )}
                    </div>

                    {canUpdateKnowledge && editingLinks ? (
                      activeRelatedLinks.length > 0 ? (
                        <div className="kd-links-edit-list">
                          <div className="kd-link-edit-head">
                            <span className="kd-link-edit-head-label">名称</span>
                            <span className="kd-link-edit-head-label">链接</span>
                            <span />
                          </div>
                          {activeRelatedLinks.map((link, index) => (
                            <div key={`detail-link-${index}`} className="kd-link-edit-row">
                              <input
                                value={link.title ?? ''}
                                onChange={(e) => handleRelatedLinkChange(index, 'title', e.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    handleRelatedLinksBlur();
                                  }
                                }}
                                placeholder="链接名称"
                                aria-label="链接标题"
                                className="kd-link-input kd-link-input-title"
                              />
                              <input
                                value={link.url}
                                onChange={(e) => handleRelatedLinkChange(index, 'url', e.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    handleRelatedLinksBlur();
                                  }
                                }}
                                placeholder="https://example.com"
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
                      ) : (
                        <button
                          type="button"
                          className="kd-links-empty"
                          onClick={handleAddRelatedLink}
                        >
                          添加相关链接
                        </button>
                      )
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
                        {canUpdateKnowledge && activeRelatedLinks.length === 0 && (
                          <button
                            type="button"
                            className="kd-links-empty"
                            onClick={() => handleOpenRelatedLinksEditor(true)}
                          >
                            添加相关链接
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ flex: 1 }} />
              </ScrollContainer>

              {/* 底部操作 */}
              <div className="kd-bottom" style={{ position: 'relative' }}>
                {/* space选择弹窗 */}
                {showSpaceTags && (
                  <div className="kd-linetype-popover">
                    {spaces.map(lt => (
                      <button
                        key={lt.id}
                        onClick={() => { void handleSpaceTagSelect(lt.id); }}
                        disabled={isSaving}
                        className="kd-linetype-item"
                        style={{ background: activeSpaceTagId === lt.id ? '#f0f4ff' : 'none' }}
                      >
                        <span
                          className="kd-linetype-dot"
                          style={{
                            borderColor: activeSpaceTagId === lt.id ? '#e8793a' : '#ccc',
                          }}
                        >
                          {activeSpaceTagId === lt.id && (
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#e8793a' }} />
                          )}
                        </span>
                        {lt.name}
                      </button>
                    ))}
                  </div>
                )}

                {canUpdateKnowledge && (editing || hasContentChanges) ? (
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
                ) : learningAction ? (
                  <div className="kd-bottom-learning">
                    {learningAction}
                  </div>
                ) : (
                  <div className="kd-action-group">
                    {canUpdateKnowledge && (
                      <button
                        onClick={() => setShowSpaceTags(!showSpaceTags)}
                        className="kd-action-btn"
                        title="切换 space"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <circle cx="12" cy="12" r="9" />
                          </svg>
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
          font-size: 16px; font-weight: 400; color: #6a7a8a;
          margin: 0; line-height: 1.3; letter-spacing: -0.01em;
        }
        .kd-title-input {
          width: 100%; border: none; background: none; outline: none;
          font-size: 16px; font-weight: 400; color: #6a7a8a;
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
        .kd-link-edit-head {
          display: grid;
          grid-template-columns: minmax(0, 108px) minmax(0, 1fr) 28px;
          gap: 10px;
          align-items: end;
        }
        .kd-link-edit-head-label {
          font-size: 10px;
          line-height: 1;
          color: #99a3af;
          letter-spacing: 0.08em;
          text-transform: uppercase;
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
        .kd-tags { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
        .kd-tag {
          display: inline-flex; align-items: center; gap: 5px;
          background: #e0e3e8; border-radius: 100px;
          padding: 4px 11px; font-size: 12px; color: #555;
        }
        .kd-tag-remove {
          background: none; border: none; cursor: pointer;
          color: #aaa; display: flex; padding: 0;
          transition: color 0.15s;
        }
        .kd-tag-remove:hover { color: #666; }
        .kd-add-tag-btn {
          background: #e8793a; border: none; border-radius: 100px;
          padding: 5px 14px; font-size: 12px; color: #fff;
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
        .kd-complete-done-docked {
          min-width: 108px;
          justify-content: center;
        }
        .kd-complete-btn {
          width: 100%; border: none; border-radius: 6px;
          padding: 10px 12px; font-size: 13px; font-weight: 600;
          color: #fff; background: #e8793a; cursor: pointer;
          font-family: inherit; transition: opacity 0.15s;
        }
        .kd-complete-btn-docked {
          width: min(100%, 156px);
        }
        .kd-complete-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Space popover */
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
        .kd-immersive-learning-state {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #2d8a2d;
          cursor: default;
        }

        /* Bottom */
        .kd-bottom {
          padding: 14px 20px 16px;
          display: flex; align-items: center; justify-content: center;
        }
        .kd-bottom-learning {
          width: 100%;
          display: flex;
          justify-content: center;
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
