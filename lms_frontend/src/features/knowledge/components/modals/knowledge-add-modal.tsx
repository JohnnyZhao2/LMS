import * as React from 'react';
import { toast } from 'sonner';
import { Upload, Plus, X } from 'lucide-react';
import type { Tag as TagType } from '@/types/api';
import type { RelatedLink } from '@/types/knowledge';

import { useLineTypeTags } from '../../api/get-tags';
import { useCreateKnowledge } from '../../api/manage-knowledge';
import { useParseDocument } from '../../api/parse-document';
import { showApiError } from '@/utils/error-handler';
import { TagInput } from '../shared/tag-input';
import {
  hasMeaningfulKnowledgeHtml,
  textToKnowledgeHtml,
} from '../../utils/slash-shortcuts';
import { getKnowledgeTitleFromHtml } from '../../utils/content-utils';
import { SlashQuillEditor } from '../editor/rich-text-editor';

const createEmptyRelatedLink = (): RelatedLink => ({
  title: '',
  url: '',
});

interface AddKnowledgeModalProps {
  open: boolean;
  onClose: () => void;
  initialContent?: string;
  initialLineTagId?: number;
  onSuccess?: (id: number) => void;
}

export const AddKnowledgeModal: React.FC<AddKnowledgeModalProps> = ({
  open,
  onClose,
  initialContent = '',
  initialLineTagId,
  onSuccess,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [lineTagId, setLineTagId] = React.useState<number | undefined>();
  const [selectedTags, setSelectedTags] = React.useState<{ id: number; name: string }[]>([]);
  const [content, setContent] = React.useState(initialContent);
  const [title, setTitle] = React.useState('');
  const [relatedLinks, setRelatedLinks] = React.useState<RelatedLink[]>([]);
  const [showTagPanel, setShowTagPanel] = React.useState(false);
  const [showRelatedLinksPanel, setShowRelatedLinksPanel] = React.useState(false);

  const { data: lineTypeTags = [] } = useLineTypeTags();
  const createKnowledge = useCreateKnowledge();
  const parseDocument = useParseDocument();

  React.useEffect(() => {
    if (open) {
      const normalizedInitialContent = initialContent.includes('<')
        ? initialContent
        : textToKnowledgeHtml(initialContent);

      setContent(normalizedInitialContent);
      setTitle(getKnowledgeTitleFromHtml(normalizedInitialContent));
      setRelatedLinks([]);
      setSelectedTags([]);
      setShowTagPanel(false);
      setShowRelatedLinksPanel(false);
      const hasPreferredLineTag = typeof initialLineTagId === 'number' && lineTypeTags.some((tag) => tag.id === initialLineTagId);
      setLineTagId(hasPreferredLineTag ? initialLineTagId : undefined);
    }
  }, [open, initialContent, initialLineTagId, lineTypeTags]);

  // ESC 关闭 + ⌘+Enter 保存
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose, content, title, lineTagId, selectedTags]);

  const canSave = hasMeaningfulKnowledgeHtml(content);
  const isUploading = parseDocument.isPending;
  const canSubmit = canSave && !createKnowledge.isPending && !isUploading;
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
        line_tag_id: lineTagId,
        content,
        related_links: sanitizedRelatedLinks.length > 0 ? sanitizedRelatedLinks : undefined,
        tag_ids: selectedTags.map((t) => t.id),
      });
      toast.success('知识创建成功');
      onClose();
      onSuccess?.(result.id);
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

  if (!open) return null;

  return (
    <div className="akm-fullscreen">
      <button
        type="button"
        onClick={onClose}
        className="akm-minimize-btn"
        title="收起"
        aria-label="收起"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M6 6V18H18"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 16L18 6"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* 主编辑区 */}
      <div className="akm-editor-area scrollbar-subtle">
        <div className="akm-editor-inner">
          <SlashQuillEditor
            value={content}
            onChange={handleContentChange}
            placeholder="Type / for shortcuts"
            autoFocus
            className="akm-editor"
            minHeight={380}
          />
        </div>
      </div>

      {/* 标签面板（从底部弹出） */}
      {showTagPanel && (
        <div className="akm-tag-panel">
          <TagInput
            selectedTags={selectedTags}
            onAdd={(tag) => setSelectedTags((prev) => [...prev, tag])}
            onRemove={(id) => setSelectedTags((prev) => prev.filter((t) => t.id !== id))}
          />
        </div>
      )}

      {/* 底部工具栏 */}
      <div className="akm-bottom-bar">
        <div className="akm-bottom-tools">
          <select
            value={lineTagId ?? ''}
            onChange={(e) => setLineTagId(e.target.value ? Number(e.target.value) : undefined)}
            className="akm-select"
          >
            <option value="">条线</option>
            {lineTypeTags.map((tag: TagType) => (
              <option key={tag.id} value={tag.id}>{tag.name}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowTagPanel((v) => !v)}
            className={`akm-tool-btn ${showTagPanel ? 'akm-tool-btn-active' : ''}`}
          >
            标签{selectedTags.length > 0 && ` (${selectedTags.length})`}
          </button>

          <div className="akm-links-anchor">
            <button
              type="button"
              onClick={() => setShowRelatedLinksPanel((v) => !v)}
              className={`akm-tool-btn ${showRelatedLinksPanel ? 'akm-tool-btn-active' : ''}`}
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

        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          disabled={!canSubmit}
          className="akm-save-btn"
        >
          {createKnowledge.isPending ? '保存中…' : '保存'}
        </button>
      </div>

      <style>{`
        .akm-fullscreen {
          position: fixed;
          inset: 0;
          z-index: 500;
          display: flex;
          flex-direction: column;
          animation: akmFadeIn .25s ease;
          background:
            linear-gradient(135deg,
              #f5d7d2 0%,
              #eedce8 12%,
              #e2ddf0 22%,
              #dde1f2 32%,
              #e6e3ed 42%,
              #edeaef 52%,
              #f0eff2 62%,
              #f4f3f5 75%,
              #f7f7f9 100%
            );
        }

        .akm-minimize-btn {
          position: absolute;
          top: 22px;
          right: 24px;
          z-index: 10;
          border-radius: 50%;
          border: none;
          width: 32px;
          height: 32px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(14px);
          color: #6a7a92;
          box-shadow: 0 6px 18px rgba(37, 49, 72, 0.11);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, color 0.18s ease;
        }
        .akm-minimize-btn:hover {
          background: rgba(255, 255, 255, 0.98);
          color: #53627b;
          transform: translateY(-1px) scale(1.02);
          box-shadow: 0 9px 20px rgba(37, 49, 72, 0.13);
        }

        .akm-editor-area {
          flex: 1;
          overflow-y: auto;
          display: flex;
          justify-content: center;
        }

        .akm-editor-inner {
          width: 100%;
          max-width: 960px;
          padding: 72px 40px 120px;
        }

        .akm-editor .ql-editor {
          font-size: 16px;
          line-height: 2;
          color: #2a2a2e;
          font-family: 'Georgia', 'Times New Roman', 'PingFang SC', serif;
        }
        .akm-editor .ql-editor.ql-blank::before {
          color: #c0c4cc;
        }
        .akm-editor .ql-editor h1 {
          font-size: 40px;
          margin-bottom: 18px;
          color: #1f2937;
        }
        .akm-editor .ql-editor p {
          margin-bottom: 14px;
        }
        .akm-editor .sqe-menu {
          min-width: 240px;
        }

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
          border: 1px solid rgba(90, 114, 148, 0.16);
          background: rgba(255,255,255,0.52);
          color: #55657f;
          border-radius: 12px;
          font-size: 12px;
          cursor: pointer;
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

        .akm-fullscreen.akm-minimal .akm-bottom-bar {
          justify-content: flex-end;
          padding: 20px 26px 26px;
        }

        .akm-bottom-tools {
          display: flex;
          align-items: center;
          gap: 8px;
          pointer-events: auto;
          opacity: 0;
          transition: opacity 0.2s ease;
          position: relative;
        }
        .akm-fullscreen:hover .akm-bottom-tools {
          opacity: 1;
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

        @keyframes akmFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes akmSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
