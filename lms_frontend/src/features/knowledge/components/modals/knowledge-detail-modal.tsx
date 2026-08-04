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
import type { KnowledgeDetail as KnowledgeDetailType, RelatedLink } from '@/types/knowledge';
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
  startEditing = false,
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

  const [editingMeta, setEditingMeta] = useState(isCreateMode || startEditing);
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

  const hasMetaChanges = isCreateMode || Boolean(knowledge && (
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

  const addTag = useCallback((tag: { id: number; name: string }) => {
    const current = editTags ?? knowledge?.tags ?? [];
    if (current.some((t) => t.id === tag.id)) return;
    setEditTags([...current, tag]);
  }, [editTags, knowledge?.tags]);

  const removeTag = useCallback((tagId: number) => {
    const current = editTags ?? knowledge?.tags ?? [];
    setEditTags(current.filter((t) => t.id !== tagId));
  }, [editTags, knowledge?.tags]);

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
    updateRelatedLinksDraft((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }, [updateRelatedLinksDraft]);

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
    const draftError = getRelatedLinksDraftError(editRelatedLinks);
    if (draftError) {
      toast.error(draftError);
      return;
    }
    setEditingLinks(false);
  }, [editRelatedLinks]);

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

  const handleSave = useCallback(async () => {
    if (!hasMetaChanges || !knowledge) return false;
    const draftError = editRelatedLinks ? getRelatedLinksDraftError(editRelatedLinks) : null;
    if (draftError) {
      toast.error(draftError);
      return false;
    }
    const nextDocUrl = (editExternalDocUrl ?? knowledge.external_doc_url ?? '').trim();
    try {
      const updatedKnowledge = await updateKnowledge.mutateAsync({
        id: knowledgeId!,
        data: {
          title: editTitle ?? knowledge.title,
          content: sanitizeStepsHtml(editContent ?? knowledge.content),
          external_doc_url: nextDocUrl,
          ...(editTags !== undefined && { tag_ids: editTags.map((t) => t.id) }),
          ...(editSpaceTagId !== undefined && { space_tag_id: editSpaceTagId ?? undefined }),
          ...(editRelatedLinks !== undefined && {
            related_links: sanitizeRelatedLinks(editRelatedLinks),
          }),
        },
      });
      applyKnowledgeSnapshot(updatedKnowledge);
      toast.success('已保存');
      setEditingMeta(false);
      setEditContent(undefined);
      setEditTitle(undefined);
      setEditExternalDocUrl(undefined);
      setEditTags(undefined);
      setEditSpaceTagId(undefined);
      setEditRelatedLinks(undefined);
      onUpdated?.();
      return true;
    } catch (error) {
      showApiError(error, '保存失败');
      return false;
    }
  }, [
    applyKnowledgeSnapshot,
    editContent,
    editExternalDocUrl,
    editRelatedLinks,
    editSpaceTagId,
    editTags,
    editTitle,
    hasMetaChanges,
    knowledge,
    knowledgeId,
    onUpdated,
    updateKnowledge,
  ]);

  const handleLeftContentBlur = useCallback(async () => {
    if (!canUpdateKnowledge || !knowledge || !knowledgeId) return;
    if (editContent === undefined || editContent === knowledge.content) return;
    try {
      const updatedKnowledge = await updateKnowledge.mutateAsync({
        id: knowledgeId,
        data: { content: sanitizeStepsHtml(editContent) },
      });
      applyKnowledgeSnapshot(updatedKnowledge);
      setEditContent(undefined);
      onUpdated?.();
    } catch (error) {
      showApiError(error, '保存失败');
    }
  }, [applyKnowledgeSnapshot, canUpdateKnowledge, editContent, knowledge, knowledgeId, onUpdated, updateKnowledge]);

  const handleCancelEdit = useCallback(() => {
    setEditingMeta(false);
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

  useKnowledgeModalInteractions({
    onEscape: () => {
      if (showSpaceTags) {
        setShowSpaceTags(false);
      } else if (isFocusMode) {
        setIsFocusMode(false);
      } else if (editingMeta && !isCreateMode) {
        handleCancelEdit();
      } else {
        onClose();
      }
    },
    onSubmit: () => {
      if (isCreateMode) {
        void handleCreateSave();
        return;
      }
      if (editingMeta) {
        void handleSave();
      }
    },
  });

  const handleSpaceTagSelect = useCallback(async (nextSpaceTagId: number) => {
    setShowSpaceTags(false);
    if (activeSpaceTagId === nextSpaceTagId) return;
    if (editingMeta) {
      setEditSpaceTagId(nextSpaceTagId);
      return;
    }
    try {
      const updatedKnowledge = await updateKnowledge.mutateAsync({
        id: knowledgeId!,
        data: { space_tag_id: nextSpaceTagId },
      });
      applyKnowledgeSnapshot(updatedKnowledge);
      toast.success('空间已更新');
      onUpdated?.();
    } catch (error) {
      showApiError(error, '空间更新失败');
    }
  }, [activeSpaceTagId, applyKnowledgeSnapshot, editingMeta, knowledgeId, onUpdated, updateKnowledge]);

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
          <div className="kd-left" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#aaa', fontSize: 15, fontStyle: 'italic' }}>知识文档不存在</p>
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
                    onBlur={isCreateMode ? undefined : handleLeftContentBlur}
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
              editingMeta={editingMeta}
              hasMetaChanges={hasMetaChanges}
              editingLinks={editingLinks}
              isSaving={isSaving}
              learningAction={learningAction}
              relatedLinksSectionRef={relatedLinksSectionRef}
              onTitleChange={setEditTitle}
              onContentChange={setEditContent}
              onExternalDocUrlChange={setEditExternalDocUrl}
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
              onStartEditingMeta={() => setEditingMeta(true)}
              onDelete={() => {
                onDelete?.(knowledgeId!);
                onClose();
              }}
              onCancelEdit={handleCancelEditOrClose}
              onSave={() => { void (isCreateMode ? handleCreateSave() : handleSave()); }}
            />
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
