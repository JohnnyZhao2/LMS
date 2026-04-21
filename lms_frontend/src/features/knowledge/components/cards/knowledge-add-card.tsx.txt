import * as React from 'react';

import { hasMeaningfulKnowledgeHtml } from '../../utils/slash-shortcuts';
import { FocusOrbIcon } from '../shared/focus-icon';
import { SlashQuillEditor } from '../editor/rich-text-editor';
import { KnowledgeActionButton } from '../shared/knowledge-action-button';

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
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  const [focused, setFocused] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const [value, setValue] = React.useState('');
  const hasContent = hasMeaningfulKnowledgeHtml(value);

  const focusEditor = React.useCallback(() => {
    const editor = cardRef.current?.querySelector<HTMLElement>('.ql-editor');
    editor?.focus();
  }, []);

  const handleCardMouseDown = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest('button, .ql-editor, .sqe-menu, .sqe-toolbar, .sqe-toolbar-popover')) {
      return;
    }

    event.preventDefault();
    setFocused(true);
    window.requestAnimationFrame(() => {
      focusEditor();
    });
  }, [focusEditor]);

  const saveDraft = React.useCallback(async () => {
    if (isSaving || !hasContent) return;

    try {
      await onSave(value);
      setValue('');
      setFocused(false);
      setHovered(false);

      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement) {
        activeElement.blur();
      }
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
        ref={cardRef}
        onMouseDown={handleCardMouseDown}
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
            placeholder="在这里输入，键入 / 调出快捷指令"
            placeholderMode="empty-only"
            placeholderWrap
            className="akc-editor ke-content-card"
            minHeight={46}
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
            <KnowledgeActionButton
              variant="solid"
              onMouseDown={(event) => {
                event.preventDefault();
                void saveDraft();
              }}
              disabled={!hasContent || isSaving}
              className="akc-save-btn"
            >
              {isSaving ? '保存中…' : '保存'}
            </KnowledgeActionButton>
          </div>
        )}
      </div>
    </div>
  );
};
