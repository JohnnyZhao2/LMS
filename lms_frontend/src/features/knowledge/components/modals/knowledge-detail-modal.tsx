import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

import { Skeleton } from '@/components/ui/skeleton';
import { ScrollContainer } from '@/components/ui/scroll-container';
import {
  useCreateKnowledge,
  useKnowledgeDetail,
  useParseDocument,
  useUpdateKnowledge,
} from '@/features/knowledge/api/knowledge-queries';
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

/** 解析后的完整草稿 */
type KnowledgeDraft = {
  content: string;
  title: string;
  tags: SimpleTag[];
  spaceTagId: number | null;
  relatedLinks: RelatedLink[];
};

/**
 * 脏字段补丁：编辑态 undefined = 相对 base 未改。
 * 自动保存成功后仅在脏值仍等于提交值时清除，避免覆盖并发编辑。
 */
type KnowledgeDraftPatch = Partial<KnowledgeDraft>;

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
  const a = sanitizeRelatedLinks(left);
  const b = sanitizeRelatedLinks(right);
  return a.length === b.length && a.every((link, i) => (
    link.url === b[i]?.url && (link.title ?? '') === (b[i]?.title ?? '')
  ));
}

function getRelatedLinksDraftError(relatedLinks: RelatedLink[]) {
  for (const link of relatedLinks) {
    const title = link.title?.trim() ?? '';
    const url = link.url.trim();
    if (!title && !url) continue;
    if (!url) return '请填写链接地址';
    try {
      new URL(url);
    } catch {
      return '链接地址格式不正确';
    }
  }
  return null;
}

function resolveDraft(patch: KnowledgeDraftPatch, base?: KnowledgeDetailType): KnowledgeDraft {
  return {
    content: patch.content ?? base?.content ?? '',
    title: patch.title ?? base?.title ?? '',
    tags: patch.tags ?? base?.tags ?? [],
    spaceTagId: patch.spaceTagId !== undefined ? patch.spaceTagId : base?.space_tag?.id ?? null,
    relatedLinks: patch.relatedLinks ?? base?.related_links ?? [],
  };
}

function hasDraftChanges(patch: KnowledgeDraftPatch, base: KnowledgeDetailType) {
  return (
    (patch.content !== undefined && patch.content !== base.content)
    || (patch.title !== undefined && patch.title !== base.title)
    || (patch.tags !== undefined && !hasSameTagIds(patch.tags, base.tags))
    || (
      patch.spaceTagId !== undefined
      && patch.spaceTagId !== (base.space_tag?.id ?? null)
    )
    || (
      patch.relatedLinks !== undefined
      && !hasSameRelatedLinks(patch.relatedLinks, base.related_links ?? [])
    )
  );
}

function buildCreateDraft(content: string, spaceTagId?: number): KnowledgeDraftPatch {
  const normalized = content.includes('<') ? content : textToKnowledgeHtml(content);
  return {
    content: normalized,
    title: getKnowledgeTitleFromHtml(normalized),
    tags: [],
    spaceTagId,
    relatedLinks: [],
  };
}

export interface KnowledgeLearningState {
  completed: boolean;
  pending?: boolean;
}

interface KnowledgeDetailModalProps {
  knowledgeId?: number;
  startFullscreen?: boolean;
  previewOnly?: boolean;
  initialContent?: string;
  initialSpaceTagId?: number;
  taskKnowledgeId?: number;
  learningState?: KnowledgeLearningState;
  onCompleteLearning?: () => void | Promise<void>;
  tagDeps: KnowledgeTagDeps;
  onClose: () => void;
  onCreated?: (id: number) => void;
  onDelete?: (id: number) => void;
  onUpdated?: () => void;
}

