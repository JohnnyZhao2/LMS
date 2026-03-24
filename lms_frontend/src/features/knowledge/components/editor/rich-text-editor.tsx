import 'quill/dist/quill.bubble.css';

import { useEffect, useMemo, useRef, useState } from 'react';
import Quill from 'quill';

import { cn } from '@/lib/utils';

import { FloatingFormatToolbar } from './format-toolbar';
import { SlashCommandMenu } from './slash-menu';
import {
  detectSlashTrigger,
  filterSlashShortcuts,
  type SlashShortcutId,
  type SlashTrigger,
} from '../../utils/slash-shortcuts';

type RangeState = {
  index: number;
  length: number;
};

type ToolbarFormatState = {
  background: string | null;
  bold: boolean;
  checklist: boolean;
  link: string | null;
  header: number | false;
};

type BlockEmbedCtor = new (...args: never[]) => object;
type QuillLine = Exclude<ReturnType<Quill['getLine']>[0], null>;

const EMPTY_HTML = '<p><br></p>';
const BlockEmbed = Quill.import('blots/block/embed') as BlockEmbedCtor;

const EDITOR_STYLES = `
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
    color: color-mix(in srgb, var(--theme-text-muted) 72%, white);
    font-style: italic;
  }

  .sqe-shell .ql-editor h1 {
    font-size: 32px;
    font-weight: 600;
    line-height: 1.2;
    margin: 0 0 18px;
  }

  .sqe-shell .ql-editor h2 {
    font-size: 24px;
    font-weight: 600;
    line-height: 1.3;
    margin: 0 0 14px;
  }

  .sqe-shell .ql-editor h3 {
    font-size: 18px;
    font-weight: 600;
    line-height: 1.4;
    margin: 0 0 12px;
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
    color: #1f2937;
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

  .sqe-shell .ql-editor a {
    color: #2563eb;
    text-decoration: underline;
    text-decoration-color: rgba(37, 99, 235, 0.35);
  }
`;

class DividerBlot extends BlockEmbed {
  static blotName = 'divider';

  static tagName = 'hr';
}

if (!Quill.imports['formats/divider']) {
  Quill.register({ 'formats/divider': DividerBlot });
}

function isDividerLine(line: ReturnType<Quill['getLine']>[0]): line is QuillLine {
  return line?.statics.blotName === 'divider';
}

function deleteDividerBeforeCaret(quill: Quill): boolean {
  const selection = quill.getSelection();
  if (!selection || selection.length > 0 || selection.index === 0) {
    return false;
  }

  const [, offset] = quill.getLine(selection.index);
  if (offset !== 0) {
    return false;
  }

  const [previousLine] = quill.getLine(selection.index - 1);
  if (!isDividerLine(previousLine)) {
    return false;
  }

  const dividerIndex = quill.getIndex(previousLine);
  quill.deleteText(dividerIndex, 1, Quill.sources.USER);
  quill.setSelection(Math.min(dividerIndex, quill.getLength() - 1), 0, Quill.sources.SILENT);
  return true;
}

function getTextThroughIndex(quill: Quill, index: number): string {
  const contents = quill.getContents(0, index);
  return contents.ops
    .map((op) => (typeof op.insert === 'string' ? op.insert : '\n'))
    .join('');
}

function getEditorHtml(quill: Quill): string {
  if (quill.getLength() <= 1) return '';
  return quill.getSemanticHTML();
}

function applyShortcutToQuill(quill: Quill, shortcutId: SlashShortcutId, trigger: SlashTrigger) {
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
}

