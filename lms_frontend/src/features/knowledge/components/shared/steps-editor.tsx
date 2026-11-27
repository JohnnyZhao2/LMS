import * as React from 'react';
import { sanitizeStepsHtml } from '@/lib/knowledge-content';
import { cn } from '@/lib/utils';

interface StepsEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  editorClassName?: string;
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
  editorClassName,
  minHeight = 72,
}: StepsEditorProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const lastHtmlRef = React.useRef(value);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el && value === lastHtmlRef.current) return;
    const safe = sanitizeStepsHtml(value || '');
    if (el.innerHTML === safe) return;
    el.innerHTML = safe;
    lastHtmlRef.current = safe;
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
        className={cn(
          'w-full text-[13px] leading-[1.65] text-[#333] break-words whitespace-pre-wrap outline-none',
          'empty:before:pointer-events-none empty:before:text-[#b0b6c0] empty:before:content-[attr(data-placeholder)]',
          '[&_b]:font-bold [&_b]:text-[#111] [&_strong]:font-bold [&_strong]:text-[#111]',
          editorClassName,
        )}
        style={{ minHeight }}
      />
    </div>
  );
}
