import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Upload } from 'lucide-react';
import {
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Skeleton } from '@/components/ui/skeleton';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { useTags } from '@/entities/tag/api/tags';
import { useKnowledgeDetail } from '../../api/knowledge';
import { useCreateKnowledge, useUpdateKnowledge } from '../../api/manage-knowledge';
import { useParseDocument } from '../../api/parse-document';
import { useKnowledgeModalInteractions } from '../../hooks/use-knowledge-modal-interactions';
import { useCompleteLearning } from '@/entities/task/api/complete-learning';
import { useStudentLearningTaskDetail } from '@/entities/task/api/get-task-detail';
import { useAuth } from '@/session/auth/auth-context';
import type { KnowledgeDetail as KnowledgeDetailType, KnowledgeUpdateRequest } from '@/types/knowledge';
import type { SimpleTag } from '@/types/common';
import type { RelatedLink } from '@/types/knowledge';
import { FocusOrbIcon } from '../shared/focus-icon';
import { KnowledgeActionButton } from '../shared/knowledge-action-button';
import { SlashQuillEditor } from '../editor/rich-text-editor';
import { KnowledgeDetailSidePanel } from './knowledge-detail-side-panel';
import { KnowledgeFocusShell } from './knowledge-focus-shell';
import { KnowledgeFocusMetadataBar } from './knowledge-focus-metadata-bar';
import { getKnowledgeTitleFromHtml } from '../../utils/content-utils';
import { showApiError } from '@/utils/error-handler';
import {
  createEmptyRelatedLink,
  sanitizeRelatedLinks,
} from '../../utils/related-links';
import {
  hasMeaningfulKnowledgeHtml,
  textToKnowledgeHtml,
} from '../../utils/slash-shortcuts';
import './knowledge-detail-modal.css';

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
  knowledgeId?: number;
  startEditing?: boolean;
  startInFocus?: boolean;
  closeOnExitFocus?: boolean;
  forceFocus?: boolean;
  previewOnly?: boolean;
  initialContent?: string;
  initialSpaceTagId?: number;
  taskId?: number;
  taskKnowledgeId?: number;
  onClose: () => void;
  onCreated?: (id: number) => void;
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
  previewOnly = false,
  initialContent = '',
  initialSpaceTagId,
  taskId,
  taskKnowledgeId,
  onClose,
  onCreated,
  onFocusOpen,
  onDelete,
  onUpdated,
}) => {
  const isCreateMode = typeof knowledgeId !== 'number';
  const { currentRole, hasCapability } = useAuth();
  const isStudent = currentRole === 'STUDENT';
  const canUpdateKnowledge = !previewOnly && hasCapability('knowledge.update');
  const canDeleteKnowledge = !previewOnly && hasCapability('knowledge.delete');

  const { data, isLoading } = useKnowledgeDetail({
    knowledgeId,
    taskKnowledgeId,
  });
  const createKnowledge = useCreateKnowledge();
  const updateKnowledge = useUpdateKnowledge();
  const parseDocument = useParseDocument();
  const completeLearning = useCompleteLearning();
  const knowledgeFromQuery = data as KnowledgeDetailType | undefined;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [localKnowledgeSnapshot, setLocalKnowledgeSnapshot] = useState<{
    knowledgeId: number;
    detail: KnowledgeDetailType;
  } | undefined>(undefined);
  const [createDraft, setCreateDraft] = useState<{
    content: string;
    title: string;
    tags: SimpleTag[];
    spaceTagId?: number;
    relatedLinks: RelatedLink[];
  }>({
    content: initialContent,
    title: '',
    tags: [],
    spaceTagId: undefined,
    relatedLinks: [],
  });
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

  useEffect(() => {
    if (!isCreateMode) {
      return;
    }

    const normalizedInitialContent = initialContent.includes('<')
      ? initialContent
      : textToKnowledgeHtml(initialContent);
    const hasPreferredSpaceTag = typeof initialSpaceTagId === 'number' && spaces.some((tag) => tag.id === initialSpaceTagId);

    setCreateDraft({
      content: normalizedInitialContent,
      title: getKnowledgeTitleFromHtml(normalizedInitialContent),
      tags: [],
      spaceTagId: hasPreferredSpaceTag ? initialSpaceTagId : undefined,
      relatedLinks: [],
    });
    setShowFocusTagPanel(false);
    setShowFocusRelatedLinksPanel(false);
  }, [initialContent, initialSpaceTagId, isCreateMode, spaces]);

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
  const canSubmitFocus = Boolean(hasChanges);

  const applyKnowledgeSnapshot = useCallback((updatedKnowledge: KnowledgeDetailType) => {
    setLocalKnowledgeSnapshot({
      knowledgeId: knowledgeId!,
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
        id: knowledgeId!,
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

  const createCanSave = hasMeaningfulKnowledgeHtml(createDraft.content);
  const isUploading = parseDocument.isPending;
  const createCanSubmit = createCanSave && !createKnowledge.isPending && !isUploading;

  const handleCreateContentChange = useCallback((nextContent: string) => {
    setCreateDraft((current) => {
      const derivedTitle = getKnowledgeTitleFromHtml(nextContent);
      return {
        ...current,
        content: nextContent,
        title: derivedTitle || current.title,
      };
    });
  }, []);

  const handleCreateFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await parseDocument.mutateAsync(file);
      const derivedTitle = getKnowledgeTitleFromHtml(result.content);
      setCreateDraft((current) => ({
        ...current,
        content: result.content,
        title: derivedTitle || result.suggested_title?.trim() || '',
      }));
      toast.success('文档导入成功');
    } catch (error) {
      showApiError(error, '文档导入失败');
    } finally {
      event.target.value = '';
    }
  }, [parseDocument]);

  const handleCreateSave = useCallback(async () => {
    if (!createCanSave) return;

    try {
      const trimmedTitle = getKnowledgeTitleFromHtml(createDraft.content) || createDraft.title.trim();
      const sanitizedLinks = sanitizeRelatedLinks(createDraft.relatedLinks);
      const result = await createKnowledge.mutateAsync({
        ...(trimmedTitle && { title: trimmedTitle }),
        space_tag_id: createDraft.spaceTagId,
        content: createDraft.content,
        related_links: sanitizedLinks.length > 0 ? sanitizedLinks : undefined,
        tag_ids: createDraft.tags.map((tag) => tag.id),
      });
      toast.success('知识创建成功');
      onClose();
      onCreated?.(result.id);
    } catch (error) {
      showApiError(error, '创建失败');
    }
  }, [createCanSave, createDraft, createKnowledge, onClose, onCreated]);

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

  const updateRelatedLinksDraft = useCallback((
    updater: (current: RelatedLink[]) => RelatedLink[],
  ) => {
    const current = editRelatedLinks ?? knowledge?.related_links ?? [];
    const nextLinks = updater(current);
    setEditRelatedLinks(nextLinks);
    return nextLinks;
  }, [editRelatedLinks, knowledge?.related_links]);

  const handleRelatedLinkChange = useCallback((
    index: number,
    field: keyof RelatedLink,
    value: string,
  ) => {
    updateRelatedLinksDraft((current) => current.map((item, itemIndex) => (
      itemIndex === index
        ? { ...item, [field]: value }
        : item
    )));
  }, [updateRelatedLinksDraft]);

  const handleAddRelatedLink = useCallback(() => {
    updateRelatedLinksDraft((current) => [...current, createEmptyRelatedLink()]);
  }, [updateRelatedLinksDraft]);

  const handleFocusRemoveRelatedLink = useCallback((index: number) => {
    updateRelatedLinksDraft((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }, [updateRelatedLinksDraft]);

  const handleFocusSpaceTagChange = useCallback((nextSpaceTagId?: number) => {
    setEditSpaceTagId(nextSpaceTagId ?? null);
  }, []);

  const handleRemoveRelatedLink = useCallback((index: number) => {
    const nextLinks = updateRelatedLinksDraft((current) => current.filter((_, itemIndex) => itemIndex !== index));
    void commitPatch(
      { related_links: sanitizeRelatedLinks(nextLinks) },
      '相关链接保存失败',
      () => {
        setEditRelatedLinks((currentLinks) => (
          currentLinks && hasSameRelatedLinks(currentLinks, nextLinks) ? undefined : currentLinks
        ));
      },
    );
  }, [commitPatch, updateRelatedLinksDraft]);

  const handleExitFocusMode = useCallback(() => {
    setShowFocusTagPanel(false);
    setShowFocusRelatedLinksPanel(false);
    if (closeOnExitFocus || forceFocus) {
      onClose();
      return;
    }
    setIsFocusMode(false);
  }, [closeOnExitFocus, forceFocus, onClose]);

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
        id: knowledgeId!,
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

  useKnowledgeModalInteractions({
    onEscape: () => {
      if (showFocusRelatedLinksPanel) {
        setShowFocusRelatedLinksPanel(false);
      } else if (showFocusTagPanel) {
        setShowFocusTagPanel(false);
      } else if (isCreateMode) {
        onClose();
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
    onSubmit: () => {
      if (isCreateMode) {
        void handleCreateSave();
        return;
      }
      if (isFocusMode) {
        void handleSave();
      }
    },
  });

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
    onDelete?.(knowledgeId!);
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
        id: knowledgeId!,
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
      return immersive ? (
        <div className="kab-chip kd-immersive-learning-state">
          <CheckCircle style={{ width: 14, height: 14 }} />
          已学习
        </div>
      ) : (
        <div className={`kd-complete-done${docked ? ' kd-complete-done-docked' : ''}`}>
          <CheckCircle style={{ width: 14, height: 14 }} />
          已学习
        </div>
      );
    }

    return immersive ? (
      <KnowledgeActionButton
        onClick={handleComplete}
        disabled={completeLearning.isPending}
        className="kd-immersive-save-btn"
      >
        {completeLearning.isPending ? '处理中…' : '标记已学习'}
      </KnowledgeActionButton>
    ) : (
      <KnowledgeActionButton
        variant="solid"
        onClick={handleComplete}
        disabled={completeLearning.isPending}
        className={docked ? 'kd-complete-btn-docked' : undefined}
      >
        {completeLearning.isPending ? '处理中…' : '标记已学习'}
      </KnowledgeActionButton>
    );
  };

  const learningAction = renderLearningAction({ docked: true });
  const immersiveLearningAction = renderLearningAction({ immersive: true });

  if (isCreateMode) {
    return createPortal(
      <KnowledgeFocusShell
        content={createDraft.content}
        onContentChange={handleCreateContentChange}
        onExit={onClose}
        fixed
        zIndex={500}
        fadeInDuration="0.25s"
        editorClassName="akm-editor"
        editorMaxWidth={960}
        editorPadding="72px 40px 120px"
        editorMinHeight={380}
        minimizeIconSize={16}
      >
        <KnowledgeFocusMetadataBar
          spaces={spaces}
          spaceTagId={createDraft.spaceTagId}
          onSpaceTagChange={(nextSpaceTagId) => setCreateDraft((current) => ({
            ...current,
            spaceTagId: nextSpaceTagId,
          }))}
          selectedTags={createDraft.tags}
          onAddTag={(tag) => setCreateDraft((current) => (
            current.tags.some((item) => item.id === tag.id)
              ? current
              : { ...current, tags: [...current.tags, tag] }
          ))}
          onRemoveTag={(tagId) => setCreateDraft((current) => ({
            ...current,
            tags: current.tags.filter((tag) => tag.id !== tagId),
          }))}
          title={createDraft.title}
          onTitleChange={(title) => setCreateDraft((current) => ({ ...current, title }))}
          relatedLinks={createDraft.relatedLinks}
          onRelatedLinkChange={(index, field, value) => setCreateDraft((current) => ({
            ...current,
            relatedLinks: current.relatedLinks.map((item, itemIndex) => (
              itemIndex === index ? { ...item, [field]: value } : item
            )),
          }))}
          onAddRelatedLink={() => setCreateDraft((current) => ({
            ...current,
            relatedLinks: [...current.relatedLinks, createEmptyRelatedLink()],
          }))}
          onRemoveRelatedLink={(index) => setCreateDraft((current) => ({
            ...current,
            relatedLinks: current.relatedLinks.filter((_, itemIndex) => itemIndex !== index),
          }))}
          showTagPanel={showFocusTagPanel}
          onShowTagPanelChange={setShowFocusTagPanel}
          showRelatedLinksPanel={showFocusRelatedLinksPanel}
          onShowRelatedLinksPanelChange={setShowFocusRelatedLinksPanel}
          onSave={handleCreateSave}
          saveDisabled={!createCanSubmit}
          isSaving={createKnowledge.isPending}
          extraTools={(
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="akm-upload-btn"
              >
                <Upload size={13} />
                {isUploading ? '上传中…' : '上传'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.pptx,.pdf"
                onChange={handleCreateFileUpload}
                style={{ display: 'none' }}
                disabled={isUploading}
              />
            </>
          )}
        />
      </KnowledgeFocusShell>,
      document.body,
    );
  }

  if (isFocusMode && knowledge) {
    return createPortal(
      <KnowledgeFocusShell
        content={activeContent}
        onContentChange={handleContentChange}
        onExit={handleExitFocusMode}
        fixed
        zIndex={500}
        fadeInDuration="0.18s"
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
            onRelatedLinkChange={handleRelatedLinkChange}
            onAddRelatedLink={handleAddRelatedLink}
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
      </KnowledgeFocusShell>,
      document.body,
    );
  }

  const modalContent = (
    <div
      className="kd-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="kd-container"
        onClick={(e) => e.stopPropagation()}
      >
        {!isFocusMode && (
          <button
            type="button"
            onClick={() => {
              if (onFocusOpen) {
                onFocusOpen(knowledgeId!);
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
                  className={`kd-content kd-content-shell ke-content-detail${editing ? ' kd-content-editable' : ''}`}
                  minHeight={300}
                  autoFocus={false}
                  readOnly={!editing}
                />
              </div>
            </ScrollContainer>

            <KnowledgeDetailSidePanel
              knowledge={knowledge}
              activeTitle={activeTitle}
              activeTags={activeTags}
              activeRelatedLinks={activeRelatedLinks}
              activeSpaceTagId={activeSpaceTagId}
              spaces={spaces}
              updatedRelativeTime={relTime(knowledge.updated_at)}
              canUpdateKnowledge={canUpdateKnowledge}
              canDeleteKnowledge={canDeleteKnowledge}
              shouldShowSystemTagsSection={shouldShowSystemTagsSection}
              showTagInput={showTagInput}
              showSpaceTags={showSpaceTags}
              editing={editing}
              hasContentChanges={hasContentChanges}
              editingLinks={editingLinks}
              isSaving={isSaving}
              learningAction={learningAction}
              relatedLinksSectionRef={relatedLinksSectionRef}
              onTitleChange={setEditTitle}
              onTitleBlur={handleTitleBlur}
              onShowTagInputChange={setShowTagInput}
              onAddTag={addTag}
              onRemoveTag={removeTag}
              onOpenRelatedLinksEditor={handleOpenRelatedLinksEditor}
              onAddRelatedLink={handleAddRelatedLink}
              onRelatedLinkChange={handleRelatedLinkChange}
              onRelatedLinksBlur={handleRelatedLinksBlur}
              onRemoveRelatedLink={handleRemoveRelatedLink}
              onToggleSpaceTags={() => setShowSpaceTags(!showSpaceTags)}
              onSpaceTagSelect={handleSpaceTagSelect}
              onStartEditing={() => setEditing(true)}
              onDelete={handleDelete}
              onCancelEdit={handleCancelEdit}
              onSave={handleSave}
            />
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
