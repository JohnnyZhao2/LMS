import '@/features/knowledge/components/shared/knowledge-editor-shared.css';

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
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

import {
  FloatingFormatToolbar,
  type BlockStyle,
  type TextAlign,
  type ToolbarFormatState,
} from '@/features/knowledge/components/editor/format-toolbar';
import { SlashCommandMenu } from '@/features/knowledge/components/editor/slash-menu';
import {
  detectSlashTrigger,
  filterSlashShortcuts,
  type SlashShortcutId,
  type SlashTrigger,
} from '@/features/knowledge/utils/slash-shortcuts';

type MenuPosition = {
  top: number;
  left: number;
};

const DEFAULT_TOOLBAR_FORMATS: ToolbarFormatState = {
  background: null,
  block: 'p',
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  link: null,
  align: 'left',
  orderedList: false,
  unorderedList: false,
  blockquote: false,
  code: false,
};

type DocumentWithCaretRange = Document & {
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

const EMPTY_HTML = '<p><br></p>';
const MENU_LEFT = 16;
const ORDERED_LIST_TRIGGER_TEXT = '1.';
const TEXT_BLOCK_SELECTOR = 'p,h1,h2,h3,h4,h5,h6,blockquote,li,div';
const SLASH_MENU_HEIGHT = 40;
const FLOATING_UI_GAP = 10;
const VIEWPORT_SAFE_GAP = 8;

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
  const topAboveSelection = rangeRect.top - shellRect.top - SLASH_MENU_HEIGHT - FLOATING_UI_GAP;
  const topBelowSelection = rangeRect.bottom - shellRect.top + FLOATING_UI_GAP;
  const hasRoomAboveSelection = rangeRect.top >= SLASH_MENU_HEIGHT + FLOATING_UI_GAP + VIEWPORT_SAFE_GAP;
  const hasRoomBelowSelection = window.innerHeight - rangeRect.bottom >= SLASH_MENU_HEIGHT + FLOATING_UI_GAP + VIEWPORT_SAFE_GAP;
  const preferredTop = hasRoomAboveSelection || !hasRoomBelowSelection ? topAboveSelection : topBelowSelection;
  const minViewportTop = VIEWPORT_SAFE_GAP - shellRect.top;
  const maxViewportTop = window.innerHeight - shellRect.top - SLASH_MENU_HEIGHT - VIEWPORT_SAFE_GAP;
  const constrainedTop = maxViewportTop > minViewportTop
    ? Math.min(Math.max(preferredTop, minViewportTop), maxViewportTop)
    : preferredTop;

  return {
    top: constrainedTop,
    left: Math.max(28, rangeRect.left - shellRect.left + (rangeRect.width / 2)),
  };
}

function getLinkFromSelection(range: Range | null) {
  if (!range) return null;

  const parent = range.commonAncestorContainer.parentElement;
  const link = parent?.closest('a');
  return link?.href ?? null;
}

function resolveBlockStyle(formatBlock: string): BlockStyle {
  if (formatBlock === 'h1') return 'h1';
  if (formatBlock === 'h2') return 'h2';
  if (formatBlock === 'h3') return 'h3';
  if (formatBlock === 'h4') return 'h4';
  return 'p';
}

function resolveTextAlign(range: Range | null): TextAlign {
  if (!range) return 'left';
  const element = getElementFromNode(range.commonAncestorContainer);
  const block = element?.closest(TEXT_BLOCK_SELECTOR) as HTMLElement | null;
  const align = (block?.style.textAlign || window.getComputedStyle(block ?? document.body).textAlign || 'left').toLowerCase();
  if (align === 'center') return 'center';
  if (align === 'right' || align === 'end') return 'right';
  return 'left';
}

function getToolbarFormats(range: Range | null): ToolbarFormatState {
  const formatBlock = String(document.queryCommandValue('formatBlock')).toLowerCase();
  const background = String(
    document.queryCommandValue('hiliteColor') || document.queryCommandValue('backColor') || '',
  );
  const isBlockquote = formatBlock === 'blockquote'
    || Boolean(range && getElementFromNode(range.commonAncestorContainer)?.closest('blockquote'));
  const isCode = Boolean(range && getElementFromNode(range.commonAncestorContainer)?.closest('code,pre'));

  return {
    background: background && background !== 'transparent' && background !== 'rgba(0, 0, 0, 0)'
      ? background
      : null,
    block: isBlockquote ? 'p' : resolveBlockStyle(formatBlock),
    bold: document.queryCommandState('bold'),
    italic: document.queryCommandState('italic'),
    underline: document.queryCommandState('underline'),
    strike: document.queryCommandState('strikeThrough'),
    link: getLinkFromSelection(range),
    align: resolveTextAlign(range),
    orderedList: document.queryCommandState('insertOrderedList'),
    unorderedList: document.queryCommandState('insertUnorderedList'),
    blockquote: isBlockquote,
    code: isCode,
  };
}

