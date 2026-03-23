import * as React from 'react';
import { FocusOrbIcon } from './focus-orb-icon';

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
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const MIN_TEXTAREA_HEIGHT = 24;

  const adjustTextareaHeight = React.useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = `${MIN_TEXTAREA_HEIGHT}px`;
    el.style.height = `${Math.max(el.scrollHeight, MIN_TEXTAREA_HEIGHT)}px`;
  }, []);

  React.useLayoutEffect(() => {
    adjustTextareaHeight();
  }, [adjustTextareaHeight, value]);

  const saveDraft = React.useCallback(async () => {
    if (isSaving) return;
    const trimmedValue = value.trim();
    if (!trimmedValue) return;

    try {
      await onSave(trimmedValue);
      setValue('');
      setFocused(false);
      taRef.current?.blur();
    } catch {
      // 创建失败时保留草稿，方便用户修正后重试
    }
  }, [isSaving, onSave, value]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && value.trim()) {
      e.preventDefault();
      void saveDraft();
    }
    if (e.key === 'Escape') {
      setValue('');
      setFocused(false);
      taRef.current?.blur();
    }
  };

  return (
    <div style={{ marginBottom: 14, breakInside: 'avoid' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: '#fff',
          borderRadius: 7,
          minHeight: 200,
          overflow: 'hidden',
          position: 'relative',
          boxShadow:
            focused || hovered
              ? '0 14px 24px rgba(0,0,0,0.13), 10px 14px 24px rgba(0,0,0,0.10)'
              : '0 8px 24px rgba(0,0,0,0.04), 0 2px 6px rgba(0,0,0,0.02)',
          border: 'none',
          transition: 'box-shadow .22s ease',
          cursor: 'text',
        }}
        onClick={() => taRef.current?.focus()}
      >
        {/* 展开按钮 — 打开完整弹窗 */}
        {focused && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onExpand(value.trim());
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
            }}
          >
            <FocusOrbIcon size={16} interactive />
          </button>
        )}

        <div
          style={{
            padding: '22px 24px',
            paddingBottom: focused && value.trim() ? 58 : 22,
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
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
            }}
            onFocus={() => {
              setFocused(true);
              adjustTextareaHeight();
            }}
            onBlur={() => {
              if (!value.trim()) setFocused(false);
            }}
            onKeyDown={handleKey}
            placeholder="在这里输入…"
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              resize: 'none',
              background: 'none',
              fontSize: 14.5,
              lineHeight: 1.68,
              color: '#1a1a1a',
              fontFamily: 'inherit',
              letterSpacing: '-0.008em',
              height: MIN_TEXTAREA_HEIGHT,
              overflow: 'hidden',
              display: 'block',
            }}
          />
        </div>

        {/* 保存按钮 */}
        {focused && value.trim() && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                void saveDraft();
              }}
              disabled={!value.trim() || isSaving}
              style={{
                width: '100%',
                border: 'none',
                borderRadius: 0,
                background: '#e8793a',
                padding: '10px 0',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: !value.trim() || isSaving ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                opacity: !value.trim() || isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? '保存中…' : '保存'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
