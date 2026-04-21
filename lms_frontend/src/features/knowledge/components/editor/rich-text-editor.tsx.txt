import 'quill/dist/quill.bubble.css';
import '../shared/knowledge-editor-shared.css';

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
type QuillLineLike = QuillLine & { length: () => number };

const EMPTY_HTML = '<p><br></p>';
const BlockEmbed = Quill.import('blots/block/embed') as BlockEmbedCtor;

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

function resetBlockFormatBeforeCaret(quill: Quill): boolean {
  const selection = quill.getSelection();
  if (!selection || selection.length > 0) {
    return false;
  }

  const [currentLine, offset] = quill.getLine(selection.index);
  if (!currentLine || offset !== 0) {
    return false;
  }

  const lineIndex = quill.getIndex(currentLine);
  const formats = quill.getFormat(lineIndex, 1);

  if (formats.blockquote) {
    quill.formatLine(lineIndex, 1, 'blockquote', false, Quill.sources.USER);
    quill.setSelection(lineIndex, 0, Quill.sources.SILENT);
    return true;
  }

  if (typeof formats.header === 'number') {
    quill.formatLine(lineIndex, 1, 'header', false, Quill.sources.USER);
    quill.setSelection(lineIndex, 0, Quill.sources.SILENT);
    return true;
  }

  if (formats['code-block']) {
    quill.formatLine(lineIndex, 1, 'code-block', false, Quill.sources.USER);
    quill.setSelection(lineIndex, 0, Quill.sources.SILENT);
    return true;
  }

  return false;
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

function isCurrentLineEmpty(quill: Quill, selection: RangeState): boolean {
  const [currentLine] = quill.getLine(selection.index);
  if (!currentLine) return false;

  const lineIndex = quill.getIndex(currentLine);
  const lineLength = Math.max(0, (currentLine as QuillLineLike).length() - 1);
  if (lineLength === 0) return true;

  return quill.getText(lineIndex, lineLength).trim().length === 0;
}

interface SlashQuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  placeholderMode?: 'empty-only' | 'follow-caret';
  placeholderWrap?: boolean;
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
  placeholder = '键入 / 调出快捷指令',
  placeholderMode = 'follow-caret',
  placeholderWrap = placeholderMode === 'empty-only',
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
  const [inlinePlaceholderPosition, setInlinePlaceholderPosition] = useState({ top: 0, left: 0 });
  const [inlinePlaceholderVisible, setInlinePlaceholderVisible] = useState(false);
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
      placeholder: '',
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
        setSlashTrigger(null);
        setInlinePlaceholderVisible(false);
        if (
          hasFocusWithinRef.current
          && selectionRef.current
          && selectionRef.current.length > 0
          && enableSelectionToolbarRef.current
          && !readOnlyRef.current
        ) {
          setToolbarVisible(true);
          return;
        }
        selectionRef.current = null;
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
        setInlinePlaceholderVisible(false);
        setToolbarFormats(getToolbarFormats(quill, selection));
        setToolbarPosition({
          top: Math.max(8, bounds.top - 56),
          left: Math.max(28, bounds.left + (bounds.width / 2)),
        });
        setToolbarVisible(true);
        return;
      }

      setToolbarVisible(false);

      if (readOnlyRef.current || selection.length > 0) {
        setInlinePlaceholderVisible(false);
        setSlashTrigger(null);
        return;
      }

      const caretBounds = quill.getBounds(selection.index);
      if (
        placeholder &&
        caretBounds &&
        (
          placeholderMode === 'empty-only'
            ? quill.getText().trim().length === 0
            : isCurrentLineEmpty(quill, selection)
        )
      ) {
        setInlinePlaceholderPosition({
          top: placeholderWrap ? caretBounds.top : caretBounds.top + (caretBounds.height / 2),
          left: caretBounds.left + 8,
        });
        setInlinePlaceholderVisible(true);
      } else {
        setInlinePlaceholderVisible(false);
      }

      if (!enableSlashMenuRef.current) {
        setSlashTrigger(null);
        return;
      }

      const textThroughSelection = getTextThroughIndex(quill, selection.index);
      const trigger = detectSlashTrigger(textThroughSelection, textThroughSelection.length);
      if (!trigger) {
        setSlashTrigger(null);
        return;
      }

      setInlinePlaceholderVisible(false);
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

        const resetBlockFormat = resetBlockFormatBeforeCaret(quill);
        if (resetBlockFormat) {
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
  }, [autoFocus, placeholder, placeholderMode, placeholderWrap, readOnly]);

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
      className={cn('sqe-shell', 'ke-content-base', className)}
      style={{ ['--sqe-min-height' as string]: `${minHeight}px` }}
    >
      <div ref={editorRef} />
      {inlinePlaceholderVisible && !slashTrigger && (
        <span
          className={cn('sqe-inline-placeholder', placeholderWrap && 'sqe-inline-placeholder--wrap')}
          style={{
            top: inlinePlaceholderPosition.top,
            left: inlinePlaceholderPosition.left,
          }}
        >
          {placeholder}
        </span>
      )}
      {enableSlashMenu && slashTrigger && (
        <SlashCommandMenu
          activeIndex={activeSlashIndex}
          items={filteredSlashShortcuts}
          position={slashMenuPosition}
          trigger={slashTrigger}
          onSelect={handleApplyShortcut}
        />
      )}
      {enableSelectionToolbar && !readOnly && toolbarVisible && (
        <FloatingFormatToolbar
          activeFormats={toolbarFormats}
          position={toolbarPosition}
          onApplyBackground={handleApplyBackground}
          onApplyLink={handleApplyLink}
          onToggleBold={handleToggleBold}
          onApplyHeader={handleApplyHeader}
        />
      )}
    </div>
  );
}