function toggleInlineCode() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const codeParent = getElementFromNode(range.commonAncestorContainer)?.closest('code');
  if (codeParent && codeParent.tagName.toLowerCase() === 'code' && !codeParent.closest('pre')) {
    const text = document.createTextNode(codeParent.textContent ?? '');
    codeParent.replaceWith(text);
    const nextRange = document.createRange();
    nextRange.selectNodeContents(text);
    restoreRange(nextRange);
    return;
  }

  if (range.collapsed) {
    insertHtmlAtSelection('<code>\u200b</code>');
    return;
  }

  const content = range.extractContents();
  const code = document.createElement('code');
  code.appendChild(content);
  range.insertNode(code);
  const nextRange = document.createRange();
  nextRange.selectNodeContents(code);
  restoreRange(nextRange);
}

function applyBlockStyle(block: BlockStyle) {
  execFormat('formatBlock', block === 'p' ? 'p' : block);
}

function applyTextAlign(align: TextAlign) {
  if (align === 'center') {
    execFormat('justifyCenter');
    return;
  }
  if (align === 'right') {
    execFormat('justifyRight');
    return;
  }
  execFormat('justifyLeft');
}

function toggleBlockquote(active: boolean) {
  if (active) {
    execFormat('formatBlock', 'p');
    return;
  }
  execFormat('formatBlock', 'blockquote');
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
  enableFormatToolbar?: boolean;
  /** 将格式工具栏渲染到外部容器（如弹窗顶部），不占用正文流 */
  toolbarPortalTarget?: HTMLElement | null;
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
  enableFormatToolbar = true,
  toolbarPortalTarget = null,
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
  const [toolbarFormats, setToolbarFormats] = useState<ToolbarFormatState>(DEFAULT_TOOLBAR_FORMATS);

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

  const ensureEditorSelection = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return false;

    if (restoreRange(savedRangeRef.current) && getSelectionRangeInside(editor)) {
      return true;
    }

    editor.focus({ preventScroll: true });
    const current = getSelectionRangeInside(editor);
    if (current) {
      savedRangeRef.current = current.cloneRange();
      return true;
    }

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    if (!restoreRange(range)) return false;
    savedRangeRef.current = range.cloneRange();
    return true;
  }, []);

  const updateFloatingUi = useCallback(() => {
    const editor = editorRef.current;
    const shell = shellRef.current;
    if (!editor || !shell || readOnly) {
      savedSlashTriggerRangeRef.current = null;
      setSlashTrigger(null);
      return;
    }

    const range = getSelectionRangeInside(editor);
    if (!range) {
      savedSlashTriggerRangeRef.current = null;
      setSlashTrigger(null);
      return;
    }

    savedRangeRef.current = range.cloneRange();

    if (enableFormatToolbar) {
      setToolbarFormats(getToolbarFormats(range));
    }

    if (!range.collapsed || !enableSlashMenu) {
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
  }, [enableFormatToolbar, enableSlashMenu, readOnly]);

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
    if (!editor || !ensureEditorSelection()) return;

    command();
    editor.focus({ preventScroll: true });
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

  const showFormatToolbar = enableFormatToolbar && !readOnly;
  const usePortalToolbar = Boolean(showFormatToolbar && toolbarPortalTarget);

  const formatToolbar = showFormatToolbar ? (
    <div className={cn('sqe-toolbar-dock', usePortalToolbar && 'sqe-toolbar-dock-overlay')}>
      <FloatingFormatToolbar
        activeFormats={toolbarFormats}
        onApplyBackground={(nextBackground) => runCommand(() => execFormat('hiliteColor', nextBackground ?? 'transparent'))}
        onApplyLink={(nextLink) => runCommand(() => {
          if (nextLink) {
            execFormat('createLink', nextLink);
          } else {
            execFormat('unlink');
          }
        })}
        onToggleBold={() => runCommand(() => execFormat('bold'))}
        onToggleItalic={() => runCommand(() => execFormat('italic'))}
        onToggleUnderline={() => runCommand(() => execFormat('underline'))}
        onToggleStrike={() => runCommand(() => execFormat('strikeThrough'))}
        onApplyBlock={(block) => runCommand(() => applyBlockStyle(block))}
        onApplyAlign={(align) => runCommand(() => applyTextAlign(align))}
        onToggleOrderedList={() => runCommand(() => execFormat('insertOrderedList'))}
        onToggleUnorderedList={() => runCommand(() => execFormat('insertUnorderedList'))}
        onToggleBlockquote={() => runCommand(() => toggleBlockquote(toolbarFormats.blockquote))}
        onToggleCode={() => runCommand(() => toggleInlineCode())}
      />
    </div>
  ) : null;

  return (
    <div
      ref={shellRef}
      className={cn(
        'sqe-shell',
        'ke-content-base',
        showFormatToolbar && !usePortalToolbar && 'sqe-shell-with-toolbar',
        className,
      )}
      style={{ ['--sqe-min-height' as string]: `${minHeight}px` }}
    >
      {showFormatToolbar && !usePortalToolbar && formatToolbar}
      {usePortalToolbar && toolbarPortalTarget && createPortal(formatToolbar, toolbarPortalTarget)}

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
            if (toolbarPortalTarget?.contains(document.activeElement)) return;
            hasFocusWithinRef.current = false;
            savedSlashTriggerRangeRef.current = null;
            setSlashTrigger(null);
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
    </div>
  );
});
