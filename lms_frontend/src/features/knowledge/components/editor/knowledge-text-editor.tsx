import '../shared/knowledge-editor-shared.css';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

import { cn } from '@/lib/utils';

import { FloatingFormatToolbar } from './format-toolbar';
import { SlashCommandMenu } from './slash-menu';
import {
  detectSlashTrigger,
  filterSlashShortcuts,
  type SlashShortcutId,
  type SlashTrigger,
} from '../../utils/slash-shortcuts';

type MenuPosition = {
  top: number;
  left: number;
};

type ToolbarFormatState = {
  background: string | null;
  bold: boolean;
  checklist: boolean;
  link: string | null;
  header: number | false;
};

type DocumentWithCaretRange = Document & {
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

const EMPTY_HTML = '<p><br></p>';
const MENU_LEFT = 16;

function hasMeaningfulDomContent(root: HTMLElement) {
  return root.textContent?.trim() || root.querySelector('hr,img,pre,blockquote');
}

function normalizeEditorHtml(root: HTMLElement) {
  return hasMeaningfulDomContent(root) ? root.innerHTML : '';
}

function setRootHtml(root: HTMLElement, html: string) {
  root.innerHTML = html || EMPTY_HTML;
}

function getTextBeforeCaret(root: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return '';

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) return '';

  const prefixRange = range.cloneRange();
  prefixRange.selectNodeContents(root);
  prefixRange.setEnd(range.startContainer, range.startOffset);
  return prefixRange.toString();
}

function getTextRange(root: HTMLElement, start: number, end: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let offset = 0;
  let startSet = false;
  let node = walker.nextNode();

  while (node) {
    const textLength = node.textContent?.length ?? 0;
    const nextOffset = offset + textLength;

    if (!startSet && start <= nextOffset) {
      range.setStart(node, Math.max(0, start - offset));
      startSet = true;
    }

    if (startSet && end <= nextOffset) {
      range.setEnd(node, Math.max(0, end - offset));
      return range;
    }

    offset = nextOffset;
    node = walker.nextNode();
  }

  range.selectNodeContents(root);
  range.collapse(false);
  return range;
}

