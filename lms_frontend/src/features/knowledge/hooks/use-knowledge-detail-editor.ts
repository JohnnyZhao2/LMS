import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react';
import { toast } from 'sonner';

import { sanitizeStepsHtml } from '@/lib/knowledge-content';
import type { SimpleTag } from '@/types/common';
import type {
  KnowledgeDetail as KnowledgeDetailType,
  KnowledgeExtraField,
  KnowledgeWriteRequest,
  RelatedLink,
} from '@/types/knowledge';
import { showApiError } from '@/utils/error-handler';
import {
  useCreateKnowledge,
  useKnowledgeDetail,
  useUpdateKnowledge,
} from '../api/knowledge';
import {
  EMPTY_RELATED_LINK,
  getRelatedLinksDraftError,
  hasSameRelatedLinks,
  sanitizeRelatedLinks,
} from '../utils/related-links';

type KnowledgeDraft = {
  title?: string;
  section?: string;
  summary?: string;
  content?: string;
  extraFields?: KnowledgeExtraField[];
  externalDocUrl?: string;
  tags?: SimpleTag[];
  spaceTagId?: number | null;
  relatedLinks?: RelatedLink[];
};

function sanitizeExtraFields(fields: KnowledgeExtraField[]): KnowledgeExtraField[] {
  return fields
    .map((item) => ({ label: item.label.trim(), value: item.value.trim() }))
    .filter((item) => item.label && item.value);
}

function hasSameExtraFields(left: KnowledgeExtraField[], right: KnowledgeExtraField[]) {
  const a = sanitizeExtraFields(left);
  const b = sanitizeExtraFields(right);
  return a.length === b.length && a.every((item, idx) => item.label === b[idx]?.label && item.value === b[idx]?.value);
}

function hasSameTagIds(left: { id: number }[], right: { id: number }[]) {
  return left.length === right.length && left.every((tag, index) => tag.id === right[index]?.id);
}

export interface UseKnowledgeDetailEditorOptions {
  knowledgeId?: number;
  taskKnowledgeId?: number;
  initialTitle?: string;
  initialContent?: string;
  initialExternalDocUrl?: string;
  initialSpaceTagId?: number;
  spaces: SimpleTag[];
  relatedLinksSectionRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onCreated?: (id: number) => void;
}

