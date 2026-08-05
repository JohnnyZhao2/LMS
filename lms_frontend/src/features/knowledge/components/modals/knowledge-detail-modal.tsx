import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Skeleton } from '@/components/ui/skeleton';
import { useTags } from '@/entities/tag/api/tags';
import { useKnowledgeDetail, useCreateKnowledge, useUpdateKnowledge } from '../../api/knowledge';
import { useKnowledgeModalInteractions } from '../../hooks/use-knowledge-modal-interactions';
import { useCompleteLearning } from '@/entities/task/api/complete-learning';
import { useStudentLearningTaskDetail } from '@/entities/task/api/get-task-detail';
import { useAuth } from '@/session/auth/auth-context';
import type { KnowledgeDetail as KnowledgeDetailType, KnowledgeWriteRequest, RelatedLink } from '@/types/knowledge';
import type { SimpleTag } from '@/types/common';
import { StepsEditor } from '../shared/steps-editor';
import { FocusOrbIcon } from '../shared/focus-icon';
import { KnowledgeDetailSidePanel } from './knowledge-detail-side-panel';
import { buildDocUrl, sanitizeStepsHtml } from '../../utils/content-utils';
import { showApiError } from '@/utils/error-handler';
import { sanitizeRelatedLinks } from '../../utils/related-links';
import './knowledge-detail-modal.css';

const EMPTY_RELATED_LINK: RelatedLink = { title: '', url: '' };

function relTime(dateStr: string): string {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d === 0) return '今天';
  if (d === 1) return '昨天';
  if (d < 30) return `${d} 天前`;
  return `${Math.floor(d / 30)} 个月前`;
}

/**
 * 比较两组标签 id 是否一致
 */
function hasSameTagIds(left: { id: number }[], right: { id: number }[]) {
  return left.length === right.length && left.every((tag, index) => tag.id === right[index]?.id);
}

/**
 * 比较两组相关链接是否一致
 */
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

interface KnowledgeDetailModalProps {
  knowledgeId?: number;
  startEditing?: boolean;
  /** 打开时直接全屏专注（仍是同一弹窗） */
  startInFocus?: boolean;
  previewOnly?: boolean;
  initialTitle?: string;
  initialContent?: string;
  initialExternalDocUrl?: string;
  initialSpaceTagId?: number;
  taskId?: number;
  taskKnowledgeId?: number;
  onClose: () => void;
  onCreated?: (id: number) => void;
  onDelete?: (id: number) => void;
  onUpdated?: () => void;
}

