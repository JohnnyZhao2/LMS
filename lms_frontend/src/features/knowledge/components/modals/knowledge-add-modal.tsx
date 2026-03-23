import * as React from 'react';
import { toast } from 'sonner';
import { Link as LinkIcon, Upload, Minimize2 } from 'lucide-react';
import type { Tag as TagType } from '@/types/api';

import { useLineTypeTags } from '../../api/get-tags';
import { useCreateKnowledge } from '../../api/manage-knowledge';
import { useParseDocument } from '../../api/parse-document';
import { showApiError } from '@/utils/error-handler';
import { TagInput } from '../shared/tag-input';
import {
  hasMeaningfulKnowledgeHtml,
  textToKnowledgeHtml,
} from '../../utils/slash-shortcuts';
import { SlashQuillEditor } from '../editor/rich-text-editor';

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
  const [sourceUrl, setSourceUrl] = React.useState('');
  const [showTagPanel, setShowTagPanel] = React.useState(false);

  const { data: lineTypeTags = [] } = useLineTypeTags();
  const createKnowledge = useCreateKnowledge();
  const parseDocument = useParseDocument();

  React.useEffect(() => {
    if (open) {
      setContent(initialContent.includes('<') ? initialContent : textToKnowledgeHtml(initialContent));
      setTitle('');
      setSourceUrl('');
      setSelectedTags([]);
      setShowTagPanel(false);
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
  }, [open, onClose, content, title, sourceUrl, lineTagId, selectedTags]);

  const canSave = hasMeaningfulKnowledgeHtml(content);
  const isUploading = parseDocument.isPending;
  const canSubmit = canSave && !createKnowledge.isPending && !isUploading;

  const handleFileUpload = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const result = await parseDocument.mutateAsync(file);
        setContent(result.content);
        if (!title.trim() && result.suggested_title?.trim()) {
          setTitle(result.suggested_title.trim());
        }
        toast.success('文档导入成功');
      } catch (error) {
        showApiError(error, '文档导入失败');
      } finally {
        e.target.value = '';
      }
    }, [parseDocument, title]);

  const handleSave = async () => {
    if (!canSave) return;
    try {
      const trimmedTitle = title.trim();
      const result = await createKnowledge.mutateAsync({
        ...(trimmedTitle && { title: trimmedTitle }),
        line_tag_id: lineTagId,
        content,
        source_url: sourceUrl.trim() || undefined,
        tag_ids: selectedTags.map((t) => t.id),
      });
      toast.success('知识创建成功');
      onClose();
      onSuccess?.(result.id);
    } catch (error) {
      showApiError(error, '创建失败');
    }
  };

  if (!open) return null;

  return (
    <div className="akm-fullscreen">
      {/* 缩小按钮 */}
      <button
        type="button"
        onClick={onClose}
        className="akm-minimize-btn"
        title="关闭"
      >
        <Minimize2 size={18} />
      </button>

      {/* 主编辑区 */}
      <div className="akm-editor-area scrollbar-subtle">
        <div className="akm-editor-inner">
          <SlashQuillEditor
            value={content}
            onChange={setContent}
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
          {/* 条线选择 */}
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

          {/* 标签按钮 */}
          <button
            type="button"
            onClick={() => setShowTagPanel((v) => !v)}
            className={`akm-tool-btn ${showTagPanel ? 'akm-tool-btn-active' : ''}`}
          >
            标签{selectedTags.length > 0 && ` (${selectedTags.length})`}
          </button>

          {/* 标题输入 */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="标题（可选）"
            className="akm-title-input"
          />

          {/* 链接输入 */}
          <div className="akm-link-wrap">
            <LinkIcon size={12} className="akm-link-icon" />
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="链接"
              className="akm-link-input"
            />
          </div>

          {/* 上传按钮 */}
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
          top: 18px;
          right: 22px;
          z-index: 10;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(8px);
          color: #8a8f9a;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: all 0.18s ease;
        }
        .akm-minimize-btn:hover {
          background: rgba(255, 255, 255, 0.9);
          color: #555;
          transform: scale(1.06);
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
          pointer-events: auto;
          opacity: 0;
          transition: opacity 0.2s ease;
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

        .akm-link-wrap {
          display: flex;
          align-items: center;
          gap: 5px;
          border: 1.5px solid rgba(0,0,0,0.08);
          border-radius: 20px;
          padding: 6px 14px;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(6px);
        }
        .akm-link-icon { color: #bbb; flex-shrink: 0; }
        .akm-link-input {
          border: none;
          outline: none;
          font-size: 12px;
          color: #7090cc;
          background: none;
          font-family: inherit;
          width: 120px;
        }
        .akm-link-input::placeholder { color: #bbb; }

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
