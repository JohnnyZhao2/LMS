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
const ORDERED_LIST_TRIGGER_TEXT = '1.';
const TEXT_BLOCK_SELECTOR = 'p,h1,h2,h3,h4,h5,h6,blockquote,li,div';

function hasMeaningfulDomContent(root: HTMLElement) {
  return root.textContent?.trim() || root.querySelector('hr,img,pre,blockquote,ol,ul');
}

function normalizeEditorHtml(root: HTMLElement) {
  return hasMeaningfulDomContent(root) ? root.innerHTML : '';
}

function setRootHtml(root: HTMLElement, html: string) {
  root.innerHTML = html || EMPTY_HTML;
}

function getTextRange(root: Node, start: number, end: number) {
  if (root.nodeType === Node.TEXT_NODE) {
    const range = document.createRange();
    const textLength = root.textContent?.length ?? 0;
    range.setStart(root, Math.max(0, Math.min(start, textLength)));
    range.setEnd(root, Math.max(0, Math.min(end, textLength)));
    return range;
  }

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

function removeTriggerText(triggerRange: Range) {
  triggerRange.deleteContents();
  restoreRange(triggerRange);
}

function getElementFromNode(node: Node) {
  return node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
}

function getRangeStartNode(root: HTMLElement, range: Range) {
  if (range.startContainer !== root) return range.startContainer;

  const previousNode = root.childNodes.item(Math.max(0, range.startOffset - 1));
  const nextNode = root.childNodes.item(range.startOffset);
  return previousNode || nextNode || root;
}

function getDirectEditorChild(root: HTMLElement, node: Node) {
  let current: Node | null = node;
  while (current && current.parentNode && current.parentNode !== root) {
    current = current.parentNode;
  }
  return current && current !== root && root.contains(current) ? current : root;
}

function getCaretTextBlock(root: HTMLElement, range: Range) {
  const startNode = getRangeStartNode(root, range);
  const block = getElementFromNode(startNode)?.closest(TEXT_BLOCK_SELECTOR);
  if (block && block !== root && root.contains(block)) return block;

  return getDirectEditorChild(root, startNode);
}

function getTextBeforeRangeInBlock(block: Node, range: Range) {
  const prefixRange = range.cloneRange();
  prefixRange.selectNodeContents(block);
  prefixRange.setEnd(range.startContainer, range.startOffset);
  return prefixRange.toString();
}

function getSlashTriggerRange(root: HTMLElement, range: Range): { trigger: SlashTrigger; range: Range } | null {
  if (!range.collapsed) return null;

  const block = getCaretTextBlock(root, range);
  const textBeforeCaret = getTextBeforeRangeInBlock(block, range);
  const trigger = detectSlashTrigger(textBeforeCaret, textBeforeCaret.length);
  if (!trigger) return null;

  return {
    trigger,
    range: getTextRange(block, trigger.start, trigger.end),
  };
}

function getOrderedListTriggerRange(root: HTMLElement): Range | null {
  const range = getSelectionRangeInside(root);
  if (!range?.collapsed) return null;

  const block = getCaretTextBlock(root, range);
  const triggerRange = range.cloneRange();
  triggerRange.selectNodeContents(block);
  triggerRange.setEnd(range.startContainer, range.startOffset);

  return triggerRange.toString() === ORDERED_LIST_TRIGGER_TEXT ? triggerRange : null;
}

function applyShortcut(shortcutId: SlashShortcutId, triggerRange: Range) {
  removeTriggerText(triggerRange);

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

function applyOrderedListTrigger(triggerRange: Range) {
  triggerRange.deleteContents();
  restoreRange(triggerRange);
  execFormat('insertOrderedList');
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
  const savedSlashTriggerRangeRef = useRef<Range | null>(null);
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
      savedSlashTriggerRangeRef.current = null;
      setSlashTrigger(null);
      setToolbarVisible(false);
      return;
    }

    const range = getSelectionRangeInside(editor);
    if (!range) {
      savedSlashTriggerRangeRef.current = null;
      setSlashTrigger(null);
      setToolbarVisible(false);
      return;
    }

    savedRangeRef.current = range.cloneRange();

    if (!range.collapsed && enableSelectionToolbar) {
      savedSlashTriggerRangeRef.current = null;
      setSlashTrigger(null);
      setToolbarFormats(getToolbarFormats(range));
      setToolbarPosition(getRangePosition(range, shell));
      setToolbarVisible(true);
      return;
    }

    setToolbarVisible(false);
    if (!enableSlashMenu) {
      savedSlashTriggerRangeRef.current = null;
      setSlashTrigger(null);
      return;
    }

    const slashMatch = getSlashTriggerRange(editor, range);
    if (!slashMatch) {
      savedSlashTriggerRangeRef.current = null;
      setSlashTrigger(null);
      return;
    }

    const position = getRangePosition(range, shell);
    savedSlashTriggerRangeRef.current = slashMatch.range.cloneRange();
    setSlashTrigger(slashMatch.trigger);
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
      const editor = editorRef.current;
      if (!editor) return;
      if (!hasFocusWithinRef.current && !getSelectionRangeInside(editor)) return;

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

  const handleApplyShortcut = (shortcutId: SlashShortcutId) => {
    const editor = editorRef.current;
    const triggerRange = savedSlashTriggerRangeRef.current?.cloneRange();
    if (!editor || !triggerRange) return;

    applyShortcut(shortcutId, triggerRange);
    savedSlashTriggerRangeRef.current = null;
    setSlashTrigger(null);
    editor.focus();
    emitChange();
  };

  const handleOrderedListTrigger = () => {
    const editor = editorRef.current;
    if (!editor) return false;

    const triggerRange = getOrderedListTriggerRange(editor);
    if (!triggerRange) return false;

    applyOrderedListTrigger(triggerRange);
    savedSlashTriggerRangeRef.current = null;
    setSlashTrigger(null);
    editor.focus();
    emitChange();
    updateFloatingUi();
    return true;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      event.key === ' ' &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      handleOrderedListTrigger()
    ) {
      event.preventDefault();
      return;
    }

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
        if (selected) handleApplyShortcut(selected.id);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      savedSlashTriggerRangeRef.current = null;
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
        onMouseUp={updateFloatingUi}
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
            savedSlashTriggerRangeRef.current = null;
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