export const KnowledgeDetailModal: React.FC<KnowledgeDetailModalProps> = ({
  knowledgeId,
  startEditing: _startEditing = false,
  startInFocus = false,
  previewOnly = false,
  initialTitle = '',
  initialContent = '',
  initialExternalDocUrl = '',
  initialSpaceTagId,
  taskId,
  taskKnowledgeId,
  onClose,
  onCreated,
  onDelete,
  onUpdated,
}) => {
  const isCreateMode = typeof knowledgeId !== 'number';
  const { currentRole, hasCapability } = useAuth();
  const isStudent = currentRole === 'STUDENT';
  const canUpdateKnowledge = !previewOnly && (
    isCreateMode
      ? hasCapability('knowledge.create')
      : hasCapability('knowledge.update')
  );
  const canDeleteKnowledge = !previewOnly && !isCreateMode && hasCapability('knowledge.delete');

  const { data, isLoading } = useKnowledgeDetail({ knowledgeId, taskKnowledgeId });
  const createKnowledge = useCreateKnowledge();
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
  const { data: spaces = [] } = useTags({ tag_type: 'SPACE' });

  const [isFocusMode, setIsFocusMode] = useState(startInFocus);
  const [iframeEditMode, setIframeEditMode] = useState(false);
  const [editContent, setEditContent] = useState<string | undefined>(
    isCreateMode ? initialContent : undefined,
  );
  const [editTitle, setEditTitle] = useState<string | undefined>(
    isCreateMode ? initialTitle : undefined,
  );
  const [editExternalDocUrl, setEditExternalDocUrl] = useState<string | undefined>(
    isCreateMode ? initialExternalDocUrl : undefined,
  );
  const [editTags, setEditTags] = useState<SimpleTag[] | undefined>(undefined);
  const [editSpaceTagId, setEditSpaceTagId] = useState<number | undefined | null>(
    isCreateMode && typeof initialSpaceTagId === 'number' ? initialSpaceTagId : undefined,
  );
  const [editRelatedLinks, setEditRelatedLinks] = useState<RelatedLink[] | undefined>(undefined);

  const hasLocalSnapshot = Boolean(localKnowledgeSnapshot && localKnowledgeSnapshot.knowledgeId === knowledgeId);
  const knowledge = useMemo(() => {
    if (!isCreateMode) {
      return hasLocalSnapshot ? localKnowledgeSnapshot!.detail : knowledgeFromQuery;
    }
    const preferredSpaceId = editSpaceTagId === undefined ? initialSpaceTagId : editSpaceTagId;
    const spaceTag = typeof preferredSpaceId === 'number'
      ? spaces.find((tag) => tag.id === preferredSpaceId)
      : undefined;
    return {
      id: 0,
      title: initialTitle,
      content: initialContent,
      external_doc_url: initialExternalDocUrl,
      tags: [],
      related_links: [],
      space_tag: spaceTag ? { id: spaceTag.id, name: spaceTag.name } : null,
      view_count: 0,
      created_at: '',
      updated_at: '',
    } satisfies KnowledgeDetailType;
  }, [
    editSpaceTagId,
    hasLocalSnapshot,
    initialContent,
    initialExternalDocUrl,
    initialSpaceTagId,
    initialTitle,
    isCreateMode,
    knowledgeFromQuery,
    localKnowledgeSnapshot,
    spaces,
  ]);

  useEffect(() => {
    if (!isCreateMode || typeof initialSpaceTagId !== 'number') return;
    if (!spaces.some((tag) => tag.id === initialSpaceTagId)) {
      setEditSpaceTagId(null);
    }
  }, [initialSpaceTagId, isCreateMode, spaces]);
  const relatedLinksSectionRef = useRef<HTMLDivElement | null>(null);
  const contentScrollRef = useRef<HTMLElement | null>(null);
  const contentHostRef = useRef<HTMLDivElement | null>(null);
  const isOutlineScrollLockedRef = useRef(false);
  const [editingLinks, setEditingLinks] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [showSpaceTags, setShowSpaceTags] = useState(false);

  const activeContent = editContent ?? knowledge?.content ?? '';
  const activeTitle = editTitle ?? knowledge?.title ?? '';
  const activeExternalDocUrl = editExternalDocUrl ?? knowledge?.external_doc_url ?? '';
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

  const hasChanges = isCreateMode || Boolean(knowledge && (
    (editContent !== undefined && editContent !== knowledge.content)
    || (editTitle !== undefined && editTitle !== knowledge.title)
    || (editExternalDocUrl !== undefined && editExternalDocUrl !== knowledge.external_doc_url)
    || (editTags !== undefined)
    || (editSpaceTagId !== undefined)
    || (editRelatedLinks !== undefined)
  ));

  const applyKnowledgeSnapshot = useCallback((updatedKnowledge: KnowledgeDetailType) => {
    setLocalKnowledgeSnapshot({ knowledgeId: knowledgeId!, detail: updatedKnowledge });
  }, [knowledgeId]);

  const isSaving = isCreateMode ? createKnowledge.isPending : updateKnowledge.isPending;

  /**
   * 编辑态字段级落库
   */
  const commitPatch = useCallback(async (
    data: KnowledgeWriteRequest,
    errorMessage: string,
    onSuccess?: () => void,
  ) => {
    if (isCreateMode || !knowledgeId) return null;
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
  }, [applyKnowledgeSnapshot, isCreateMode, knowledgeId, onUpdated, updateKnowledge]);

  const clearLocalEdits = useCallback(() => {
    setEditContent(undefined);
    setEditTitle(undefined);
    setEditExternalDocUrl(undefined);
    setEditTags(undefined);
    setEditSpaceTagId(undefined);
    setEditRelatedLinks(undefined);
    setEditingLinks(false);
    setShowTagInput(false);
    setShowSpaceTags(false);
  }, []);

  const handleCreateSave = useCallback(async () => {
    if (createKnowledge.isPending) return;
    const draftError = getRelatedLinksDraftError(activeRelatedLinks);
    if (draftError) {
      toast.error(draftError);
      return;
    }
    try {
      const sanitizedLinks = sanitizeRelatedLinks(activeRelatedLinks);
      const result = await createKnowledge.mutateAsync({
        ...(activeTitle.trim() && { title: activeTitle.trim() }),
        ...(typeof activeSpaceTagId === 'number' && { space_tag_id: activeSpaceTagId }),
        content: sanitizeStepsHtml(activeContent),
        ...(activeExternalDocUrl.trim() && {
          external_doc_url: activeExternalDocUrl.trim(),
        }),
        related_links: sanitizedLinks.length > 0 ? sanitizedLinks : undefined,
        tag_ids: activeTags.map((tag) => tag.id),
      });
      toast.success('知识创建成功');
      onClose();
      onCreated?.(result.id);
    } catch (error) {
      showApiError(error, '创建失败');
    }
  }, [
    activeContent,
    activeExternalDocUrl,
    activeRelatedLinks,
    activeSpaceTagId,
    activeTags,
    activeTitle,
    createKnowledge,
    onClose,
    onCreated,
  ]);

  /**
   * 失焦时把当前脏字段一次落库（内容失焦 / 显式保存）
   */
  const handleSave = useCallback(async () => {
    if (isCreateMode) {
      await handleCreateSave();
      return true;
    }
    if (!hasChanges || !knowledge) return false;
    const draftError = editRelatedLinks ? getRelatedLinksDraftError(editRelatedLinks) : null;
    if (draftError) {
      toast.error(draftError);
      return false;
    }
    const nextDocUrl = (editExternalDocUrl ?? knowledge.external_doc_url ?? '').trim();
    const updatedKnowledge = await commitPatch(
      {
        title: editTitle ?? knowledge.title,
        content: sanitizeStepsHtml(editContent ?? knowledge.content),
        external_doc_url: nextDocUrl,
        ...(editTags !== undefined && { tag_ids: editTags.map((t) => t.id) }),
        ...(editSpaceTagId !== undefined && { space_tag_id: editSpaceTagId ?? undefined }),
        ...(editRelatedLinks !== undefined && {
          related_links: sanitizeRelatedLinks(editRelatedLinks),
        }),
      },
      '保存失败',
      clearLocalEdits,
    );
    return Boolean(updatedKnowledge);
  }, [
    clearLocalEdits,
    commitPatch,
    editContent,
    editExternalDocUrl,
    editRelatedLinks,
    editSpaceTagId,
    editTags,
    editTitle,
    handleCreateSave,
    hasChanges,
    isCreateMode,
    knowledge,
  ]);

  const handleTitleBlur = useCallback(() => {
    if (isCreateMode || !knowledge || editTitle === undefined || editTitle === knowledge.title) {
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
  }, [commitPatch, editTitle, isCreateMode, knowledge]);

  const handleExternalDocUrlBlur = useCallback(() => {
    if (isCreateMode || !knowledge || editExternalDocUrl === undefined) return;
    const nextDocUrl = editExternalDocUrl.trim();
    const currentDocUrl = knowledge.external_doc_url ?? '';
    if (nextDocUrl === currentDocUrl) {
      setEditExternalDocUrl(undefined);
      return;
    }
    void commitPatch(
      { external_doc_url: nextDocUrl },
      '文档链接保存失败',
      () => {
        setEditExternalDocUrl((current) => (
          current !== undefined && current.trim() === nextDocUrl ? undefined : current
        ));
      },
    );
  }, [commitPatch, editExternalDocUrl, isCreateMode, knowledge]);

  /**
   * 移除文档链接并落库
   */
  const handleExternalDocUrlClear = useCallback(() => {
    if (isCreateMode) {
      setEditExternalDocUrl(undefined);
      return;
    }
    if (!knowledge) return;
    if (!(knowledge.external_doc_url ?? '').trim()) {
      setEditExternalDocUrl(undefined);
      return;
    }
    void commitPatch(
      { external_doc_url: '' },
      '文档链接保存失败',
      () => setEditExternalDocUrl(undefined),
    );
  }, [commitPatch, isCreateMode, knowledge]);

  const handleContentBlur = useCallback(() => {
    if (isCreateMode) return;
    if (!hasChanges) return;
    void handleSave();
  }, [handleSave, hasChanges, isCreateMode]);

  const addTag = useCallback((tag: { id: number; name: string }) => {
    const current = editTags ?? knowledge?.tags ?? [];
    if (current.some((t) => t.id === tag.id)) return;
    const nextTags = [...current, tag];
    setEditTags(nextTags);
    if (isCreateMode) return;
    void commitPatch(
      { tag_ids: nextTags.map((item) => item.id) },
      '标签保存失败',
      () => {
        setEditTags((currentTags) => (
          currentTags && hasSameTagIds(currentTags, nextTags) ? undefined : currentTags
        ));
      },
    );
  }, [commitPatch, editTags, isCreateMode, knowledge?.tags]);

  const removeTag = useCallback((tagId: number) => {
    const current = editTags ?? knowledge?.tags ?? [];
    const nextTags = current.filter((t) => t.id !== tagId);
    setEditTags(nextTags);
    if (isCreateMode) return;
    void commitPatch(
      { tag_ids: nextTags.map((item) => item.id) },
      '标签保存失败',
      () => {
        setEditTags((currentTags) => (
          currentTags && hasSameTagIds(currentTags, nextTags) ? undefined : currentTags
        ));
      },
    );
  }, [commitPatch, editTags, isCreateMode, knowledge?.tags]);

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
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  }, [updateRelatedLinksDraft]);

  const handleAddRelatedLink = useCallback(() => {
    updateRelatedLinksDraft((current) => [...current, { ...EMPTY_RELATED_LINK }]);
  }, [updateRelatedLinksDraft]);

  const handleRemoveRelatedLink = useCallback((index: number) => {
    const nextLinks = updateRelatedLinksDraft((current) => current.filter((_, itemIndex) => itemIndex !== index));
    if (isCreateMode) return;
    void commitPatch(
      { related_links: sanitizeRelatedLinks(nextLinks) },
      '相关链接保存失败',
      () => {
        setEditRelatedLinks((currentLinks) => (
          currentLinks && hasSameRelatedLinks(currentLinks, nextLinks) ? undefined : currentLinks
        ));
      },
    );
  }, [commitPatch, isCreateMode, updateRelatedLinksDraft]);

  const handleOpenRelatedLinksEditor = useCallback((appendEmpty = false) => {
    setEditingLinks(true);
    if (!appendEmpty) return;
    setEditRelatedLinks((currentLinks) => [
      ...(currentLinks ?? knowledge?.related_links ?? []),
      { ...EMPTY_RELATED_LINK },
    ]);
  }, [knowledge?.related_links]);

  const handleRelatedLinksBlur = useCallback(() => {
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
    if (isCreateMode) {
      setEditingLinks(false);
      return;
    }
    if (!knowledge || hasSameRelatedLinks(nextLinks, knowledge.related_links ?? [])) {
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
  }, [commitPatch, editRelatedLinks, isCreateMode, knowledge]);

  useEffect(() => {
    if (!editingLinks) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && relatedLinksSectionRef.current?.contains(target)) return;
      handleRelatedLinksBlur();
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [editingLinks, handleRelatedLinksBlur]);

  const handleCancelEdit = useCallback(() => {
    clearLocalEdits();
  }, [clearLocalEdits]);

  useKnowledgeModalInteractions({
    onEscape: () => {
      if (showSpaceTags) {
        setShowSpaceTags(false);
      } else if (isFocusMode) {
        setIsFocusMode(false);
      } else if (!isCreateMode && hasChanges) {
        handleCancelEdit();
      } else {
        onClose();
      }
    },
    onSubmit: () => {
      if (isCreateMode || hasChanges) {
        void handleSave();
      }
    },
  });

  const handleSpaceTagSelect = useCallback(async (nextSpaceTagId: number) => {
    setShowSpaceTags(false);
    if (activeSpaceTagId === nextSpaceTagId) return;
    if (isCreateMode) {
      setEditSpaceTagId(nextSpaceTagId);
      return;
    }
    const updatedKnowledge = await commitPatch(
      { space_tag_id: nextSpaceTagId },
      '空间更新失败',
      () => setEditSpaceTagId(undefined),
    );
    if (updatedKnowledge) {
      toast.success('空间已更新');
    }
  }, [activeSpaceTagId, commitPatch, isCreateMode]);

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

  const learningAction = (() => {
    if (!isStudent || !taskId || !taskKnowledgeId) return null;
    if (isCompleted) {
      return (
        <div className="kd-complete-done kd-complete-done-docked">
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
        className="kab-btn kd-complete-btn-docked"
      >
        {completeLearning.isPending ? '处理中…' : '标记已学习'}
      </button>
    );
  })();

  const iframeSrc = buildDocUrl(
    activeExternalDocUrl,
    iframeEditMode ? 'edit' : 'view',
  );

  const handleCancelEditOrClose = useCallback(() => {
    if (isCreateMode) {
      onClose();
      return;
    }
    handleCancelEdit();
  }, [handleCancelEdit, isCreateMode, onClose]);

  const modalContent = (
    <div
      className={`kd-overlay${isFocusMode ? ' kd-overlay-focus' : ''}`}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        if (isFocusMode) {
          setIsFocusMode(false);
          return;
        }
        onClose();
      }}
    >
      <div
        className={`kd-container${isFocusMode ? ' kd-container-focus' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="kd-focus-btn"
          data-tip={isFocusMode ? '退出专注' : '专注'}
          title={isFocusMode ? '退出专注' : '专注'}
          aria-label={isFocusMode ? '退出专注' : '专注'}
          onClick={() => setIsFocusMode((v) => !v)}
        >
          <FocusOrbIcon size={20} interactive />
        </button>

        {!isCreateMode && isLoading ? (
          <>
            <div className="kd-left">
              <Skeleton className="h-10 w-3/4 mb-8" />
              <Skeleton className="h-5 w-full mb-4" />
            </div>
            <div className="kd-right">
              <div className="kd-right-header">
                <Skeleton className="h-6 w-full mb-3" />
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
            <div className={`kd-left${activeExternalDocUrl ? ' kd-left-iframe' : ' kd-left-content'}`}>
              {activeExternalDocUrl ? (
                <>
                  <iframe
                    key={iframeSrc}
                    src={iframeSrc}
                    title={activeTitle || '知识文档'}
                    className="kd-iframe"
                    allow="clipboard-read; clipboard-write"
                  />
                  {canUpdateKnowledge && (
                    <div className="kd-iframe-toolbar">
                      <button
                        type="button"
                        className={`kd-iframe-mode-btn${iframeEditMode ? ' is-active' : ''}`}
                        onClick={() => setIframeEditMode((v) => !v)}
                      >
                        {iframeEditMode ? '查看模式' : '编辑文档'}
                      </button>
                    </div>
                  )}
                </>
              ) : canUpdateKnowledge ? (
                <div className="kd-content-editor">
                  <StepsEditor
                    value={activeContent}
                    onChange={setEditContent}
                    onBlur={handleContentBlur}
                    placeholder="在这里填写知识内容…"
                    minHeight={280}
                  />
                </div>
              ) : activeContent ? (
                <div
                  className="kd-content-preview"
                  dangerouslySetInnerHTML={{ __html: sanitizeStepsHtml(activeContent) }}
                />
              ) : (
                <div className="kd-iframe-empty">暂无内容</div>
              )}
            </div>

            <KnowledgeDetailSidePanel
              knowledge={knowledge}
              activeTitle={activeTitle}
              activeContent={activeContent}
              activeExternalDocUrl={activeExternalDocUrl}
              showStepsInSidebar={Boolean(activeExternalDocUrl)}
              activeTags={activeTags}
              activeRelatedLinks={activeRelatedLinks}
              activeSpaceTagId={activeSpaceTagId}
              spaces={spaces}
              updatedRelativeTime={isCreateMode ? '新建' : relTime(knowledge.updated_at)}
              canUpdateKnowledge={canUpdateKnowledge}
              canDeleteKnowledge={canDeleteKnowledge}
              shouldShowSystemTagsSection={shouldShowSystemTagsSection}
              showTagInput={showTagInput}
              showSpaceTags={showSpaceTags}
              isCreateMode={isCreateMode}
              hasChanges={hasChanges}
              editingLinks={editingLinks}
              isSaving={isSaving}
              learningAction={learningAction}
              relatedLinksSectionRef={relatedLinksSectionRef}
              onTitleChange={setEditTitle}
              onTitleBlur={handleTitleBlur}
              onContentChange={setEditContent}
              onContentBlur={handleContentBlur}
              onExternalDocUrlChange={setEditExternalDocUrl}
              onExternalDocUrlBlur={handleExternalDocUrlBlur}
              onExternalDocUrlClear={handleExternalDocUrlClear}
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
              onDelete={() => {
                onDelete?.(knowledgeId!);
                onClose();
              }}
              onCancelEdit={handleCancelEditOrClose}
              onSave={() => { void handleSave(); }}
            />
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