export function useKnowledgeDetailEditor({
  knowledgeId,
  taskKnowledgeId,
  initialTitle = '',
  initialContent = '',
  initialExternalDocUrl = '',
  initialSpaceTagId,
  spaces,
  relatedLinksSectionRef,
  onClose,
  onCreated,
}: UseKnowledgeDetailEditorOptions) {
  const isCreateMode = typeof knowledgeId !== 'number';
  const { data, isLoading } = useKnowledgeDetail({ knowledgeId, taskKnowledgeId });
  const createKnowledge = useCreateKnowledge();
  const updateKnowledge = useUpdateKnowledge();
  const knowledgeFromQuery = data as KnowledgeDetailType | undefined;

  const [draft, setDraft] = useState<KnowledgeDraft>(() => (
    isCreateMode
      ? {
          title: initialTitle,
          content: initialContent,
          externalDocUrl: initialExternalDocUrl,
        }
      : {}
  ));
  const [editingLinks, setEditingLinks] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [showSpaceTags, setShowSpaceTags] = useState(false);

  const setDraftField = useCallback(<K extends keyof KnowledgeDraft>(
    key: K,
    value: KnowledgeDraft[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearDraftKey = useCallback(<K extends keyof KnowledgeDraft>(
    key: K,
    shouldClear?: (current: KnowledgeDraft[K]) => boolean,
  ) => {
    setDraft((prev) => {
      if (!(key in prev)) return prev;
      if (shouldClear && !shouldClear(prev[key])) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const validInitialSpaceTagId = useMemo(() => (
    typeof initialSpaceTagId === 'number' && spaces.some((tag) => tag.id === initialSpaceTagId)
      ? initialSpaceTagId
      : null
  ), [initialSpaceTagId, spaces]);

  const knowledge = useMemo(() => {
    if (!isCreateMode) return knowledgeFromQuery;
    const preferredSpaceId = draft.spaceTagId === undefined ? validInitialSpaceTagId : draft.spaceTagId;
    const spaceTag = typeof preferredSpaceId === 'number'
      ? spaces.find((tag) => tag.id === preferredSpaceId)
      : undefined;
    return {
      id: 0,
      title: initialTitle,
      section: '',
      summary: '',
      content: initialContent,
      extra_fields: [],
      external_doc_url: initialExternalDocUrl,
      tags: [],
      related_links: [],
      space_tag: spaceTag ? { id: spaceTag.id, name: spaceTag.name } : null,
      view_count: 0,
      created_at: '',
      updated_at: '',
    } satisfies KnowledgeDetailType;
  }, [
    draft.spaceTagId,
    initialContent,
    initialExternalDocUrl,
    initialTitle,
    isCreateMode,
    knowledgeFromQuery,
    spaces,
    validInitialSpaceTagId,
  ]);

  const activeContent = draft.content ?? knowledge?.content ?? '';
  const activeTitle = draft.title ?? knowledge?.title ?? '';
  const activeSection = draft.section ?? knowledge?.section ?? '';
  const activeSummary = draft.summary ?? knowledge?.summary ?? '';
  const activeExtraFields = useMemo(
    () => draft.extraFields ?? knowledge?.extra_fields ?? [],
    [draft.extraFields, knowledge?.extra_fields],
  );
  const activeExternalDocUrl = draft.externalDocUrl ?? knowledge?.external_doc_url ?? '';
  const activeTags = useMemo(
    () => draft.tags ?? knowledge?.tags ?? [],
    [draft.tags, knowledge?.tags],
  );
  const activeSpaceTagId = isCreateMode
    ? (draft.spaceTagId === undefined ? validInitialSpaceTagId : draft.spaceTagId)
    : (draft.spaceTagId === undefined ? knowledge?.space_tag?.id ?? null : draft.spaceTagId);
  const activeRelatedLinks = useMemo(
    () => draft.relatedLinks ?? knowledge?.related_links ?? [],
    [draft.relatedLinks, knowledge?.related_links],
  );

  const hasChanges = isCreateMode || Boolean(knowledge && (
    (draft.content !== undefined && draft.content !== knowledge.content)
    || (draft.title !== undefined && draft.title !== knowledge.title)
    || (draft.section !== undefined && draft.section !== (knowledge.section ?? ''))
    || (draft.summary !== undefined && draft.summary !== (knowledge.summary ?? ''))
    || (draft.extraFields !== undefined && !hasSameExtraFields(draft.extraFields, knowledge.extra_fields ?? []))
    || (draft.externalDocUrl !== undefined && draft.externalDocUrl !== knowledge.external_doc_url)
    || draft.tags !== undefined
    || draft.spaceTagId !== undefined
    || draft.relatedLinks !== undefined
  ));

  const isSaving = isCreateMode ? createKnowledge.isPending : updateKnowledge.isPending;

  const commitPatch = useCallback(async (
    payload: KnowledgeWriteRequest,
    errorMessage: string,
    onSuccess?: () => void,
  ) => {
    if (isCreateMode || !knowledgeId) return null;
    try {
      const updated = await updateKnowledge.mutateAsync({ id: knowledgeId, data: payload });
      onSuccess?.();
      return updated;
    } catch (error) {
      showApiError(error, errorMessage);
      return null;
    }
  }, [isCreateMode, knowledgeId, updateKnowledge]);

  const clearLocalEdits = useCallback(() => {
    setDraft({});
    setEditingLinks(false);
    setShowTagInput(false);
    setShowSpaceTags(false);
  }, []);

  useEffect(() => {
    if (isCreateMode) return;
    clearLocalEdits();
  }, [clearLocalEdits, isCreateMode, knowledgeId, taskKnowledgeId]);

  const handleCreateSave = useCallback(async () => {
    if (createKnowledge.isPending) return;
    const draftError = getRelatedLinksDraftError(activeRelatedLinks);
    if (draftError) {
      toast.error(draftError);
      return;
    }
    try {
      const sanitizedLinks = sanitizeRelatedLinks(activeRelatedLinks);
      const sanitizedExtras = sanitizeExtraFields(activeExtraFields);
      const result = await createKnowledge.mutateAsync({
        ...(activeTitle.trim() && { title: activeTitle.trim() }),
        ...(activeSection.trim() && { section: activeSection.trim() }),
        ...(activeSummary.trim() && { summary: activeSummary.trim() }),
        ...(typeof activeSpaceTagId === 'number' && { space_tag_id: activeSpaceTagId }),
        content: sanitizeStepsHtml(activeContent),
        ...(sanitizedExtras.length > 0 && { extra_fields: sanitizedExtras }),
        ...(activeExternalDocUrl.trim() && { external_doc_url: activeExternalDocUrl.trim() }),
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
    activeExtraFields,
    activeRelatedLinks,
    activeSection,
    activeSummary,
    activeSpaceTagId,
    activeTags,
    activeTitle,
    createKnowledge,
    onClose,
    onCreated,
  ]);

  const save = useCallback(async () => {
    if (isCreateMode) {
      await handleCreateSave();
      return true;
    }
    if (!hasChanges || !knowledge) return false;
    const draftError = draft.relatedLinks ? getRelatedLinksDraftError(draft.relatedLinks) : null;
    if (draftError) {
      toast.error(draftError);
      return false;
    }
    const nextDocUrl = (draft.externalDocUrl ?? knowledge.external_doc_url ?? '').trim();
    const updated = await commitPatch(
      {
        title: draft.title ?? knowledge.title,
        section: (draft.section ?? knowledge.section ?? '').trim(),
        summary: (draft.summary ?? knowledge.summary ?? '').trim(),
        content: sanitizeStepsHtml(draft.content ?? knowledge.content),
        ...(draft.extraFields !== undefined && {
          extra_fields: sanitizeExtraFields(draft.extraFields),
        }),
        external_doc_url: nextDocUrl,
        ...(draft.tags !== undefined && { tag_ids: draft.tags.map((t) => t.id) }),
        ...(draft.spaceTagId !== undefined && { space_tag_id: draft.spaceTagId ?? null }),
        ...(draft.relatedLinks !== undefined && {
          related_links: sanitizeRelatedLinks(draft.relatedLinks),
        }),
      },
      '保存失败',
      clearLocalEdits,
    );
    return Boolean(updated);
  }, [clearLocalEdits, commitPatch, draft, handleCreateSave, hasChanges, isCreateMode, knowledge]);

  const commitFieldPatch = useCallback(<K extends keyof KnowledgeDraft>(
    key: K,
    payload: KnowledgeWriteRequest,
    errorMessage: string,
    shouldClear?: (current: KnowledgeDraft[K]) => boolean,
  ) => commitPatch(payload, errorMessage, () => clearDraftKey(key, shouldClear)), [
    clearDraftKey,
    commitPatch,
  ]);

  const blurTitle = useCallback(() => {
    if (isCreateMode || !knowledge || draft.title === undefined || draft.title === knowledge.title) {
      return;
    }
    const nextTitle = draft.title;
    void commitFieldPatch('title', { title: nextTitle }, '标题保存失败', (cur) => cur === nextTitle);
  }, [commitFieldPatch, draft.title, isCreateMode, knowledge]);

  const toggleSectionTag = useCallback((tagName: string) => {
    const normalized = tagName.trim();
    if (!normalized) return;
    const nextSection = activeSection.trim() === normalized ? '' : normalized;
    setDraftField('section', nextSection);
    if (isCreateMode) return;
    void commitFieldPatch(
      'section',
      { section: nextSection },
      '分组保存失败',
      (cur) => cur !== undefined && cur.trim() === nextSection,
    ).then((updated) => {
      if (updated) {
        toast.success(nextSection ? `已设「${nextSection}」为卡片分组` : '已取消卡片分组');
      }
    });
  }, [activeSection, commitFieldPatch, isCreateMode, setDraftField]);

  const blurSummary = useCallback(() => {
    if (isCreateMode || !knowledge || draft.summary === undefined) return;
    const nextSummary = draft.summary.trim();
    if (nextSummary === (knowledge.summary ?? '')) {
      clearDraftKey('summary');
      return;
    }
    void commitFieldPatch(
      'summary',
      { summary: nextSummary },
      '适用场景保存失败',
      (cur) => cur !== undefined && cur.trim() === nextSummary,
    );
  }, [clearDraftKey, commitFieldPatch, draft.summary, isCreateMode, knowledge]);

  const blurSection = useCallback(() => {
    if (isCreateMode || !knowledge || draft.section === undefined) return;
    const nextSection = draft.section.trim();
    if (nextSection === (knowledge.section ?? '')) {
      clearDraftKey('section');
      return;
    }
    void commitFieldPatch(
      'section',
      { section: nextSection },
      '分组保存失败',
      (cur) => cur !== undefined && cur.trim() === nextSection,
    );
  }, [clearDraftKey, commitFieldPatch, draft.section, isCreateMode, knowledge]);

  const changeExtraField = useCallback((index: number, field: keyof KnowledgeExtraField, value: string) => {
    setDraftField(
      'extraFields',
      activeExtraFields.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    );
  }, [activeExtraFields, setDraftField]);

  const addExtraField = useCallback(() => {
    setDraftField('extraFields', [...activeExtraFields, { label: '', value: '' }]);
  }, [activeExtraFields, setDraftField]);

  const removeExtraField = useCallback((index: number) => {
    const nextFields = activeExtraFields.filter((_, idx) => idx !== index);
    setDraftField('extraFields', nextFields);
    if (isCreateMode) return;
    void commitFieldPatch(
      'extraFields',
      { extra_fields: sanitizeExtraFields(nextFields) },
      '扩展属性保存失败',
      (cur) => Boolean(cur && hasSameExtraFields(cur, nextFields)),
    );
  }, [activeExtraFields, commitFieldPatch, isCreateMode, setDraftField]);

  const blurExtraFields = useCallback(() => {
    if (isCreateMode || !knowledge || draft.extraFields === undefined) return;
    const nextFields = draft.extraFields;
    if (hasSameExtraFields(nextFields, knowledge.extra_fields ?? [])) {
      clearDraftKey('extraFields');
      return;
    }
    void commitFieldPatch(
      'extraFields',
      { extra_fields: sanitizeExtraFields(nextFields) },
      '扩展属性保存失败',
      (cur) => Boolean(cur && hasSameExtraFields(cur, nextFields)),
    );
  }, [clearDraftKey, commitFieldPatch, draft.extraFields, isCreateMode, knowledge]);

  const blurExternalDocUrl = useCallback(() => {
    if (isCreateMode || !knowledge || draft.externalDocUrl === undefined) return;
    const nextDocUrl = draft.externalDocUrl.trim();
    if (nextDocUrl === (knowledge.external_doc_url ?? '')) {
      clearDraftKey('externalDocUrl');
      return;
    }
    void commitFieldPatch(
      'externalDocUrl',
      { external_doc_url: nextDocUrl },
      '文档链接保存失败',
      (cur) => cur !== undefined && cur.trim() === nextDocUrl,
    );
  }, [clearDraftKey, commitFieldPatch, draft.externalDocUrl, isCreateMode, knowledge]);

  const clearExternalDocUrl = useCallback(() => {
    if (isCreateMode || !knowledge || !(knowledge.external_doc_url ?? '').trim()) {
      clearDraftKey('externalDocUrl');
      return;
    }
    setDraftField('externalDocUrl', '');
    void commitFieldPatch(
      'externalDocUrl',
      { external_doc_url: '' },
      '文档链接保存失败',
      (cur) => cur === '',
    );
  }, [clearDraftKey, commitFieldPatch, isCreateMode, knowledge, setDraftField]);

  const blurContent = useCallback(() => {
    if (isCreateMode || !knowledge || draft.content === undefined) return;
    const nextContent = sanitizeStepsHtml(draft.content);
    if (nextContent === knowledge.content) {
      clearDraftKey('content');
      return;
    }
    void commitFieldPatch(
      'content',
      { content: nextContent },
      '内容保存失败',
      (cur) => cur !== undefined && sanitizeStepsHtml(cur) === nextContent,
    );
  }, [clearDraftKey, commitFieldPatch, draft.content, isCreateMode, knowledge]);

  const patchTags = useCallback((nextTags: SimpleTag[]) => {
    setDraftField('tags', nextTags);
    if (isCreateMode) return;
    void commitFieldPatch(
      'tags',
      { tag_ids: nextTags.map((item) => item.id) },
      '标签保存失败',
      (cur) => Boolean(cur && hasSameTagIds(cur, nextTags)),
    );
  }, [commitFieldPatch, isCreateMode, setDraftField]);

  const addTag = useCallback((tag: { id: number; name: string; category?: string }) => {
    if (activeTags.some((t) => t.id === tag.id)) return;
    patchTags([...activeTags, tag]);
  }, [activeTags, patchTags]);

  const removeTag = useCallback((tagId: number) => {
    const removed = activeTags.find((t) => t.id === tagId);
    const nextTags = activeTags.filter((t) => t.id !== tagId);
    const shouldClearSection = Boolean(
      removed?.name && activeSection.trim() && removed.name.trim() === activeSection.trim(),
    );
    setDraftField('tags', nextTags);
    if (shouldClearSection) {
      setDraftField('section', '');
    }
    if (isCreateMode) return;
    void commitPatch(
      {
        tag_ids: nextTags.map((item) => item.id),
        ...(shouldClearSection && { section: '' }),
      },
      '标签保存失败',
      () => {
        clearDraftKey('tags', (cur) => Boolean(cur && hasSameTagIds(cur, nextTags)));
        if (shouldClearSection) {
          clearDraftKey('section', (cur) => cur === '');
        }
      },
    );
  }, [activeSection, activeTags, clearDraftKey, commitPatch, isCreateMode, setDraftField]);

  const updateRelatedLinksDraft = useCallback((
    updater: (current: RelatedLink[]) => RelatedLink[],
  ) => {
    const nextLinks = updater(activeRelatedLinks);
    setDraftField('relatedLinks', nextLinks);
    return nextLinks;
  }, [activeRelatedLinks, setDraftField]);

  const changeRelatedLink = useCallback((
    index: number,
    field: keyof RelatedLink,
    value: string,
  ) => {
    updateRelatedLinksDraft((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  }, [updateRelatedLinksDraft]);

  const addRelatedLink = useCallback(() => {
    updateRelatedLinksDraft((current) => [...current, { ...EMPTY_RELATED_LINK }]);
  }, [updateRelatedLinksDraft]);

  const removeRelatedLink = useCallback((index: number) => {
    const nextLinks = updateRelatedLinksDraft((current) => current.filter((_, itemIndex) => itemIndex !== index));
    if (isCreateMode) return;
    void commitFieldPatch(
      'relatedLinks',
      { related_links: sanitizeRelatedLinks(nextLinks) },
      '相关链接保存失败',
      (cur) => Boolean(cur && hasSameRelatedLinks(cur, nextLinks)),
    );
  }, [commitFieldPatch, isCreateMode, updateRelatedLinksDraft]);

  const openRelatedLinksEditor = useCallback((appendEmpty = false) => {
    setEditingLinks(true);
    if (!appendEmpty) return;
    setDraft((prev) => ({
      ...prev,
      relatedLinks: [...(prev.relatedLinks ?? knowledge?.related_links ?? []), { ...EMPTY_RELATED_LINK }],
    }));
  }, [knowledge?.related_links]);

  const blurRelatedLinks = useCallback(() => {
    if (draft.relatedLinks === undefined) {
      setEditingLinks(false);
      return;
    }
    const nextLinks = draft.relatedLinks;
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
      clearDraftKey('relatedLinks');
      setEditingLinks(false);
      return;
    }
    setEditingLinks(false);
    void commitFieldPatch('relatedLinks', { related_links: sanitizeRelatedLinks(nextLinks) }, '相关链接保存失败');
  }, [clearDraftKey, commitFieldPatch, draft.relatedLinks, isCreateMode, knowledge]);

  useEffect(() => {
    if (!editingLinks) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && relatedLinksSectionRef.current?.contains(target)) return;
      blurRelatedLinks();
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [editingLinks, blurRelatedLinks, relatedLinksSectionRef]);

  const selectSpaceTag = useCallback(async (nextSpaceTagId: number | null) => {
    setShowSpaceTags(false);
    if (activeSpaceTagId === nextSpaceTagId) return;
    if (isCreateMode) {
      setDraftField('spaceTagId', nextSpaceTagId);
      return;
    }
    const updated = await commitFieldPatch('spaceTagId', { space_tag_id: nextSpaceTagId }, '空间更新失败');
    if (updated) toast.success('空间已更新');
  }, [activeSpaceTagId, commitFieldPatch, isCreateMode, setDraftField]);

  const cancelOrClose = useCallback(() => {
    if (isCreateMode) {
      onClose();
      return;
    }
    clearLocalEdits();
  }, [clearLocalEdits, isCreateMode, onClose]);

  return {
    isCreateMode,
    isLoading,
    knowledge,
    isSaving,
    hasChanges,
    activeTitle,
    activeSection,
    activeSummary,
    activeContent,
    activeExtraFields,
    activeExternalDocUrl,
    activeTags,
    activeSpaceTagId,
    activeRelatedLinks,
    editingLinks,
    showTagInput,
    setShowTagInput,
    showSpaceTags,
    toggleSpaceTags: useCallback(() => setShowSpaceTags((v) => !v), []),
    closeSpaceTags: useCallback(() => setShowSpaceTags(false), []),
    setTitle: useCallback((v: string) => setDraftField('title', v), [setDraftField]),
    blurTitle,
    setSection: useCallback((v: string) => setDraftField('section', v), [setDraftField]),
    blurSection,
    toggleSectionTag,
    setSummary: useCallback((v: string) => setDraftField('summary', v), [setDraftField]),
    blurSummary,
    setContent: useCallback((v: string) => setDraftField('content', v), [setDraftField]),
    blurContent,
    addExtraField,
    changeExtraField,
    removeExtraField,
    blurExtraFields,
    setExternalDocUrl: useCallback((v: string) => setDraftField('externalDocUrl', v), [setDraftField]),
    blurExternalDocUrl,
    clearExternalDocUrl,
    addTag,
    removeTag,
    openRelatedLinksEditor,
    addRelatedLink,
    changeRelatedLink,
    blurRelatedLinks,
    removeRelatedLink,
    selectSpaceTag,
    save,
    cancelEdit: clearLocalEdits,
    cancelOrClose,
  };
}

export type KnowledgeDetailEditor = ReturnType<typeof useKnowledgeDetailEditor>;
