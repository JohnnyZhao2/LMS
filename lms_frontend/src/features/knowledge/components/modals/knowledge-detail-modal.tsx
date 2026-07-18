import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Skeleton } from '@/components/ui/skeleton';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { useKnowledgeDetail } from '@/features/knowledge/api/use-knowledge-detail';
import { useCreateKnowledge } from '@/features/knowledge/api/create-knowledge';
import { useUpdateKnowledge } from '@/features/knowledge/api/update-knowledge';
import { useParseDocument } from '@/features/knowledge/api/parse-document';
import { useKnowledgeModalInteractions } from '@/features/knowledge/hooks/use-knowledge-modal-interactions';
import { useAuth } from '@/lib/auth-context';
import type { KnowledgeDetail as KnowledgeDetailType, KnowledgeUpdateRequest } from '@/types/knowledge';
import type { SimpleTag } from '@/types/common';
import type { RelatedLink } from '@/types/knowledge';
import { FocusOrbIcon } from '@/features/knowledge/components/shared/focus-icon';
import { KnowledgeTextEditor } from '@/features/knowledge/components/editor/knowledge-text-editor';
import { KnowledgeDetailSidePanel } from '@/features/knowledge/components/modals/knowledge-detail-side-panel';
import { KnowledgeDetailOutline } from '@/features/knowledge/components/modals/knowledge-detail-outline';
import {
  getKnowledgeOutlineItems,
  type KnowledgeOutlineItem,
} from '@/features/knowledge/components/modals/knowledge-detail-outline-utils';
import { KnowledgeFocusShell } from '@/features/knowledge/components/modals/knowledge-focus-shell';
import { KnowledgeFocusMetadataBar } from '@/features/knowledge/components/modals/knowledge-focus-metadata-bar';
import { KnowledgeLearningAction } from '@/features/knowledge/components/modals/knowledge-learning-action';
import { getKnowledgeTitleFromHtml } from '@/features/knowledge/utils/content-utils';
import { showApiError } from '@/lib/api-error-handler';
import {
  createEmptyRelatedLink,
  sanitizeRelatedLinks,
} from '@/features/knowledge/utils/related-links';
import {
  hasMeaningfulKnowledgeHtml,
  textToKnowledgeHtml,
} from '@/features/knowledge/utils/slash-shortcuts';
import '@/features/knowledge/components/modals/knowledge-detail-modal.css';
import type { KnowledgeTagDeps } from '@/features/knowledge/types/tag-deps';

function relTime(dateStr: string): string {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d === 0) return '今天';
  if (d === 1) return '昨天';
  if (d < 30) return `${d} 天前`;
  return `${Math.floor(d / 30)} 个月前`;
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

export interface KnowledgeLearningState {
  completed: boolean;
  pending?: boolean;
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
  /** 学生任务场景：通过 task-knowledge 节点加载内容 */
  taskKnowledgeId?: number;
  /** 由 Tasks/app 注入的学习状态，存在时展示完成操作 */
  learningState?: KnowledgeLearningState;
  onCompleteLearning?: () => void | Promise<void>;
  tagDeps: KnowledgeTagDeps;
  onClose: () => void;
  onCreated?: (id: number) => void;
  onFocusOpen?: (id: number) => void;
  onDelete?: (id: number) => void;
  onUpdated?: () => void;
}

