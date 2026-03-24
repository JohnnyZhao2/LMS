import * as React from 'react';

import { hasMeaningfulKnowledgeHtml } from '../../utils/slash-shortcuts';
import { FocusOrbIcon } from '../shared/focus-icon';
import { SlashQuillEditor } from '../editor/rich-text-editor';

interface AddKnowledgeCardProps {
  onSave: (content: string) => Promise<void> | void;
  onExpand: (content: string) => void;
  isSaving?: boolean;
}

/**
 * 内嵌在瀑布流中的快速新建知识卡片
 * 风格来自 mymind — 支持卡片内快速保存，也支持展开进入完整编辑
 */
export const AddKnowledgeCard: React.FC<AddKnowledgeCardProps> = ({
  onSave,
  onExpand,
  isSaving = false,
}) => {
  const [focused, setFocused] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const [value, setValue] = React.useState('');
  const hasContent = hasMeaningfulKnowledgeHtml(value);

  const saveDraft = React.useCallback(async () => {
    if (isSaving || !hasContent) return;

    try {
      await onSave(value);
      setValue('');
      setFocused(false);
    } catch {
      // 创建失败时保留草稿，方便用户修正后重试
    }
  }, [hasContent, isSaving, onSave, value]);

  return (
    <div
      style={{
        marginBottom: 14,
        breakInside: 'avoid',
        position: 'relative',
        zIndex: focused ? 40 : 1,
      }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: '#fff',
          borderRadius: 7,
          minHeight: 200,
          overflow: focused ? 'visible' : 'hidden',
          position: 'relative',
          boxShadow:
            focused || hovered
              ? '0 14px 24px rgba(0,0,0,0.13), 10px 14px 24px rgba(0,0,0,0.10)'
              : '0 8px 24px rgba(0,0,0,0.04), 0 2px 6px rgba(0,0,0,0.02)',
          border: 'none',
          transition: 'box-shadow .22s ease',
          cursor: 'text',
        }}
      >
        {(focused || hovered) && (
          <button
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onExpand(value);
            }}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 3,
            }}
          >
            <FocusOrbIcon size={16} interactive />
          </button>
        )}

        <div
          style={{
            padding: '22px 24px',
            paddingBottom: focused && hasContent ? 58 : 22,
          }}
        >
          <p
            style={{
              margin: '0 0 12px',
              fontSize: 10.5,
              fontWeight: 700,
              color: '#e8793a',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            添加知识
          </p>

          <SlashQuillEditor
            value={value}
            onChange={setValue}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              if (!hasMeaningfulKnowledgeHtml(value)) {
                setFocused(false);
              }
            }}
            placeholder="在这里输入，键入 / 调出快捷命令"
            className="akc-editor"
            minHeight={28}
          />
        </div>

        {focused && hasContent && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 2,
            }}
          >
            <button
              onMouseDown={(event) => {
                event.preventDefault();
                void saveDraft();
              }}
              disabled={!hasContent || isSaving}
              style={{
                width: '100%',
                border: 'none',
                borderRadius: 0,
                background: '#e8793a',
                padding: '10px 0',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: !hasContent || isSaving ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                opacity: !hasContent || isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? '保存中…' : '保存'}
            </button>
          </div>
        )}
      </div>

      <style>{`
        .akc-editor .ql-editor {
          font-size: 14.5px;
          line-height: 1.68;
          color: #1a1a1a;
          letter-spacing: -0.008em;
        }

        .akc-editor .ql-editor.ql-blank::before {
          color: #b8bec8;
          font-style: normal;
        }

        .akc-editor .ql-editor h1 {
          font-size: 28px;
          margin-bottom: 14px;
        }

        .akc-editor .ql-editor p {
          margin-bottom: 10px;
        }

        .akc-editor .sqe-menu {
          left: 0 !important;
          min-width: 210px;
        }
      `}</style>
    </div>
  );
};