export const KnowledgeDetailModal: React.FC<KnowledgeDetailModalProps> = ({
  knowledgeId,
  startFullscreen = false,
  previewOnly = false,
  initialContent = '',
  initialSpaceTagId,
  taskKnowledgeId,
  learningState,
  onCompleteLearning,
  tagDeps,
  onClose,
  onCreated,
  onDelete,
  onUpdated,
}) => {
  const isCreateMode = typeof knowledgeId !== 'number' && !taskKnowledgeId;
  const { currentRole, hasCapability } = useAuth();
  const { useTags, TagAssignmentSection } = tagDeps;
  const isStudent = currentRole === 'STUDENT';
  const isPreviewOnly = previewOnly || Boolean(taskKnowledgeId);
  const canUpdateKnowledge = !isPreviewOnly && hasCapability('knowledge.update');
  const canEditContent = isCreateMode ? hasCapability('knowledge.create') : canUpdateKnowledge;
  const canDeleteKnowledge = !isPreviewOnly && hasCapability('knowledge.delete');

  const { data, isLoading } = useKnowledgeDetail({ knowledgeId, taskKnowledgeId });
  const createKnowledge = useCreateKnowledge();
  const updateKnowledge = useUpdateKnowledge();
  const parseDocument = useParseDocument();
  const knowledgeFromQuery = data as KnowledgeDetailType | undefined;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [localKnowledgeSnapshot, setLocalKnowledgeSnapshot] = useState<{
    knowledgeId: number;
    detail: KnowledgeDetailType;
  }>();
  const [draftPatch, setDraftPatch] = useState<KnowledgeDraftPatch>(() => (
    isCreateMode ? buildCreateDraft(initialContent) : {}
  ));

  const knowledge = localKnowledgeSnapshot && localKnowledgeSnapshot.knowledgeId === knowledgeId
    ? localKnowledgeSnapshot.detail
    : knowledgeFromQuery;
  const { data: spaces = [] } = useTags({ tag_type: 'SPACE' });

  useEffect(() => {
    if (!isCreateMode) return;
    const spaceOk = typeof initialSpaceTagId === 'number'
      && spaces.some((tag) => tag.id === initialSpaceTagId);
    setDraftPatch(buildCreateDraft(initialContent, spaceOk ? initialSpaceTagId : undefined));
  }, [initialContent, initialSpaceTagId, isCreateMode, spaces]);

  const relatedLinksSectionRef = useRef<HTMLDivElement | null>(null);
  const contentScrollRef = useRef<HTMLElement | null>(null);
  const contentHostRef = useRef<HTMLDivElement | null>(null);
  const isOutlineScrollLockedRef = useRef(false);
  const [formatToolbarHost, setFormatToolbarHost] = useState<HTMLDivElement | null>(null);
  const [editingLinks, setEditingLinks] = useState(false);
  const [activeOutlineId, setActiveOutlineId] = useState<string>();
  const [showTagInput, setShowTagInput] = useState(false);
  const [showSpaceTags, setShowSpaceTags] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(startFullscreen || isCreateMode);

  const draft = useMemo(
    () => resolveDraft(draftPatch, isCreateMode ? undefined : knowledge),
    [draftPatch, isCreateMode, knowledge],
  );
  const outlineItems = useMemo(() => getKnowledgeOutlineItems(draft.content), [draft.content]);
  const visibleOutlineId = outlineItems.some((item) => item.id === activeOutlineId)
    ? activeOutlineId
    : outlineItems[0]?.id;

  const hasChanges = Boolean(knowledge && hasDraftChanges(draftPatch, knowledge));
  const hasContentChanges = Boolean(
    knowledge && draftPatch.content !== undefined && draftPatch.content !== knowledge.content,
  );
  const createCanSave = hasMeaningfulKnowledgeHtml(draft.content);
  const isUploading = parseDocument.isPending;
  const isSaving = isCreateMode ? createKnowledge.isPending : updateKnowledge.isPending;
  const createCanSubmit = createCanSave && !isSaving && !isUploading;

  const applyKnowledgeSnapshot = useCallback((detail: KnowledgeDetailType) => {
    setLocalKnowledgeSnapshot({ knowledgeId: knowledgeId!, detail });
  }, [knowledgeId]);

  const updateDraft = useCallback((updater: (current: KnowledgeDraft) => Partial<KnowledgeDraft>) => {
    setDraftPatch((prev) => {
      const current = resolveDraft(prev, isCreateMode ? undefined : knowledge);
      const next = updater(current);
      return isCreateMode ? { ...current, ...next } : { ...prev, ...next };
    });
  }, [isCreateMode, knowledge]);

  /** 编辑态自动保存后：脏值未变则清回 base */
  const clearDirtyIf = useCallback(<K extends keyof KnowledgeDraft>(
    key: K,
    saved: KnowledgeDraft[K],
    equals: (a: KnowledgeDraft[K], b: KnowledgeDraft[K]) => boolean,
  ) => {
    setDraftPatch((patch) => {
      const current = patch[key];
      if (current === undefined || !equals(current, saved)) return patch;
      const next = { ...patch };
      delete next[key];
      return next;
    });
  }, []);

  const commitPatch = useCallback(async (
    data: KnowledgeUpdateRequest,
    errorMessage: string,
    onSuccess?: () => void,
  ) => {
    try {
      const updated = await updateKnowledge.mutateAsync({ id: knowledgeId!, data });
      applyKnowledgeSnapshot(updated);
      onSuccess?.();
      onUpdated?.();
      return updated;
    } catch (error) {
      showApiError(error, errorMessage);
      return null;
    }
  }, [applyKnowledgeSnapshot, knowledgeId, onUpdated, updateKnowledge]);

  /** 写草稿；编辑态可选立即提交并按脏比较清字段 */
  const mutateDraftField = useCallback(<K extends keyof KnowledgeDraft>(
    key: K,
    value: KnowledgeDraft[K],
    request?: KnowledgeUpdateRequest,
    errorMessage?: string,
    equals?: (a: KnowledgeDraft[K], b: KnowledgeDraft[K]) => boolean,
  ) => {
    updateDraft(() => ({ [key]: value } as Partial<KnowledgeDraft>));
    if (isCreateMode || !request || !errorMessage || !equals) return;
    void commitPatch(request, errorMessage, () => clearDirtyIf(key, value, equals));
  }, [clearDirtyIf, commitPatch, isCreateMode, updateDraft]);

  const handleContentChange = useCallback((nextContent: string) => {
    const derivedTitle = getKnowledgeTitleFromHtml(nextContent);
    updateDraft((current) => ({
      content: nextContent,
      ...(isCreateMode
        ? { title: derivedTitle || current.title }
        : derivedTitle ? { title: derivedTitle } : {}),
    }));
  }, [isCreateMode, updateDraft]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = await parseDocument.mutateAsync(file);
      const derivedTitle = getKnowledgeTitleFromHtml(result.content);
      updateDraft(() => ({
        content: result.content,
        title: derivedTitle || result.suggested_title?.trim() || '',
      }));
      toast.success('文档导入成功');
    } catch (error) {
      showApiError(error, '文档导入失败');
    } finally {
      event.target.value = '';
    }
  }, [parseDocument, updateDraft]);

  const handleTitleChange = useCallback((title: string) => {
    updateDraft(() => ({ title }));
  }, [updateDraft]);

  const commitTags = useCallback((nextTags: SimpleTag[]) => {
    mutateDraftField(
      'tags',
      nextTags,
      { tag_ids: nextTags.map((t) => t.id) },
      '标签保存失败',
      hasSameTagIds,
    );
  }, [mutateDraftField]);

  const handleAddTag = useCallback((tag: { id: number; name: string }) => {
    if (draft.tags.some((item) => item.id === tag.id)) return;
    commitTags([...draft.tags, tag]);
  }, [commitTags, draft.tags]);

  const handleRemoveTag = useCallback((tagId: number) => {
    commitTags(draft.tags.filter((tag) => tag.id !== tagId));
  }, [commitTags, draft.tags]);

  const handleOpenRelatedLinksEditor = useCallback((appendEmpty = false) => {
    setEditingLinks(true);
    if (!appendEmpty) return;
    updateDraft((current) => ({
      relatedLinks: [...current.relatedLinks, createEmptyRelatedLink()],
    }));
  }, [updateDraft]);

  const handleAddRelatedLink = useCallback(() => {
    updateDraft((current) => ({
      relatedLinks: [...current.relatedLinks, createEmptyRelatedLink()],
    }));
  }, [updateDraft]);

  const handleRelatedLinkChange = useCallback((
    index: number,
    field: keyof RelatedLink,
    value: string,
  ) => {
    updateDraft((current) => ({
      relatedLinks: current.relatedLinks.map((item, i) => (
        i === index ? { ...item, [field]: value } : item
      )),
    }));
  }, [updateDraft]);

  const handleRemoveRelatedLink = useCallback((index: number) => {
    const nextLinks = draft.relatedLinks.filter((_, i) => i !== index);
    mutateDraftField(
      'relatedLinks',
      nextLinks,
      { related_links: sanitizeRelatedLinks(nextLinks) },
      '相关链接保存失败',
      hasSameRelatedLinks,
    );
  }, [draft.relatedLinks, mutateDraftField]);

  const handleTitleBlur = useCallback(() => {
    if (isCreateMode || !knowledge || draftPatch.title === undefined || draftPatch.title === knowledge.title) {
      return;
    }
    const nextTitle = draftPatch.title;
    void commitPatch(
      { title: nextTitle },
      '标题保存失败',
      () => clearDirtyIf('title', nextTitle, (a, b) => a === b),
    );
  }, [clearDirtyIf, commitPatch, draftPatch.title, isCreateMode, knowledge]);

  const handleRelatedLinksBlur = useCallback(() => {
    const links = isCreateMode ? draft.relatedLinks : draftPatch.relatedLinks;
    if (!isCreateMode && (links === undefined || !knowledge)) {
      setEditingLinks(false);
      return;
    }
    const nextLinks = links ?? [];
    const draftError = getRelatedLinksDraftError(nextLinks);
    if (draftError) {
      toast.error(draftError);
      return;
    }
    if (isCreateMode) {
      setEditingLinks(false);
      return;
    }
    if (hasSameRelatedLinks(nextLinks, knowledge!.related_links ?? [])) {
      clearDirtyIf('relatedLinks', nextLinks, hasSameRelatedLinks);
      setEditingLinks(false);
      return;
    }
    setEditingLinks(false);
    void commitPatch(
      { related_links: sanitizeRelatedLinks(nextLinks) },
      '相关链接保存失败',
      () => clearDirtyIf('relatedLinks', nextLinks, hasSameRelatedLinks),
    );
  }, [
    clearDirtyIf,
    commitPatch,
    draft.relatedLinks,
    draftPatch.relatedLinks,
    isCreateMode,
    knowledge,
  ]);

  useEffect(() => {
    if (!editingLinks) return;
    const onPointerDown = (event: PointerEvent) => {
      if (relatedLinksSectionRef.current?.contains(event.target as Node)) return;
      handleRelatedLinksBlur();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [editingLinks, handleRelatedLinksBlur]);

  const handleSave = useCallback(async () => {
    if (isCreateMode) {
      if (!createCanSave) return;
      try {
        const trimmedTitle = getKnowledgeTitleFromHtml(draft.content) || draft.title.trim();
        const sanitizedLinks = sanitizeRelatedLinks(draft.relatedLinks);
        const result = await createKnowledge.mutateAsync({
          ...(trimmedTitle && { title: trimmedTitle }),
          space_tag_id: draft.spaceTagId ?? undefined,
          content: draft.content,
          related_links: sanitizedLinks.length > 0 ? sanitizedLinks : undefined,
          tag_ids: draft.tags.map((tag) => tag.id),
        });
        toast.success('知识创建成功');
        onClose();
        onCreated?.(result.id);
      } catch (error) {
        showApiError(error, '创建失败');
      }
      return;
    }

    if (!hasChanges || !knowledge) return false;
    const draftError = draftPatch.relatedLinks
      ? getRelatedLinksDraftError(draftPatch.relatedLinks)
      : null;
    if (draftError) {
      toast.error(draftError);
      return false;
    }
    try {
      const derived = draftPatch.content !== undefined
        ? getKnowledgeTitleFromHtml(draftPatch.content)
        : '';
      const title = draftPatch.content !== undefined
        ? (derived || draftPatch.title || knowledge.title)
        : (draftPatch.title ?? knowledge.title);
      const updated = await updateKnowledge.mutateAsync({
        id: knowledgeId!,
        data: {
          title,
          ...(draftPatch.content !== undefined && { content: draftPatch.content }),
          ...(draftPatch.tags !== undefined && { tag_ids: draftPatch.tags.map((t) => t.id) }),
          ...(draftPatch.spaceTagId !== undefined && {
            space_tag_id: draftPatch.spaceTagId ?? undefined,
          }),
          ...(draftPatch.relatedLinks !== undefined && {
            related_links: sanitizeRelatedLinks(draftPatch.relatedLinks),
          }),
        },
      });
      applyKnowledgeSnapshot(updated);
      toast.success('已保存');
      setDraftPatch({});
      onUpdated?.();
      return true;
    } catch (error) {
      showApiError(error, '保存失败');
      return false;
    }
  }, [
    applyKnowledgeSnapshot,
    createCanSave,
    createKnowledge,
    draft,
    draftPatch,
    hasChanges,
    isCreateMode,
    knowledge,
    knowledgeId,
    onClose,
    onCreated,
    onUpdated,
    updateKnowledge,
  ]);

  useKnowledgeModalInteractions({
    onEscape: () => {
      if (isFullscreen) setIsFullscreen(false);
      else if (showSpaceTags) setShowSpaceTags(false);
      else onClose();
    },
    onSubmit: () => {
      if (isCreateMode || isFullscreen) void handleSave();
    },
  });

  useEffect(() => {
    const host = contentHostRef.current;
    if (!host) return;
    host.querySelectorAll<HTMLElement>('.sqe-editor :is(h1,h2,h3,h4)').forEach((heading, index) => {
      const item = outlineItems[index];
      if (!item) return;
      heading.id = item.id;
      heading.dataset.outlineId = item.id;
    });
  }, [isFullscreen, draft.content, outlineItems]);

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
        if (heading.getBoundingClientRect().top - containerTop > 96) break;
        nextActiveId = heading.dataset.outlineId;
      }
      if (nextActiveId) setActiveOutlineId(nextActiveId);
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateActiveHeading);
    };
    updateActiveHeading();
    container.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      container.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
    };
  }, [isFullscreen, outlineItems]);

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

  const handleSpaceTagSelect = useCallback(async (nextSpaceTagId: number) => {
    setShowSpaceTags(false);
    if (draft.spaceTagId === nextSpaceTagId) return;
    if (isCreateMode) {
      updateDraft(() => ({ spaceTagId: nextSpaceTagId }));
      return;
    }
    try {
      const updated = await updateKnowledge.mutateAsync({
        id: knowledgeId!,
        data: { space_tag_id: nextSpaceTagId },
      });
      applyKnowledgeSnapshot(updated);
      clearDirtyIf('spaceTagId', nextSpaceTagId, (a, b) => a === b);
      toast.success('空间已更新');
      onUpdated?.();
    } catch (error) {
      showApiError(error, '空间更新失败');
    }
  }, [
    applyKnowledgeSnapshot,
    clearDirtyIf,
    draft.spaceTagId,
    isCreateMode,
    knowledgeId,
    onUpdated,
    updateDraft,
    updateKnowledge,
  ]);

  const learningAction = learningState && onCompleteLearning ? (
    <KnowledgeLearningAction
      visible
      completed={Boolean(learningState.completed)}
      pending={Boolean(learningState.pending)}
      onComplete={() => { void onCompleteLearning(); }}
      docked
    />
  ) : null;

  const modalContent = (
    <div
      className={`kd-overlay${isFullscreen ? ' kd-overlay-fullscreen' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`kd-container${isFullscreen ? ' kd-container-fullscreen' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setIsFullscreen((v) => !v)}
          className="kd-focus-btn"
          data-tip={isFullscreen ? '退出专注' : '专注'}
          title={isFullscreen ? '退出专注' : '专注'}
          aria-label={isFullscreen ? '退出专注' : '专注'}
        >
          <FocusOrbIcon size={20} interactive />
        </button>

        {!isCreateMode && isLoading ? (
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
        ) : !isCreateMode && !knowledge ? (
          <div className="kd-left-shell">
            <div className="kd-left kd-left-static" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: '#aaa', fontSize: 15, fontStyle: 'italic' }}>知识文档不存在</p>
            </div>
          </div>
        ) : (
          <>
            <KnowledgeDetailOutline
              items={outlineItems}
              activeId={visibleOutlineId}
              onSelect={handleOutlineSelect}
            />

            <div className="kd-left-shell">
              {canEditContent && (
                <div
                  ref={setFormatToolbarHost}
                  className="sqe-toolbar-host kd-format-toolbar-host"
                />
              )}
              <ScrollContainer ref={contentScrollRef} className="kd-left">
                <div ref={contentHostRef} style={{ cursor: canEditContent ? 'text' : 'default' }}>
                  <KnowledgeTextEditor
                    value={draft.content}
                    onChange={handleContentChange}
                    onBlur={isCreateMode || !hasChanges ? undefined : () => { void handleSave(); }}
                    placeholder="键入 / 调出快捷指令"
                    className={`kd-content kd-content-shell ke-content-detail${canEditContent ? ' kd-content-editable' : ''}`}
                    minHeight={300}
                    autoFocus={isCreateMode}
                    readOnly={!canEditContent}
                    enableFormatToolbar={canEditContent}
                    toolbarPortalTarget={formatToolbarHost}
                  />
                </div>
              </ScrollContainer>
            </div>

            <KnowledgeDetailSidePanel
              draft={{
                knowledge,
                title: draft.title,
                tags: draft.tags,
                relatedLinks: draft.relatedLinks,
                spaceTagId: draft.spaceTagId,
                spaces,
                updatedRelativeTime: isCreateMode ? '新建知识' : relTime(knowledge!.updated_at),
                showTagInput,
                showSpaceTags,
                editingLinks,
                hasContentChanges: isCreateMode ? createCanSave : hasContentChanges,
                isSaving,
                canSave: createCanSubmit,
                isUploading,
                learningAction: isCreateMode ? null : learningAction,
              }}
              permissions={{
                isCreateMode,
                canUpdateKnowledge: canEditContent,
                canDeleteKnowledge: !isCreateMode && canDeleteKnowledge,
                shouldShowSystemTagsSection: isCreateMode || !isStudent || draft.tags.length > 0,
              }}
              actions={{
                relatedLinksSectionRef,
                TagAssignmentSection,
                onTitleChange: handleTitleChange,
                onTitleBlur: isCreateMode ? undefined : handleTitleBlur,
                onShowTagInputChange: setShowTagInput,
                onAddTag: handleAddTag,
                onRemoveTag: handleRemoveTag,
                onOpenRelatedLinksEditor: handleOpenRelatedLinksEditor,
                onAddRelatedLink: handleAddRelatedLink,
                onRelatedLinkChange: handleRelatedLinkChange,
                onRelatedLinksBlur: handleRelatedLinksBlur,
                onRemoveRelatedLink: handleRemoveRelatedLink,
                onToggleSpaceTags: () => setShowSpaceTags((v) => !v),
                onSpaceTagSelect: handleSpaceTagSelect,
                onDelete: isCreateMode ? undefined : () => {
                  onDelete?.(knowledgeId!);
                  onClose();
                },
                onCancelEdit: isCreateMode ? undefined : () => {
                  setDraftPatch({});
                  setEditingLinks(false);
                  setShowTagInput(false);
                  setShowSpaceTags(false);
                },
                onSave: () => { void handleSave(); },
                onUpload: isCreateMode ? () => fileInputRef.current?.click() : undefined,
              }}
            />

            {isCreateMode && (
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.pptx,.pdf"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                disabled={isUploading}
              />
            )}
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
