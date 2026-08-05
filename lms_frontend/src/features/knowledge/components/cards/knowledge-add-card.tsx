import * as React from 'react';
import { FocusOrbIcon } from '../shared/focus-icon';
import { StepsEditor } from '../shared/steps-editor';
import { plain } from '../../utils/content-utils';

interface AddKnowledgeCardProps {
  onSave: (payload: { title: string; externalDocUrl: string; content: string }) => Promise<void> | void;
  onExpand: (payload: { title: string; externalDocUrl: string; content: string }) => void;
  isSaving?: boolean;
}

/**
 * 瀑布流快速新建：标题 + 文档链接 + 步骤；展开进弹窗 / 直接保存
 */
export const AddKnowledgeCard: React.FC<AddKnowledgeCardProps> = ({
  onSave,
  onExpand,
  isSaving = false,
}) => {
  const [title, setTitle] = React.useState('');
  const [externalDocUrl, setExternalDocUrl] = React.useState('');
  const [content, setContent] = React.useState('');

  const canSave = Boolean(title.trim() || externalDocUrl.trim() || plain(content));
  const draft = () => ({ title: title.trim(), externalDocUrl: externalDocUrl.trim(), content });

  const reset = () => {
    setTitle('');
    setExternalDocUrl('');
    setContent('');
  };

  const saveDraft = async () => {
    if (isSaving || !canSave) return;
    try {
      await onSave(draft());
      reset();
    } catch {
      // 保留草稿
    }
  };

  return (
    <div className="akc-card" style={{ marginBottom: 14, breakInside: 'avoid' }}>
      <div className="akc-body">
        <button
          type="button"
          className="akc-expand"
          onMouseDown={(e) => {
            e.preventDefault();
            onExpand({ title, externalDocUrl, content });
          }}
          title="展开"
          aria-label="展开"
        >
          <FocusOrbIcon size={16} interactive />
        </button>

        <p className="akc-label">添加知识</p>
        <input
          className="akc-input akc-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题"
        />
        <input
          className="akc-input"
          value={externalDocUrl}
          onChange={(e) => setExternalDocUrl(e.target.value)}
          placeholder="文档链接（可选）"
        />
        <StepsEditor value={content} onChange={setContent} minHeight={48} />

        {canSave && (
          <button
            type="button"
            className="akc-save"
            disabled={isSaving}
            onMouseDown={(e) => {
              e.preventDefault();
              void saveDraft();
            }}
          >
            {isSaving ? '保存中…' : '保存'}
          </button>
        )}
      </div>

      <style>{`
        .akc-card { position: relative; }
        .akc-body {
          position: relative;
          background: #fff;
          border-radius: 7px;
          padding: 18px 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,.06);
        }
        .akc-expand {
          position: absolute; top: 10px; right: 10px; z-index: 2;
          width: 28px; height: 28px; border: none; border-radius: 50%;
          background: transparent; padding: 0; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .akc-label {
          margin: 0 0 10px;
          font-size: 10.5px; font-weight: 700; color: #e8793a;
          letter-spacing: .1em; text-transform: uppercase;
        }
        .akc-input {
          width: 100%; border: none; border-bottom: 1px solid rgba(0,0,0,.08);
          outline: none; background: transparent; font-family: inherit;
          padding: 4px 0 8px; margin-bottom: 8px; color: #555; font-size: 12px;
        }
        .akc-title { font-size: 15px; font-weight: 600; color: #111; margin-bottom: 8px; }
        .akc-save {
          width: 100%; margin-top: 12px; border: none; border-radius: 6px;
          background: #e8793a; color: #fff; font-family: inherit;
          font-size: 12px; font-weight: 600; padding: 10px 0; cursor: pointer;
        }
        .akc-save:disabled { opacity: .5; cursor: not-allowed; }
      `}</style>
    </div>
  );
};