function restoreRange(range: Range | null) {
  if (!range) return false;

  const selection = window.getSelection();
  if (!selection) return false;

  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function getSelectionRangeInside(root: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;

  return range;
}

function getRangePosition(range: Range, shell: HTMLElement): MenuPosition {
  const rangeRect = range.getBoundingClientRect();
  const shellRect = shell.getBoundingClientRect();

  return {
    top: Math.max(8, rangeRect.top - shellRect.top - 48),
    left: Math.max(28, rangeRect.left - shellRect.left + (rangeRect.width / 2)),
  };
}

function getLinkFromSelection(range: Range | null) {
  if (!range) return null;

  const parent = range.commonAncestorContainer.parentElement;
  const link = parent?.closest('a');
  return link?.href ?? null;
}

function getToolbarFormats(range: Range | null): ToolbarFormatState {
  const formatBlock = String(document.queryCommandValue('formatBlock')).toLowerCase();
  const background = String(
    document.queryCommandValue('hiliteColor') || document.queryCommandValue('backColor') || '',
  );

  return {
    background: background && background !== 'transparent' ? background : null,
    bold: document.queryCommandState('bold'),
    checklist: false,
    link: getLinkFromSelection(range),
    header: formatBlock === 'h2' ? 2 : formatBlock === 'h3' ? 3 : false,
  };
}

function execFormat(command: string, value?: string) {
  document.execCommand(command, false, value);
}

function insertHtmlAtSelection(html: string) {
  document.execCommand('insertHTML', false, html);
}

function removeTriggerText(root: HTMLElement, trigger: SlashTrigger) {
  const triggerRange = getTextRange(root, trigger.start, trigger.end);
  triggerRange.deleteContents();

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(triggerRange);
}

function applyShortcut(root: HTMLElement, shortcutId: SlashShortcutId, trigger: SlashTrigger) {
  removeTriggerText(root, trigger);

  switch (shortcutId) {
    case 'heading':
      execFormat('formatBlock', 'h1');
      break;
    case 'divider':
      insertHtmlAtSelection('<hr><p><br></p>');
      break;
    case 'blockquote':
      execFormat('formatBlock', 'blockquote');
      break;
    case 'code_block':
      insertHtmlAtSelection('<pre><code><br></code></pre><p><br></p>');
      break;
  }
}

interface KnowledgeTextEditorProps {
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

export interface KnowledgeTextEditorHandle {
  focus: () => void;
  focusAtPoint: (clientX: number, clientY: number) => boolean;
}

export const KnowledgeTextEditor = forwardRef<KnowledgeTextEditorHandle, KnowledgeTextEditorProps>(function KnowledgeTextEditor({
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
}, ref) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const savedRangeRef = useRef<Range | null>(null);
  const lastValueRef = useRef(value);
  const blurTimerRef = useRef<number | null>(null);
  const hasFocusWithinRef = useRef(false);
  const [isEmpty, setIsEmpty] = useState(!value);
  const [slashTrigger, setSlashTrigger] = useState<SlashTrigger | null>(null);
  const [slashMenuPosition, setSlashMenuPosition] = useState<MenuPosition>({ top: 48, left: MENU_LEFT });
  const [activeSlashIndex, setActiveSlashIndex] = useState(0);
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<MenuPosition>({ top: 0, left: 0 });
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

  const emitChange = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const nextHtml = normalizeEditorHtml(editor);
    lastValueRef.current = nextHtml;
    setIsEmpty(!nextHtml);
    onChange(nextHtml);
  }, [onChange]);

  const updateFloatingUi = useCallback(() => {
    const editor = editorRef.current;
    const shell = shellRef.current;
    if (!editor || !shell || readOnly) {
      setSlashTrigger(null);
      setToolbarVisible(false);
      return;
    }

    const range = getSelectionRangeInside(editor);
    if (!range) {
      setSlashTrigger(null);
      setToolbarVisible(false);
      return;
    }

    savedRangeRef.current = range.cloneRange();

    if (!range.collapsed && enableSelectionToolbar) {
      setSlashTrigger(null);
      setToolbarFormats(getToolbarFormats(range));
      setToolbarPosition(getRangePosition(range, shell));
      setToolbarVisible(true);
      return;
    }

    setToolbarVisible(false);
    if (!enableSlashMenu) {
      setSlashTrigger(null);
      return;
    }

    const textBeforeCaret = getTextBeforeCaret(editor);
    const trigger = detectSlashTrigger(textBeforeCaret, textBeforeCaret.length);
    if (!trigger) {
      setSlashTrigger(null);
      return;
    }

    const position = getRangePosition(range, shell);
    setSlashTrigger(trigger);
    setActiveSlashIndex(0);
    setSlashMenuPosition({
      top: position.top + 56,
      left: Math.max(20, position.left),
    });
  }, [enableSelectionToolbar, enableSlashMenu, readOnly]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (value === lastValueRef.current) return;

    setRootHtml(editor, value);
    setIsEmpty(!value);
    lastValueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (initializedRef.current) return;
    const editor = editorRef.current;
    if (!editor) return;

    initializedRef.current = true;
    setRootHtml(editor, value);
    if (autoFocus && !readOnly) {
      editor.focus();
    }
  }, [autoFocus, readOnly, value]);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (!hasFocusWithinRef.current) return;
      updateFloatingUi();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [updateFloatingUi]);

  useImperativeHandle(ref, () => ({
    focus: () => {
      editorRef.current?.focus({ preventScroll: true });
    },
    focusAtPoint: (clientX, clientY) => {
      const editor = editorRef.current;
      if (!editor) return false;

      editor.focus({ preventScroll: true });
      const nativeRange = (document as DocumentWithCaretRange).caretRangeFromPoint?.(clientX, clientY);
      if (!nativeRange || !editor.contains(nativeRange.startContainer)) {
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        restoreRange(range);
        return true;
      }

      nativeRange.collapse(true);
      restoreRange(nativeRange);
      return true;
    },
  }), []);

  const runCommand = (command: () => void) => {
    const editor = editorRef.current;
    if (!editor || !restoreRange(savedRangeRef.current)) return;

    command();
    editor.focus();
    emitChange();
    updateFloatingUi();
  };

  const handleApplyShortcut = (shortcutId: SlashShortcutId, trigger: SlashTrigger) => {
    const editor = editorRef.current;
    if (!editor || !restoreRange(savedRangeRef.current)) return;

    applyShortcut(editor, shortcutId, trigger);
    setSlashTrigger(null);
    editor.focus();
    emitChange();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!slashTrigger) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (filteredSlashShortcuts.length > 0) {
        setActiveSlashIndex((prev) => (prev + 1) % filteredSlashShortcuts.length);
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (filteredSlashShortcuts.length > 0) {
        setActiveSlashIndex((prev) => (prev - 1 + filteredSlashShortcuts.length) % filteredSlashShortcuts.length);
      }
      return;
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      if (filteredSlashShortcuts.length > 0) {
        event.preventDefault();
        const selected = filteredSlashShortcuts[activeSlashIndex] ?? filteredSlashShortcuts[0];
        if (selected) handleApplyShortcut(selected.id, slashTrigger);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setSlashTrigger(null);
    }
  };

  return (
    <div
      ref={shellRef}
      className={cn('sqe-shell', 'ke-content-base', className)}
      style={{ ['--sqe-min-height' as string]: `${minHeight}px` }}
    >
      <div
        ref={editorRef}
        className={cn('sqe-editor', isEmpty && 'sqe-editor-empty')}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        style={{ minHeight }}
        onInput={() => {
          emitChange();
          updateFloatingUi();
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (blurTimerRef.current) {
            window.clearTimeout(blurTimerRef.current);
            blurTimerRef.current = null;
          }
          if (!hasFocusWithinRef.current) {
            hasFocusWithinRef.current = true;
            onFocus?.();
          }
          updateFloatingUi();
        }}
        onBlur={() => {
          blurTimerRef.current = window.setTimeout(() => {
            if (shellRef.current?.contains(document.activeElement)) return;
            hasFocusWithinRef.current = false;
            setSlashTrigger(null);
            setToolbarVisible(false);
            onBlur?.();
          }, 0);
        }}
      />

      {placeholderWrap && !readOnly && isEmpty && (
        <span className="sqe-inline-placeholder sqe-inline-placeholder--wrap">
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
          onApplyBackground={(nextBackground) => runCommand(() => execFormat('hiliteColor', nextBackground ?? 'transparent'))}
          onApplyLink={(nextLink) => runCommand(() => {
            if (nextLink) {
              execFormat('createLink', nextLink);
            } else {
              execFormat('unlink');
            }
          })}
          onToggleBold={() => runCommand(() => execFormat('bold'))}
          onApplyHeader={(level) => runCommand(() => execFormat('formatBlock', level ? `h${level}` : 'p'))}
        />
      )}
    </div>
  );
});
