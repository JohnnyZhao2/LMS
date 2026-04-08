import * as React from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Upload, Plus, X } from 'lucide-react';
import type { Tag as TagType } from '@/types/api';
import type { RelatedLink } from '@/types/knowledge';

import { useSpaceTypeTags } from '../../api/get-tags';
import { useCreateKnowledge } from '../../api/manage-knowledge';
import { useParseDocument } from '../../api/parse-document';
import { showApiError } from '@/utils/error-handler';
import { TagInput } from '../shared/tag-input';
import {
  hasMeaningfulKnowledgeHtml,
  textToKnowledgeHtml,
} from '../../utils/slash-shortcuts';
import { getKnowledgeTitleFromHtml } from '../../utils/content-utils';
import { KnowledgeDetailModal } from './knowledge-detail-modal';
import { KnowledgeFocusShell } from './knowledge-focus-shell';

type KnowledgeFocusMode = 'create' | 'detail';

interface KnowledgeFocusModalProps {
  mode: KnowledgeFocusMode;
  knowledgeId?: number;
  initialContent?: string;
  initialSpaceTagId?: number;
  closeOnExitFocus?: boolean;
  taskId?: number;
  taskKnowledgeId?: number;
  onClose: () => void;
  onDelete?: (id: number) => void;
  onCreated?: (id: number) => void;
  onUpdated?: () => void;
}

const createEmptyRelatedLink = (): RelatedLink => ({
  title: '',
  url: '',
});

