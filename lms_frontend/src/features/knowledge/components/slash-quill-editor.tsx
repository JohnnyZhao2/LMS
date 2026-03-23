import { useEffect, useMemo, useRef, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.bubble.css';

import { cn } from '@/lib/utils';
import {
  detectSlashTrigger,
  filterSlashShortcuts,
  type SlashShortcutId,
  type SlashTrigger,
} from '../utils/slash-shortcuts';

type BlockEmbedCtor = new (...args: never[]) => object;

const BlockEmbed = Quill.import('blots/block/embed') as BlockEmbedCtor;

class DividerBlot extends BlockEmbed {
  static blotName = 'divider';
  static tagName = 'hr';
}

if (!Quill.imports['formats/divider']) {
  Quill.register({ 'formats/divider': DividerBlot });
}

interface SlashQuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  minHeight?: number;
  onFocus?: () => void;
  onBlur?: () => void;
  readOnly?: boolean;
}

const EMPTY_HTML = '<p><br></p>';

function getTextThroughIndex(quill: Quill, index: number): string {
  const contents = quill.getContents(0, index);
  return contents.ops
    .map((op) => (typeof op.insert === 'string' ? op.insert : '\n'))
    .join('');
}

export function SlashQuillEditor({
  value,
  onChange,
  placeholder = '输入 / 调出快捷命令',
  className,
  autoFocus = false,
  minHeight = 120,
  onFocus,
  onBlur,
  readOnly = false,
}: SlashQuillEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const isSyncingRef = useRef(false);
  const lastValueRef = useRef(value);
  const blurTimerRef = useRef<number | null>(null);
  const slashUpdateFrameRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  const onFocusRef = useRef(onFocus);
  const onBlurRef = useRef(onBlur);
  const readOnlyRef = useRef(readOnly);
  const slashTriggerRef = useRef<SlashTrigger | null>(null);
  const filteredSlashShortcutsRef = useRef(filterSlashShortcuts(''));
  const activeSlashIndexRef = useRef(0);
  const [slashTrigger, setSlashTrigger] = useState<SlashTrigger | null>(null);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 48, left: 20 });
  const [activeSlashIndex, setActiveSlashIndex] = useState(0);
  const filteredSlashShortcuts = useMemo(() => (
    slashTrigger ? filterSlashShortcuts(slashTrigger.query) : []
  ), [slashTrigger]);

  useEffect(() => {
    slashTriggerRef.current = slashTrigger;
  }, [slashTrigger]);

  useEffect(() => {
    filteredSlashShortcutsRef.current = filteredSlashShortcuts;
  }, [filteredSlashShortcuts]);

  useEffect(() => {
    activeSlashIndexRef.current = activeSlashIndex;
  }, [activeSlashIndex]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onFocusRef.current = onFocus;
  }, [onFocus]);

  useEffect(() => {
    onBlurRef.current = onBlur;
  }, [onBlur]);

  useEffect(() => {
    readOnlyRef.current = readOnly;
  }, [readOnly]);

  useEffect(() => {
    if (!editorRef.current || quillRef.current) return;

    const quill = new Quill(editorRef.current, {
      theme: 'bubble',
      placeholder: readOnly ? '' : placeholder,
      readOnly,
      modules: {
        toolbar: false,
      },
      formats: ['header', 'blockquote', 'code-block', 'divider'],
    });

    quillRef.current = quill;

    if (value) {
      quill.clipboard.dangerouslyPasteHTML(value);
    }

    if (autoFocus) {
      quill.focus();
    }

    const updateSlashState = () => {
      if (readOnlyRef.current) {
        setSlashTrigger(null);
        return;
      }

      const selection = quill.getSelection();
      if (!selection || selection.length > 0) {
        setSlashTrigger(null);
        return;
      }

      const textThroughSelection = getTextThroughIndex(quill, selection.index);
      const trigger = detectSlashTrigger(textThroughSelection, textThroughSelection.length);
      if (!trigger) {
        setSlashTrigger(null);
        return;
      }

      const caretBounds = quill.getBounds(selection.index);
      if (!caretBounds) {
        setSlashTrigger(null);
        return;
      }

      setSlashTrigger(trigger);
      setActiveSlashIndex(0);
      setSlashMenuPosition({
        top: caretBounds.top + caretBounds.height + 12,
        left: Math.max(20, caretBounds.left + 4),
      });
    };

    const scheduleSlashStateUpdate = () => {
      if (slashUpdateFrameRef.current) {
        window.cancelAnimationFrame(slashUpdateFrameRef.current);
      }

      slashUpdateFrameRef.current = window.requestAnimationFrame(() => {
        slashUpdateFrameRef.current = null;
        updateSlashState();
      });
    };

    const handleTextChange = (_delta: unknown, _old: unknown, source: string) => {
      const html = quill.root.innerHTML;
      const normalized = html === EMPTY_HTML ? '' : html;

      if (!isSyncingRef.current) {
        lastValueRef.current = normalized;
        onChangeRef.current(normalized);
      }

      if (source === Quill.sources.USER) {
        scheduleSlashStateUpdate();
      }
    };

    const handleSelectionChange = () => {
      scheduleSlashStateUpdate();
    };

    const applyShortcut = (shortcutId: SlashShortcutId) => {
      const trigger = slashTriggerRef.current;
      if (!trigger) return;

      quill.deleteText(trigger.start, trigger.end - trigger.start, Quill.sources.USER);

      switch (shortcutId) {
        case 'heading':
          quill.formatLine(trigger.start, 1, {
            header: 1,
            blockquote: false,
            'code-block': false,
          }, Quill.sources.USER);
          quill.setSelection(trigger.start, 0, Quill.sources.SILENT);
          break;
        case 'divider':
          quill.insertText(trigger.start, '\n', Quill.sources.USER);
          quill.insertEmbed(trigger.start + 1, 'divider', true, Quill.sources.USER);
          quill.setSelection(trigger.start + 2, 0, Quill.sources.SILENT);
          break;
        case 'blockquote':
          quill.formatLine(trigger.start, 1, {
            header: false,
            blockquote: true,
            'code-block': false,
          }, Quill.sources.USER);
          quill.setSelection(trigger.start, 0, Quill.sources.SILENT);
          break;
        case 'code_block':
          quill.formatLine(trigger.start, 1, {
            header: false,
            blockquote: false,
            'code-block': true,
          }, Quill.sources.USER);
          quill.setSelection(trigger.start, 0, Quill.sources.SILENT);
          break;
        default:
          break;
      }

      setSlashTrigger(null);
      quill.focus();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const currentTrigger = slashTriggerRef.current;
      if (!currentTrigger) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (filteredSlashShortcutsRef.current.length > 0) {
          setActiveSlashIndex((prev) => (prev + 1) % filteredSlashShortcutsRef.current.length);
        }
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (filteredSlashShortcutsRef.current.length > 0) {
          setActiveSlashIndex((prev) => (prev - 1 + filteredSlashShortcutsRef.current.length) % filteredSlashShortcutsRef.current.length);
        }
        return;
      }

      if (event.key === 'Enter' || event.key === 'Tab') {
        if (filteredSlashShortcutsRef.current.length > 0) {
          event.preventDefault();
          const selected = filteredSlashShortcutsRef.current[activeSlashIndexRef.current] ?? filteredSlashShortcutsRef.current[0];
          if (selected) applyShortcut(selected.id);
        }
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setSlashTrigger(null);
      }
    };

    const handleFocusIn = () => {
      if (blurTimerRef.current) {
        window.clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
      onFocusRef.current?.();
    };

    const handleFocusOut = () => {
      blurTimerRef.current = window.setTimeout(() => {
        const root = quill.root;
        if (document.activeElement && root.contains(document.activeElement)) return;
        setSlashTrigger(null);
        onBlurRef.current?.();
      }, 0);
    };

    quill.on('text-change', handleTextChange);
    quill.on('selection-change', handleSelectionChange);
    quill.root.addEventListener('keydown', handleKeyDown);
    quill.root.addEventListener('focusin', handleFocusIn);
    quill.root.addEventListener('focusout', handleFocusOut);

    return () => {
      quill.off('text-change', handleTextChange);
      quill.off('selection-change', handleSelectionChange);
      quill.root.removeEventListener('keydown', handleKeyDown);
      quill.root.removeEventListener('focusin', handleFocusIn);
      quill.root.removeEventListener('focusout', handleFocusOut);
      if (blurTimerRef.current) {
        window.clearTimeout(blurTimerRef.current);
      }
      if (slashUpdateFrameRef.current) {
        window.cancelAnimationFrame(slashUpdateFrameRef.current);
      }
      quillRef.current = null;
    };
  }, [autoFocus, placeholder]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;

    const nextValue = value || '';
    if (nextValue === lastValueRef.current) return;

    if (quill.root.innerHTML === nextValue || (!nextValue && quill.root.innerHTML === EMPTY_HTML)) {
      lastValueRef.current = nextValue;
      return;
    }

    isSyncingRef.current = true;
    if (!nextValue) {
      quill.setText('');
    } else {
      quill.clipboard.dangerouslyPasteHTML(nextValue);
    }
    isSyncingRef.current = false;
    lastValueRef.current = nextValue;
  }, [value]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;

    quill.enable(!readOnly);
    if (readOnly) {
      setSlashTrigger(null);
    }
  }, [readOnly]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill || !autoFocus || readOnly) return;

    quill.focus();
  }, [autoFocus, readOnly]);

  return (
    <div
      className={cn('sqe-shell', className)}
      style={{ ['--sqe-min-height' as string]: `${minHeight}px` }}
    >
      <div ref={editorRef} />
      {slashTrigger && (
        <div
          className="sqe-menu"
          style={{
            top: slashMenuPosition.top,
            left: slashMenuPosition.left,
          }}
        >
          {filteredSlashShortcuts.map((shortcut, index) => (
            <button
              key={shortcut.id}
              type="button"
              className={cn('sqe-menu-item', index === activeSlashIndex && 'sqe-menu-item-active')}
              onMouseDown={(event) => {
                event.preventDefault();
                const quill = quillRef.current;
                if (!quill || !slashTrigger) return;

                quill.deleteText(slashTrigger.start, slashTrigger.end - slashTrigger.start, Quill.sources.USER);

                switch (shortcut.id) {
                  case 'heading':
                    quill.formatLine(slashTrigger.start, 1, {
                      header: 1,
                      blockquote: false,
                      'code-block': false,
                    }, Quill.sources.USER);
                    quill.setSelection(slashTrigger.start, 0, Quill.sources.SILENT);
                    break;
                  case 'divider':
                    quill.insertText(slashTrigger.start, '\n', Quill.sources.USER);
                    quill.insertEmbed(slashTrigger.start + 1, 'divider', true, Quill.sources.USER);
                    quill.setSelection(slashTrigger.start + 2, 0, Quill.sources.SILENT);
                    break;
                  case 'blockquote':
                    quill.formatLine(slashTrigger.start, 1, {
                      header: false,
                      blockquote: true,
                      'code-block': false,
                    }, Quill.sources.USER);
                    quill.setSelection(slashTrigger.start, 0, Quill.sources.SILENT);
                    break;
                  case 'code_block':
                    quill.formatLine(slashTrigger.start, 1, {
                      header: false,
                      blockquote: false,
                      'code-block': true,
                    }, Quill.sources.USER);
                    quill.setSelection(slashTrigger.start, 0, Quill.sources.SILENT);
                    break;
                  default:
                    break;
                }

                setSlashTrigger(null);
                quill.focus();
              }}
            >
              {shortcut.label}
            </button>
          ))}
        </div>
      )}
      <style>{`
        .sqe-shell {
          position: relative;
        }

        .sqe-shell .ql-container.ql-bubble {
          border: none;
          font-family: inherit;
        }

        .sqe-shell .ql-editor {
          min-height: var(--sqe-min-height);
          padding: 0;
          font-family: inherit;
          color: inherit;
          overflow-y: visible;
        }

        .sqe-shell .ql-editor.ql-blank::before {
          left: 0;
          right: auto;
          color: #b6bdc8;
          font-style: italic;
        }

        .sqe-shell .ql-editor h1 {
          font-size: 32px;
          font-weight: 600;
          line-height: 1.2;
          margin: 0 0 18px;
        }

        .sqe-shell .ql-editor p {
          margin: 0 0 14px;
        }

        .sqe-shell .ql-editor blockquote {
          border-left: 3px solid rgba(148, 163, 184, 0.45);
          margin: 0 0 16px;
          padding-left: 16px;
          color: #667085;
          font-style: italic;
        }

        .sqe-shell .ql-editor .ql-code-block-container {
          background: rgba(15, 23, 42, 0.06);
          border-radius: 12px;
          margin: 0 0 16px;
          padding: 14px 16px;
          font-family: 'SF Mono', 'Menlo', monospace;
          font-size: 13px;
          line-height: 1.7;
        }

        .sqe-shell .ql-editor hr {
          border: none;
          border-top: 1px solid rgba(148, 163, 184, 0.45);
          margin: 12px 0 18px;
        }

        .sqe-menu {
          position: absolute;
          z-index: 60;
          min-width: 220px;
          border-radius: 16px;
          border: 1px solid rgba(226, 232, 240, 0.95);
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 18px 32px rgba(15, 23, 42, 0.16);
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sqe-menu-item {
          border: none;
          border-radius: 12px;
          background: transparent;
          color: #475467;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          padding: 10px 12px;
          text-align: left;
          transition: background-color 0.14s ease, color 0.14s ease;
        }

        .sqe-menu-item:hover,
        .sqe-menu-item-active {
          background: rgba(232, 121, 58, 0.12);
          color: #c2410c;
        }
      `}</style>
    </div>
  );
}
