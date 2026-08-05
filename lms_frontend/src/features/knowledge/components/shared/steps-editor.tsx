import * as React from 'react';
import { sanitizeStepsHtml } from '../../utils/content-utils';

interface StepsEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
}

/**
 * 极简步骤摘要编辑：contenteditable，支持换行与浏览器原生加粗
 */
export function StepsEditor({
  value,
  onChange,
  onBlur,
  placeholder = '填写简洁执行步骤…',
  className,
  minHeight = 72,
}: StepsEditorProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const lastHtmlRef = React.useRef(value);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el && value === lastHtmlRef.current) return;
    if (el.innerHTML === (value || '')) return;
    el.innerHTML = value || '';
    lastHtmlRef.current = value;
  }, [value]);

  const emitChange = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const next = sanitizeStepsHtml(el.innerHTML);
    lastHtmlRef.current = next;
    onChange(next);
  }, [onChange]);

  return (
    <div className={className}>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={() => {
          emitChange();
          onBlur?.();
        }}
        data-placeholder={placeholder}
        className="ks-steps-editor"
        style={{ minHeight }}
      />
      <style>{`
        .ks-steps-editor {
          width: 100%;
          outline: none;
          font-size: 13px;
          line-height: 1.65;
          color: #333;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .ks-steps-editor:empty::before {
          content: attr(data-placeholder);
          color: #b0b6c0;
          pointer-events: none;
        }
        .ks-steps-editor strong, .ks-steps-editor b { font-weight: 700; color: #111; }
      `}</style>
    </div>
  );
}
