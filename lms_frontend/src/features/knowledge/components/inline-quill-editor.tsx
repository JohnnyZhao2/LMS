import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.bubble.css';

import { cn } from '@/lib/utils';

interface InlineQuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const TOOLBAR_OPTIONS = [
  [{ header: 1 }, { header: 2 }, 'bold', { background: [] }, 'link'],
];

export function InlineQuillEditor({
  value,
  onChange,
  placeholder = '编辑内容…',
  className,
}: InlineQuillEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const isSyncingRef = useRef(false);
  const lastValueRef = useRef(value);

  useEffect(() => {
    if (!editorRef.current || quillRef.current) return;

    const quill = new Quill(editorRef.current, {
      theme: 'bubble',
      placeholder,
      modules: {
        toolbar: TOOLBAR_OPTIONS,
      },
    });
    quillRef.current = quill;

    if (value) {
      quill.clipboard.dangerouslyPasteHTML(value);
    }
    quill.focus();

    quill.on('text-change', () => {
      if (isSyncingRef.current) return;
      const html = quill.root.innerHTML;
      const normalized = html === '<p><br></p>' ? '' : html;
      lastValueRef.current = normalized;
      onChange(normalized);
    });

    return () => {
      quillRef.current = null;
    };
  }, [onChange, placeholder, value]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;

    const nextValue = value || '';
    if (nextValue === lastValueRef.current) return;

    if (quill.root.innerHTML === nextValue) {
      lastValueRef.current = nextValue;
      return;
    }

    isSyncingRef.current = true;
    if (!nextValue) {
      quill.setText('');
    } else {
      quill.clipboard.dangerouslyPasteHTML(nextValue);
    }
    lastValueRef.current = nextValue;
    isSyncingRef.current = false;
  }, [value]);

  return (
    <div className={cn('iqe-shell min-h-[300px]', className)}>
      <div ref={editorRef} />
      <style>{`
        .iqe-shell .ql-container.ql-bubble .ql-tooltip {
          background: var(--theme-background);
          border: 1px solid var(--theme-border);
          border-radius: 14px;
          color: var(--theme-foreground);
          box-shadow: 0 10px 28px rgb(15 23 42 / 0.14);
          padding: 0 10px;
        }

        .iqe-shell .ql-container.ql-bubble .ql-tooltip:not(.ql-flip) .ql-tooltip-arrow {
          border-bottom-color: var(--theme-background);
        }

        .iqe-shell .ql-container.ql-bubble .ql-tooltip.ql-flip .ql-tooltip-arrow {
          border-top-color: var(--theme-background);
        }

        .iqe-shell .ql-container.ql-bubble .ql-toolbar {
          align-items: center;
          display: flex;
          gap: 2px;
          min-height: 42px;
        }

        .iqe-shell .ql-container.ql-bubble .ql-toolbar .ql-formats {
          display: flex;
          align-items: center;
          gap: 2px;
          margin: 0;
        }

        .iqe-shell .ql-container.ql-bubble .ql-toolbar button,
        .iqe-shell .ql-container.ql-bubble .ql-toolbar .ql-picker-label {
          align-items: center;
          border-radius: 8px;
          display: inline-flex;
          float: none;
          height: 30px;
          justify-content: center;
          width: 30px;
          transition: background-color 0.18s ease, color 0.18s ease;
        }

        .iqe-shell .ql-container.ql-bubble .ql-toolbar button:hover,
        .iqe-shell .ql-container.ql-bubble .ql-toolbar button:focus,
        .iqe-shell .ql-container.ql-bubble .ql-toolbar button.ql-active,
        .iqe-shell .ql-container.ql-bubble .ql-toolbar .ql-picker-label:hover,
        .iqe-shell .ql-container.ql-bubble .ql-toolbar .ql-picker-label.ql-active {
          background: var(--theme-muted);
          color: var(--theme-foreground);
        }

        .iqe-shell .ql-container.ql-bubble .ql-toolbar .ql-stroke,
        .iqe-shell .ql-container.ql-bubble .ql-toolbar .ql-stroke-miter {
          stroke: var(--theme-text-muted);
        }

        .iqe-shell .ql-container.ql-bubble .ql-toolbar .ql-fill,
        .iqe-shell .ql-container.ql-bubble .ql-toolbar .ql-stroke.ql-fill {
          fill: var(--theme-text-muted);
        }

        .iqe-shell .ql-container.ql-bubble .ql-toolbar button:hover .ql-stroke,
        .iqe-shell .ql-container.ql-bubble .ql-toolbar button:focus .ql-stroke,
        .iqe-shell .ql-container.ql-bubble .ql-toolbar button.ql-active .ql-stroke,
        .iqe-shell .ql-container.ql-bubble .ql-toolbar .ql-picker-label:hover .ql-stroke,
        .iqe-shell .ql-container.ql-bubble .ql-toolbar .ql-picker-label.ql-active .ql-stroke,
        .iqe-shell .ql-container.ql-bubble .ql-toolbar button:hover .ql-stroke-miter,
        .iqe-shell .ql-container.ql-bubble .ql-toolbar button:focus .ql-stroke-miter,
        .iqe-shell .ql-container.ql-bubble .ql-toolbar button.ql-active .ql-stroke-miter,
        .iqe-shell .ql-container.ql-bubble .ql-toolbar .ql-picker-label:hover .ql-stroke-miter,
        .iqe-shell .ql-container.ql-bubble .ql-toolbar .ql-picker-label.ql-active .ql-stroke-miter {
          stroke: var(--theme-foreground);
        }

        .iqe-shell .ql-container.ql-bubble .ql-toolbar button:hover .ql-fill,
        .iqe-shell .ql-container.ql-bubble .ql-toolbar button:focus .ql-fill,
        .iqe-shell .ql-container.ql-bubble .ql-toolbar button.ql-active .ql-fill,
        .iqe-shell .ql-container.ql-bubble .ql-toolbar .ql-picker-label:hover .ql-fill,
        .iqe-shell .ql-container.ql-bubble .ql-toolbar .ql-picker-label.ql-active .ql-fill {
          fill: var(--theme-foreground);
        }

        .iqe-shell .ql-container.ql-bubble .ql-picker.ql-expanded .ql-picker-options {
          background: var(--theme-background);
          border: 1px solid var(--theme-border);
          border-radius: 10px;
          box-shadow: 0 10px 24px rgb(15 23 42 / 0.12);
          margin-top: 8px;
          padding: 6px;
        }

        .iqe-shell .ql-container.ql-bubble .ql-color-picker .ql-picker-item {
          border-radius: 4px;
        }

        .iqe-shell .ql-container.ql-bubble .ql-tooltip-editor input[type='text'] {
          color: var(--theme-foreground);
          font-size: 13px;
          padding: 9px 16px;
        }

        .iqe-shell .ql-container.ql-bubble .ql-tooltip-editor a:before {
          color: var(--theme-text-muted);
        }
      `}</style>
    </div>
  );
}
