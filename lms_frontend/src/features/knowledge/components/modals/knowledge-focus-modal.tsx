import * as React from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import type { RelatedLink } from '@/types/knowledge';

import { useTags } from '@/features/tags/api/tags';
import { useKnowledgeModalInteractions } from '../../hooks/use-knowledge-modal-interactions';
import { useCreateKnowledge } from '../../api/manage-knowledge';
import { useParseDocument } from '../../api/parse-document';
import { showApiError } from '@/utils/error-handler';
import {
  hasMeaningfulKnowledgeHtml,
  textToKnowledgeHtml,
} from '../../utils/slash-shortcuts';
import { getKnowledgeTitleFromHtml } from '../../utils/content-utils';
import {
  createEmptyRelatedLink,
  sanitizeRelatedLinks,
} from '../../utils/related-links';
import { KnowledgeFocusShell } from './knowledge-focus-shell';
import { KnowledgeFocusMetadataBar } from './knowledge-focus-metadata-bar';

interface KnowledgeFocusModalProps {
  initialContent?: string;
  initialSpaceTagId?: number;
  onClose: () => void;
  onCreated?: (id: number) => void;
}

export const KnowledgeFocusModal: React.FC<KnowledgeFocusModalProps> = ({
  initialContent = '',
  initialSpaceTagId,
  onClose,
  onCreated,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [spaceTagId, setSpaceTagId] = React.useState<number | undefined>();
  const [selectedTags, setSelectedTags] = React.useState<{ id: number; name: string }[]>([]);
  const [content, setContent] = React.useState(initialContent);
  const [title, setTitle] = React.useState('');
  const [relatedLinks, setRelatedLinks] = React.useState<RelatedLink[]>([]);
  const [showTagPanel, setShowTagPanel] = React.useState(false);
  const [showRelatedLinksPanel, setShowRelatedLinksPanel] = React.useState(false);

  const { data: spaces = [] } = useTags({ tag_type: 'SPACE' });
  const createKnowledge = useCreateKnowledge();
  const parseDocument = useParseDocument();

  React.useEffect(() => {
    const normalizedInitialContent = initialContent.includes('<')
      ? initialContent
      : textToKnowledgeHtml(initialContent);

    setContent(normalizedInitialContent);
    setTitle(getKnowledgeTitleFromHtml(normalizedInitialContent));
    setRelatedLinks([]);
    setSelectedTags([]);
    setShowTagPanel(false);
    setShowRelatedLinksPanel(false);
    const hasPreferredSpaceTag = typeof initialSpaceTagId === 'number' && spaces.some((tag) => tag.id === initialSpaceTagId);
    setSpaceTagId(hasPreferredSpaceTag ? initialSpaceTagId : undefined);
  }, [initialContent, initialSpaceTagId, spaces]);

  const canSave = hasMeaningfulKnowledgeHtml(content);
  const isUploading = parseDocument.isPending;
  const canSubmit = canSave && !createKnowledge.isPending && !isUploading;
  const sanitizedRelatedLinks = React.useMemo(
    () => sanitizeRelatedLinks(relatedLinks),
    [relatedLinks],
  );

  const handleContentChange = React.useCallback((nextContent: string) => {
    setContent(nextContent);
    const derivedTitle = getKnowledgeTitleFromHtml(nextContent);
    if (derivedTitle) {
      setTitle(derivedTitle);
    }
  }, []);

  const handleFileUpload = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await parseDocument.mutateAsync(file);
      setContent(result.content);
      const derivedTitle = getKnowledgeTitleFromHtml(result.content);
      setTitle(derivedTitle || result.suggested_title?.trim() || '');
      toast.success('文档导入成功');
    } catch (error) {
      showApiError(error, '文档导入失败');
    } finally {
      e.target.value = '';
    }
  }, [parseDocument]);

  const handleSave = async () => {
    if (!canSave) return;
    try {
      const trimmedTitle = getKnowledgeTitleFromHtml(content) || title.trim();
      const result = await createKnowledge.mutateAsync({
        ...(trimmedTitle && { title: trimmedTitle }),
        space_tag_id: spaceTagId,
        content,
        related_links: sanitizedRelatedLinks.length > 0 ? sanitizedRelatedLinks : undefined,
        tag_ids: selectedTags.map((t) => t.id),
      });
      toast.success('知识创建成功');
      onClose();
      onCreated?.(result.id);
    } catch (error) {
      showApiError(error, '创建失败');
    }
  };

  useKnowledgeModalInteractions({
    onEscape: onClose,
    onSubmit: () => {
      void handleSave();
    },
  });

  const handleRelatedLinkChange = React.useCallback((
    index: number,
    field: keyof RelatedLink,
    value: string,
  ) => {
    setRelatedLinks((prev) => prev.map((item, itemIndex) => (
      itemIndex === index
        ? { ...item, [field]: value }
        : item
    )));
  }, []);

  const handleAddRelatedLink = React.useCallback(() => {
    setRelatedLinks((prev) => [...prev, createEmptyRelatedLink()]);
  }, []);

  const handleRemoveRelatedLink = React.useCallback((index: number) => {
    setRelatedLinks((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }, []);

  const modalContent = (
    <KnowledgeFocusShell
      content={content}
      onContentChange={handleContentChange}
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
        spaceTagId={spaceTagId}
        onSpaceTagChange={(nextSpaceTagId) => setSpaceTagId(nextSpaceTagId)}
        selectedTags={selectedTags}
        onAddTag={(tag) => setSelectedTags((prev) => (
          prev.some((item) => item.id === tag.id) ? prev : [...prev, tag]
        ))}
        onRemoveTag={(id) => setSelectedTags((prev) => prev.filter((tag) => tag.id !== id))}
        title={title}
        onTitleChange={setTitle}
        relatedLinks={relatedLinks}
        onRelatedLinkChange={handleRelatedLinkChange}
        onAddRelatedLink={handleAddRelatedLink}
        onRemoveRelatedLink={handleRemoveRelatedLink}
        showTagPanel={showTagPanel}
        onShowTagPanelChange={setShowTagPanel}
        showRelatedLinksPanel={showRelatedLinksPanel}
        onShowRelatedLinksPanelChange={setShowRelatedLinksPanel}
        onSave={handleSave}
        saveDisabled={!canSubmit}
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
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              disabled={isUploading}
            />
          </>
        )}
      />

      <style>{`
        .akm-upload-btn {
          height: 34px;
          border: none;
          border-radius: 999px;
          padding: 0 14px;
          font-size: 12px;
          cursor: pointer;
          background: rgba(255,255,255,0.82);
          color: #5b6574;
          font-family: inherit;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .akm-upload-btn:hover {
          background: rgba(255,255,255,0.96);
          color: #374151;
        }
        .akm-upload-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </KnowledgeFocusShell>
  );

  return createPortal(modalContent, document.body);
};
