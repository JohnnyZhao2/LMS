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
  ['bold', 'italic', 'underline', 'strike'],
  [{ header: 1 }, { header: 2 }, { header: 3 }],
  [{ color: [] }, { background: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote', 'code-block', 'link'],
  ['clean'],
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
    <div className={cn('min-h-[300px]', className)}>
      <div ref={editorRef} />
    </div>
  );
}