const CreateKnowledgeFocus: React.FC<{
  initialContent?: string;
  initialSpaceTagId?: number;
  onClose: () => void;
  onCreated?: (id: number) => void;
}> = ({
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

  const { data: spaceTypeTags = [] } = useSpaceTypeTags();
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
    const hasPreferredSpaceTag = typeof initialSpaceTagId === 'number' && spaceTypeTags.some((tag) => tag.id === initialSpaceTagId);
    setSpaceTagId(hasPreferredSpaceTag ? initialSpaceTagId : undefined);
  }, [initialContent, initialSpaceTagId, spaceTypeTags]);

  React.useEffect(() => {
    const htmlStyle = document.documentElement.style;
    const bodyStyle = document.body.style;
    const previousHtmlOverflow = htmlStyle.overflow;
    const previousBodyOverflow = bodyStyle.overflow;
    const previousHtmlOverscrollBehavior = htmlStyle.overscrollBehavior;
    const previousBodyOverscrollBehavior = bodyStyle.overscrollBehavior;
    const previousHtmlScrollbarGutter = htmlStyle.scrollbarGutter;
    const previousBodyScrollbarGutter = bodyStyle.scrollbarGutter;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        void handleSave();
      }
    };

    window.addEventListener('keydown', handler);
    htmlStyle.overflow = 'hidden';
    bodyStyle.overflow = 'hidden';
    htmlStyle.overscrollBehavior = 'none';
    bodyStyle.overscrollBehavior = 'none';
    htmlStyle.scrollbarGutter = 'stable';
    bodyStyle.scrollbarGutter = 'stable';

    return () => {
      window.removeEventListener('keydown', handler);
      htmlStyle.overflow = previousHtmlOverflow;
      bodyStyle.overflow = previousBodyOverflow;
      htmlStyle.overscrollBehavior = previousHtmlOverscrollBehavior;
      bodyStyle.overscrollBehavior = previousBodyOverscrollBehavior;
      htmlStyle.scrollbarGutter = previousHtmlScrollbarGutter;
      bodyStyle.scrollbarGutter = previousBodyScrollbarGutter;
    };
  }, [onClose, content, title, spaceTagId, selectedTags]);

  const canSave = hasMeaningfulKnowledgeHtml(content);
  const isUploading = parseDocument.isPending;
  const canSubmit = canSave && !createKnowledge.isPending && !isUploading;
  const keepBottomToolsVisible = showTagPanel || showRelatedLinksPanel;
  const sanitizedRelatedLinks = React.useMemo(
    () => relatedLinks.filter((item) => item.url.trim()),
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
      {showTagPanel && (
        <div className="akm-tag-panel">
          <TagInput
            applicableTo="knowledge"
            selectedTags={selectedTags}
            onAdd={(tag) => setSelectedTags((prev) => (
              prev.some((item) => item.id === tag.id) ? prev : [...prev, tag]
            ))}
            onRemove={(id) => setSelectedTags((prev) => prev.filter((t) => t.id !== id))}
          />
        </div>
      )}

      <div className="akm-bottom-bar">
        <div className={`akm-bottom-tools-zone${keepBottomToolsVisible ? ' akm-bottom-tools-zone-open' : ''}`}>
          <div className="akm-bottom-tools-trigger" aria-hidden="true" />

          <div className="akm-bottom-tools">
            <select
              value={spaceTagId ?? ''}
              onChange={(e) => setSpaceTagId(e.target.value ? Number(e.target.value) : undefined)}
              className="akm-select"
            >
              <option value="">space</option>
              {spaceTypeTags.map((tag: TagType) => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowTagPanel((v) => !v)}
              className={`akm-tool-btn ${showTagPanel ? ' akm-tool-btn-active' : ''}`}
            >
              标签{selectedTags.length > 0 && ` (${selectedTags.length})`}
            </button>

            <div className="akm-links-anchor">
              <button
                type="button"
                onClick={() => setShowRelatedLinksPanel((v) => !v)}
                className={`akm-tool-btn ${showRelatedLinksPanel ? ' akm-tool-btn-active' : ''}`}
              >
                相关链接{sanitizedRelatedLinks.length > 0 && ` (${sanitizedRelatedLinks.length})`}
              </button>

              {showRelatedLinksPanel && (
                <div className="akm-links-panel">
                  <div className="akm-links-panel-header">
                    <div>
                      <p className="akm-links-panel-title">相关链接</p>
                      <p className="akm-links-panel-subtitle">标题可选，URL 必填</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddRelatedLink}
                      className="akm-links-add-btn"
                      aria-label="添加相关链接"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {relatedLinks.length > 0 && (
                    <div className="akm-links-list">
                      {relatedLinks.map((item, index) => (
                        <div key={`create-link-${index}`} className="akm-link-row">
                          <input
                            value={item.title ?? ''}
                            onChange={(e) => handleRelatedLinkChange(index, 'title', e.target.value)}
                            placeholder=""
                            aria-label="链接标题"
                            className="akm-link-row-input akm-link-row-title"
                          />
                          <input
                            value={item.url}
                            onChange={(e) => handleRelatedLinkChange(index, 'url', e.target.value)}
                            placeholder=""
                            aria-label="链接地址"
                            className="akm-link-row-input akm-link-row-url"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveRelatedLink(index)}
                            className="akm-link-row-remove"
                            aria-label="删除相关链接"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="标题（可选）"
              className="akm-title-input"
            />

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
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!canSubmit}
          className="akm-save-btn"
        >
          {createKnowledge.isPending ? '保存中…' : '保存'}
        </button>
      </div>

      <style>{`
        .akm-tag-panel {
          position: absolute;
          bottom: 56px;
          left: 22px;
          width: 340px;
          background: rgba(255,255,255,0.45);
          backdrop-filter: blur(20px);
          border-radius: 16px;
          padding: 16px 18px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
          border: 1px solid rgba(255,255,255,0.5);
          z-index: 10;
          animation: akmSlideUp .15s ease;
        }
        .akm-links-anchor {
          position: relative;
          display: flex;
          align-items: center;
        }
        .akm-links-panel {
          position: absolute;
          left: 0;
          bottom: calc(100% + 14px);
          width: min(440px, calc(100vw - 56px));
          background: rgba(255,255,255,0.42);
          backdrop-filter: blur(20px);
          border-radius: 16px;
          padding: 14px 16px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          border: 1px solid rgba(255,255,255,0.5);
          z-index: 10;
          animation: akmSlideUp .15s ease;
        }
        .akm-links-panel-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }
        .akm-links-panel-title {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          color: #4a5466;
        }
        .akm-links-panel-subtitle {
          margin: 4px 0 0;
          font-size: 11px;
          color: #8a90a2;
        }
        .akm-links-add-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          padding: 0;
          border: none;
          border-radius: 999px;
          background: transparent;
          color: #7a8698;
          transition: color 0.15s ease, background 0.15s ease;
        }
        .akm-links-add-btn:hover {
          background: rgba(255,255,255,0.32);
          color: #526277;
        }
        .akm-links-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 240px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .akm-link-row {
          display: grid;
          grid-template-columns: minmax(0, 124px) minmax(0, 1fr) 28px;
          gap: 10px;
          align-items: center;
        }
        .akm-link-row-input {
          border: none;
          border-bottom: 1px solid rgba(95, 109, 132, 0.18);
          outline: none;
          border-radius: 0;
          padding: 8px 2px 6px;
          font-size: 12px;
          background: transparent;
          color: #475569;
          min-width: 0;
          transition: border-color 0.15s ease, color 0.15s ease;
        }
        .akm-link-row-input::placeholder {
          color: transparent;
        }
        .akm-link-row-title {
          max-width: 124px;
        }
        .akm-link-row-input:focus {
          border-bottom-color: rgba(86, 109, 145, 0.42);
          color: #334155;
        }
        .akm-link-row-remove {
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 999px;
          background: transparent;
          color: #7a8698;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s ease, background 0.15s ease;
        }
        .akm-link-row-remove:hover {
          background: rgba(255,255,255,0.32);
          color: #526277;
        }
        .akm-tag-panel .taginput-row {
          background: rgba(255,255,255,0.7);
          box-shadow: none;
          border-radius: 10px;
        }
        .akm-tag-panel .taginput-suggestions {
          background: rgba(255,255,255,0.7);
          box-shadow: none;
        }
        .akm-tag-panel .taginput-chip {
          background: rgba(255,255,255,0.6);
        }
        .akm-tag-panel .taginput-recent-label {
          color: #9a95a8;
        }
        .akm-tag-panel .taginput-recent-item {
          color: #8b7fad;
        }
        .akm-tag-panel .taginput-recent-item:hover {
          text-decoration-color: #8b7fad;
        }
        .akm-tag-panel .taginput-field::placeholder {
          color: #b0aabb;
        }
        .akm-tag-panel .taginput-add-btn {
          background: #c5bdd4;
          color: #fff;
        }
        .akm-tag-panel .taginput-add-btn:not(:disabled) {
          background: #9b8fbc;
        }
        .akm-tag-panel .taginput-add-btn:not(:disabled):hover {
          background: #8a7dab;
        }
        .akm-tag-panel .taginput-suggestion-create {
          color: #8b7fad;
        }
        .akm-bottom-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 22px;
          pointer-events: none;
        }
        .akm-bottom-tools {
          display: flex;
          align-items: center;
          gap: 8px;
          opacity: 0;
          transform: translateY(8px);
          pointer-events: none;
          transition: opacity 0.2s ease, transform 0.2s ease;
          position: relative;
          z-index: 1;
        }
        .akm-bottom-tools-zone {
          position: relative;
          display: flex;
          align-items: flex-end;
          min-height: 52px;
          pointer-events: auto;
        }
        .akm-bottom-tools-trigger {
          position: absolute;
          left: -18px;
          bottom: -18px;
          width: 240px;
          height: 92px;
        }
        .akm-bottom-tools-zone:hover .akm-bottom-tools,
        .akm-bottom-tools-zone:focus-within .akm-bottom-tools,
        .akm-bottom-tools-zone-open .akm-bottom-tools {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
        .akm-select {
          border: 1.5px solid rgba(0,0,0,0.08);
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 12px;
          color: #777;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(6px);
          outline: none;
          cursor: pointer;
          font-family: inherit;
          appearance: none;
          -webkit-appearance: none;
        }
        .akm-tool-btn {
          border: 1.5px solid rgba(0,0,0,0.08);
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 12px;
          color: #777;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(6px);
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s;
        }
        .akm-tool-btn-active {
          background: rgba(255,255,255,0.94);
          color: #5c657c;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .akm-title-input {
          border: 1.5px solid rgba(0,0,0,0.08);
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 12px;
          color: #555;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(6px);
          outline: none;
          font-family: inherit;
          width: 200px;
        }
        .akm-title-input::placeholder { color: #bbb; }
        .akm-upload-btn {
          border: 1.5px solid rgba(0,0,0,0.08);
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 12px;
          cursor: pointer;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(6px);
          color: #888;
          font-family: inherit;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: background 0.15s;
        }
        .akm-upload-btn:hover { background: rgba(255,255,255,0.95); }
        .akm-upload-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .akm-save-btn {
          pointer-events: auto;
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
        .akm-save-btn:hover {
          background: #fff;
          color: #333;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .akm-save-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        @keyframes akmSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </KnowledgeFocusShell>
  );

  return createPortal(modalContent, document.body);
};

export const KnowledgeFocusModal: React.FC<KnowledgeFocusModalProps> = ({
  mode,
  knowledgeId,
  initialContent,
  initialSpaceTagId,
  closeOnExitFocus = true,
  taskId,
  taskKnowledgeId,
  onClose,
  onDelete,
  onCreated,
  onUpdated,
}) => {
  if (mode === 'create') {
    return (
      <CreateKnowledgeFocus
        initialContent={initialContent}
        initialSpaceTagId={initialSpaceTagId}
        onClose={onClose}
        onCreated={onCreated}
      />
    );
  }

  if (!knowledgeId) return null;

  return (
    <KnowledgeDetailModal
      knowledgeId={knowledgeId}
      startInFocus
      forceFocus
      closeOnExitFocus={closeOnExitFocus ?? true}
      taskId={taskId}
      taskKnowledgeId={taskKnowledgeId}
      onClose={onClose}
      onDelete={onDelete}
      onUpdated={onUpdated}
    />
  );
};
