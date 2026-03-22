import * as React from 'react';

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
          borderRadius: 18,
          overflow: 'hidden',
          position: 'relative',
          boxShadow:
            focused || hovered
              ? '0 8px 16px rgba(0,0,0,0.10), 4px 8px 16px rgba(0,0,0,0.06)'
              : '0 2px 10px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)',
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
              top: 14,
              right: 14,
              width: 16,
              height: 16,
              borderRadius: '50%',
              border: 'none',
              background:
                'linear-gradient(135deg, #f97316, #ec4899, #8b5cf6)',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="7"
              height="7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.5"
            >
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        )}

        <div
          style={{
            padding: '22px 24px',
            paddingBottom: focused ? 18 : 22,
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
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
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
              fontSize: 15,
              lineHeight: 1.7,
              color: '#1a1a1a',
              fontFamily: 'inherit',
              letterSpacing: '-0.01em',
              height: focused ? 160 : 24,
              transition: 'height .22s ease',
              overflow: 'hidden',
              display: 'block',
            }}
          />
        </div>

        {/* 保存按钮 */}
        {focused && (
          <div style={{ padding: '0 24px 20px' }}>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                void saveDraft();
              }}
              disabled={!value.trim() || isSaving}
              style={{
                width: '100%',
                border: 'none',
                borderRadius: 100,
                background: '#e8793a',
                padding: '12px 0',
                color: '#fff',
                fontSize: 13,
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