export const KnowledgeDetailModal: React.FC<KnowledgeDetailModalProps> = ({
  knowledgeId,
  startInFocus = false,
  closeOnExitFocus = false,
  forceFocus = false,
  previewOnly = false,
  initialContent = '',
  initialSpaceTagId,
  taskKnowledgeId,
  learningState,
  onCompleteLearning,
  tagDeps,
  onClose,
  onCreated,
  onFocusOpen,
  onDelete,
  onUpdated,
}) => {
  const isCreateMode = typeof knowledgeId !== 'number' && !taskKnowledgeId;
  const { currentRole, hasCapability } = useAuth();
  const { useTags, TagInput, TagAssignmentSection } = tagDeps;
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

  // 编辑草稿
  const [editContent, setEditContent] = useState<string | undefined>(undefined);
  const [editTitle, setEditTitle] = useState<string | undefined>(undefined);
  const [editTags, setEditTags] = useState<SimpleTag[] | undefined>(undefined);
  const [editSpaceTagId, setEditSpaceTagId] = useState<number | undefined | null>(undefined);
  const [editRelatedLinks, setEditRelatedLinks] = useState<RelatedLink[] | undefined>(undefined);
  const relatedLinksSectionRef = useRef<HTMLDivElement | null>(null);
  const contentScrollRef = useRef<HTMLElement | null>(null);
  const contentHostRef = useRef<HTMLDivElement | null>(null);
  const isOutlineScrollLockedRef = useRef(false);
  const [editingLinks, setEditingLinks] = useState(false);
  const [activeOutlineId, setActiveOutlineId] = useState<string | undefined>();

  // 标签输入展开
  const [showTagInput, setShowTagInput] = useState(false);
  // space选择
  const [showSpaceTags, setShowSpaceTags] = useState(false);
  const [showFocusTagPanel, setShowFocusTagPanel] = useState(false);
  const [showFocusRelatedLinksPanel, setShowFocusRelatedLinksPanel] = useState(false);
  // 专注模式（全屏查看）
  const [isFocusMode, setIsFocusMode] = useState(forceFocus || startInFocus);
  const isSaving = updateKnowledge.isPending;

  const activeContent = editContent ?? knowledge?.content ?? '';
  const outlineContent = isCreateMode ? createDraft.content : activeContent;
  const outlineItems = useMemo(() => getKnowledgeOutlineItems(outlineContent), [outlineContent]);
  const visibleOutlineId = outlineItems.some((item) => item.id === activeOutlineId)
    ? activeOutlineId
    : outlineItems[0]?.id;

  // 实际使用的值
  const activeTitle = editTitle ?? knowledge?.title ?? '';
  const activeTags = editTags ?? knowledge?.tags ?? [];
  const shouldShowSystemTagsSection = !isStudent || activeTags.length > 0;
  const activeSpaceTagId = editSpaceTagId === undefined
    ? knowledge?.space_tag?.id ?? null
    : editSpaceTagId;
  const activeRelatedLinks = editRelatedLinks ?? knowledge?.related_links ?? [];

  // 判断是否有改动
  const hasChanges = Boolean(knowledge && (
    (editContent !== undefined && editContent !== knowledge.content) ||
    (editTitle !== undefined && editTitle !== knowledge.title) ||
    (editTags !== undefined) ||
    (editSpaceTagId !== undefined) ||
    (editRelatedLinks !== undefined)
  ));
  const hasContentChanges = Boolean(knowledge && editContent !== undefined && editContent !== knowledge.content);
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
    if (!hasChanges) return true;
    if (!knowledge) return false;
    const draftError = editRelatedLinks ? getRelatedLinksDraftError(editRelatedLinks) : null;
    if (draftError) {
      toast.error(draftError);
      return false;
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
      setEditContent(undefined);
      setEditTitle(undefined);
      setEditTags(undefined);
      setEditSpaceTagId(undefined);
      setEditRelatedLinks(undefined);
      setShowFocusTagPanel(false);
      setShowFocusRelatedLinksPanel(false);
      onUpdated?.();
      return true;
    } catch (error) {
      showApiError(error, '保存失败');
      return false;
    }
  }, [knowledge, hasChanges, onUpdated, editContent, editSpaceTagId, editRelatedLinks, editTags, editTitle, knowledgeId, updateKnowledge, applyKnowledgeSnapshot]);

  const handleExitFocusMode = useCallback(async () => {
    setShowFocusTagPanel(false);
    setShowFocusRelatedLinksPanel(false);
    if (hasChanges && canUpdateKnowledge) {
      const saved = await handleSave();
      if (!saved) return;
    }
    if (closeOnExitFocus || forceFocus) {
      onClose();
      return;
    }
    setIsFocusMode(false);
  }, [canUpdateKnowledge, closeOnExitFocus, forceFocus, handleSave, hasChanges, onClose]);

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

  useEffect(() => {
    const host = contentHostRef.current;
    if (!host) return;

    const headings = Array.from(host.querySelectorAll<HTMLElement>('.sqe-editor :is(h1,h2,h3,h4)'));
    headings.forEach((heading, index) => {
      const item = outlineItems[index];
      if (!item) return;

      heading.id = item.id;
      heading.dataset.outlineId = item.id;
    });
  }, [isFocusMode, outlineContent, outlineItems]);

  useEffect(() => {
    const container = contentScrollRef.current;
    const host = contentHostRef.current;
    if (!container || !host || outlineItems.length === 0) return;

    let frame = 0;
    const updateActiveHeading = () => {
      frame = 0;
      if (isOutlineScrollLockedRef.current) return;

      const containerTop = container.getBoundingClientRect().top;
      const headings = Array.from(host.querySelectorAll<HTMLElement>('[data-outline-id]'));
      let nextActiveId = headings[0]?.dataset.outlineId;

      for (const heading of headings) {
        const top = heading.getBoundingClientRect().top - containerTop;
        if (top > 96) break;
        nextActiveId = heading.dataset.outlineId;
      }

      if (nextActiveId) {
        setActiveOutlineId(nextActiveId);
      }
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateActiveHeading);
    };

    updateActiveHeading();
    container.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      container.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
    };
  }, [isFocusMode, outlineItems]);

  const handleOutlineSelect = useCallback((item: KnowledgeOutlineItem) => {
    const container = contentScrollRef.current;
    const host = contentHostRef.current;
    if (!container || !host) return;

    const target = Array.from(host.querySelectorAll<HTMLElement>('[data-outline-id]'))
      .find((heading) => heading.dataset.outlineId === item.id);
    if (!target) return;

    const top = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 24;
    isOutlineScrollLockedRef.current = true;
    setActiveOutlineId(item.id);
    container.addEventListener('scrollend', () => {
      isOutlineScrollLockedRef.current = false;
    }, { once: true });
    container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, []);

  const handleContentBlur = useCallback(() => {
    if (hasChanges) {
      void handleSave();
    }
  }, [handleSave, hasChanges]);

  const handleDelete = () => {
    onDelete?.(knowledgeId!);
    onClose();
  };

  const handleCancelEdit = useCallback(() => {
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

  const showLearningAction = Boolean(learningState && onCompleteLearning);
  const learningAction = showLearningAction ? (
    <KnowledgeLearningAction
      visible
      completed={Boolean(learningState?.completed)}
      pending={Boolean(learningState?.pending)}
      onComplete={() => { void onCompleteLearning?.(); }}
      docked
    />
  ) : null;
  const immersiveLearningAction = showLearningAction ? (
    <KnowledgeLearningAction
      visible
      completed={Boolean(learningState?.completed)}
      pending={Boolean(learningState?.pending)}
      onComplete={() => { void onCompleteLearning?.(); }}
      immersive
    />
  ) : null;

  if (isCreateMode) {
    return createPortal(
      <KnowledgeFocusShell
        content={createDraft.content}
        onContentChange={handleCreateContentChange}
        onExit={onClose}
        fixed
        zIndex={500}
        fadeInDuration="0.25s"
        shellClassName="kd-focus-shell-with-outline"
        editorClassName="akm-editor"
        editorMaxWidth={960}
        editorPadding="72px 40px 120px"
        editorMinHeight={380}
        minimizeIconSize={16}
        editorAreaRef={contentScrollRef}
        editorHostRef={contentHostRef}
      >
        <KnowledgeDetailOutline
          items={outlineItems}
          activeId={visibleOutlineId}
          onSelect={handleOutlineSelect}
          className="kd-outline-focus"
        />
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
          TagInput={TagInput}
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
        shellClassName="kd-focus-shell-with-outline"
        editorClassName="kd-immersive-editor"
        editorMaxWidth={1040}
        editorPadding="64px 40px 144px"
        editorMinHeight={380}
        minimizeIconSize={22}
        readOnly={!canUpdateKnowledge}
        editorAreaRef={contentScrollRef}
        editorHostRef={contentHostRef}
      >
        <KnowledgeDetailOutline
          items={outlineItems}
          activeId={visibleOutlineId}
          onSelect={handleOutlineSelect}
          className="kd-outline-focus"
        />
        {canUpdateKnowledge ? (
          <KnowledgeFocusMetadataBar
            spaces={spaces}
            spaceTagId={activeSpaceTagId}
            onSpaceTagChange={handleFocusSpaceTagChange}
            selectedTags={activeTags}
            onAddTag={addTag}
            onRemoveTag={removeTag}
            TagInput={TagInput}
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
            showSaveAction={hasChanges}
            saveDisabled={!hasChanges}
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
            <div className="kd-left-shell">
              <div className="kd-left kd-left-static">
                <Skeleton className="h-10 w-3/4 mb-8" />
                <Skeleton className="h-5 w-full mb-4" />
                <Skeleton className="h-5 w-5/6 mb-4" />
                <Skeleton className="h-4 w-2/3 mb-3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
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
          <div className="kd-left-shell">
            <div className="kd-left kd-left-static" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: '#aaa', fontSize: 15, fontStyle: 'italic' }}>知识文档不存在</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── 左侧：点击进入编辑 / 查看内容 ── */}
            <KnowledgeDetailOutline
              items={outlineItems}
              activeId={visibleOutlineId}
              onSelect={handleOutlineSelect}
            />

            <div className="kd-left-shell">
              <ScrollContainer ref={contentScrollRef} className="kd-left">
                <div
                  ref={contentHostRef}
                  style={{ cursor: canUpdateKnowledge ? 'text' : 'default' }}
                >
                  <KnowledgeTextEditor
                    value={activeContent}
                    onChange={handleContentChange}
                    onBlur={handleContentBlur}
                    placeholder="键入 / 调出快捷指令"
                    className={`kd-content kd-content-shell ke-content-detail${canUpdateKnowledge ? ' kd-content-editable' : ''}`}
                    minHeight={300}
                    autoFocus={false}
                    readOnly={!canUpdateKnowledge}
                  />
                </div>
              </ScrollContainer>
            </div>

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
              hasContentChanges={hasContentChanges}
              editingLinks={editingLinks}
              isSaving={isSaving}
              learningAction={learningAction}
              relatedLinksSectionRef={relatedLinksSectionRef}
              TagAssignmentSection={TagAssignmentSection}
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