function getToolbarFormats(quill: Quill, range: RangeState): ToolbarFormatState {
  const formats = quill.getFormat(range.index, range.length);

  return {
    background: typeof formats.background === 'string' ? formats.background : null,
    bold: Boolean(formats.bold),
    checklist: formats.list === 'check',
    link: typeof formats.link === 'string' ? formats.link : null,
    header: typeof formats.header === 'number' ? formats.header : false,
  };
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
  enableSlashMenu?: boolean;
  enableSelectionToolbar?: boolean;
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
  enableSlashMenu = true,
  enableSelectionToolbar = true,
}: SlashQuillEditorProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const isSyncingRef = useRef(false);
  const lastValueRef = useRef(value);
  const blurTimerRef = useRef<number | null>(null);
  const uiFrameRef = useRef<number | null>(null);
  const hasFocusWithinRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const onFocusRef = useRef(onFocus);
  const onBlurRef = useRef(onBlur);
  const readOnlyRef = useRef(readOnly);
  const enableSlashMenuRef = useRef(enableSlashMenu);
  const enableSelectionToolbarRef = useRef(enableSelectionToolbar);
  const slashTriggerRef = useRef<SlashTrigger | null>(null);
  const filteredSlashShortcutsRef = useRef(filterSlashShortcuts(''));
  const activeSlashIndexRef = useRef(0);
  const selectionRef = useRef<RangeState | null>(null);

  const [slashTrigger, setSlashTrigger] = useState<SlashTrigger | null>(null);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 48, left: 20 });
  const [activeSlashIndex, setActiveSlashIndex] = useState(0);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarFormats, setToolbarFormats] = useState<ToolbarFormatState>({
    background: null,
    bold: false,
    checklist: false,
    link: null,
    header: false,
  });

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
    enableSlashMenuRef.current = enableSlashMenu;
  }, [enableSlashMenu]);

  useEffect(() => {
    enableSelectionToolbarRef.current = enableSelectionToolbar;
  }, [enableSelectionToolbar]);

  useEffect(() => {
    if (!editorRef.current || quillRef.current) return;

    const quill = new Quill(editorRef.current, {
      theme: 'bubble',
      placeholder: readOnly ? '' : placeholder,
      readOnly,
      modules: {
        toolbar: false,
      },
    });

    quillRef.current = quill;

    if (lastValueRef.current) {
      quill.clipboard.dangerouslyPasteHTML(lastValueRef.current);
    }

    if (autoFocus && !readOnly) {
      quill.focus();
    }

    const updateFloatingUi = () => {
      const selection = quill.getSelection();

      if (!selection) {
        selectionRef.current = null;
        setSlashTrigger(null);
        setToolbarVisible(false);
        return;
      }

      selectionRef.current = selection;

      if (
        selection.length > 0 &&
        enableSelectionToolbarRef.current &&
        !readOnlyRef.current
      ) {
        const bounds = quill.getBounds(selection.index, selection.length);
        if (!bounds) {
          setToolbarVisible(false);
          return;
        }
        setSlashTrigger(null);
        setToolbarFormats(getToolbarFormats(quill, selection));
        setToolbarPosition({
          top: Math.max(8, bounds.top - 56),
          left: Math.max(28, bounds.left + (bounds.width / 2)),
        });
        setToolbarVisible(true);
        return;
      }

      setToolbarVisible(false);

      if (readOnlyRef.current || !enableSlashMenuRef.current || selection.length > 0) {
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

    const scheduleUiUpdate = () => {
      if (uiFrameRef.current) {
        window.cancelAnimationFrame(uiFrameRef.current);
      }

      uiFrameRef.current = window.requestAnimationFrame(() => {
        uiFrameRef.current = null;
        updateFloatingUi();
      });
    };

    const handleTextChange = (_delta: unknown, _old: unknown, source: string) => {
      const normalized = getEditorHtml(quill);

      if (!isSyncingRef.current) {
        lastValueRef.current = normalized;
        onChangeRef.current(normalized);
      }

      if (source === Quill.sources.USER) {
        scheduleUiUpdate();
      }
    };

    const handleSelectionChange = () => {
      scheduleUiUpdate();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Backspace') {
        const removedDivider = deleteDividerBeforeCaret(quill);
        if (removedDivider) {
          event.preventDefault();
          setSlashTrigger(null);
          scheduleUiUpdate();
          return;
        }
      }

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
          setActiveSlashIndex((prev) => (
            (prev - 1 + filteredSlashShortcutsRef.current.length) % filteredSlashShortcutsRef.current.length
          ));
        }
        return;
      }

      if (event.key === 'Enter' || event.key === 'Tab') {
        if (filteredSlashShortcutsRef.current.length > 0) {
          event.preventDefault();
          const selected = filteredSlashShortcutsRef.current[activeSlashIndexRef.current] ?? filteredSlashShortcutsRef.current[0];
          if (!selected) return;
          applyShortcutToQuill(quill, selected.id, currentTrigger);
          setSlashTrigger(null);
          quill.focus();
          scheduleUiUpdate();
        }
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setSlashTrigger(null);
      }
    };

    const shell = shellRef.current;

    const handleFocusIn = () => {
      if (blurTimerRef.current) {
        window.clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
      if (!hasFocusWithinRef.current) {
        hasFocusWithinRef.current = true;
        onFocusRef.current?.();
      }
    };

    const handleFocusOut = () => {
      blurTimerRef.current = window.setTimeout(() => {
        if (shellRef.current?.contains(document.activeElement)) return;
        hasFocusWithinRef.current = false;
        setSlashTrigger(null);
        setToolbarVisible(false);
        onBlurRef.current?.();
      }, 0);
    };

    quill.on('text-change', handleTextChange);
    quill.on('selection-change', handleSelectionChange);
    quill.root.addEventListener('keydown', handleKeyDown);
    shell?.addEventListener('focusin', handleFocusIn);
    shell?.addEventListener('focusout', handleFocusOut);

    return () => {
      quill.off('text-change', handleTextChange);
      quill.off('selection-change', handleSelectionChange);
      quill.root.removeEventListener('keydown', handleKeyDown);
      shell?.removeEventListener('focusin', handleFocusIn);
      shell?.removeEventListener('focusout', handleFocusOut);
      if (blurTimerRef.current) {
        window.clearTimeout(blurTimerRef.current);
      }
      if (uiFrameRef.current) {
        window.cancelAnimationFrame(uiFrameRef.current);
      }
      quillRef.current = null;
    };
  }, [autoFocus, placeholder, readOnly]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;

    const nextValue = value || '';
    if (nextValue === lastValueRef.current) return;

    if (getEditorHtml(quill) === nextValue || (!nextValue && quill.root.innerHTML === EMPTY_HTML)) {
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
      setToolbarVisible(false);
    }
  }, [readOnly]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill || !autoFocus || readOnly) return;

    quill.focus();
  }, [autoFocus, readOnly]);

  const restoreSelection = () => {
    const quill = quillRef.current;
    if (!quill) return null;

    const selection = selectionRef.current ?? quill.getSelection();
    if (!selection) return null;

    quill.focus();
    quill.setSelection(selection.index, selection.length, Quill.sources.SILENT);
    selectionRef.current = selection;
    return selection;
  };

  const syncToolbarState = () => {
    const quill = quillRef.current;
    const selection = selectionRef.current;
    if (!quill || !selection || selection.length <= 0) return;
    setToolbarFormats(getToolbarFormats(quill, selection));
  };

  const handleToggleBold = () => {
    const quill = quillRef.current;
    const selection = restoreSelection();
    if (!quill || !selection) return;

    const formats = quill.getFormat(selection.index, selection.length);
    quill.format('bold', !formats.bold, Quill.sources.USER);
    syncToolbarState();
  };

  const handleApplyLink = (nextLink: string | null) => {
    const quill = quillRef.current;
    const selection = restoreSelection();
    if (!quill || !selection) return;

    quill.format('link', nextLink || false, Quill.sources.USER);
    syncToolbarState();
  };

  const handleApplyBackground = (nextBackground: string | null) => {
    const quill = quillRef.current;
    const selection = restoreSelection();
    if (!quill || !selection) return;

    quill.format('background', nextBackground || false, Quill.sources.USER);
    syncToolbarState();
  };

  const handleApplyHeader = (level: number | false) => {
    const quill = quillRef.current;
    const selection = restoreSelection();
    if (!quill || !selection) return;

    quill.formatLine(selection.index, selection.length || 1, {
      header: level,
      blockquote: false,
      'code-block': false,
    }, Quill.sources.USER);
    syncToolbarState();
  };

  const handleApplyShortcut = (shortcutId: SlashShortcutId, trigger: SlashTrigger) => {
    const quill = quillRef.current;
    if (!quill) return;

    applyShortcutToQuill(quill, shortcutId, trigger);
    setSlashTrigger(null);
    quill.focus();
  };

  return (
    <div
      ref={shellRef}
      className={cn('sqe-shell', className)}
      style={{ ['--sqe-min-height' as string]: `${minHeight}px` }}
    >
      <div ref={editorRef} />
      {enableSlashMenu && slashTrigger && (
        <SlashCommandMenu
          activeIndex={activeSlashIndex}
          items={filteredSlashShortcuts}
          position={slashMenuPosition}
          trigger={slashTrigger}
          onSelect={handleApplyShortcut}
        />
      )}
      {enableSelectionToolbar && !readOnly && (
        <FloatingFormatToolbar
          activeFormats={toolbarFormats}
          position={toolbarPosition}
          visible={toolbarVisible}
          onApplyBackground={handleApplyBackground}
          onApplyLink={handleApplyLink}
          onToggleBold={handleToggleBold}
          onApplyHeader={handleApplyHeader}
        />
      )}
      <style>{EDITOR_STYLES}</style>
    </div>
  );
}
