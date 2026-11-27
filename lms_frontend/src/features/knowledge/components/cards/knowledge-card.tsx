import * as React from 'react';
import { Check, Copy, Link as LinkGlyph } from 'lucide-react';
import type { KnowledgeListItem } from '@/types/knowledge';
import { plain, sanitizeStepsHtml } from '@/lib/knowledge-content';
import { cn } from '@/lib/utils';
import { setCleanDragImage } from '../knowledge-pinned-bar';
import { FocusOrbIcon } from '../shared/focus-icon';

interface KnowledgeCardMymindProps {
  item: KnowledgeListItem;
  onClick: (id: number) => void;
  onFocusOpen?: (id: number) => void;
  index: number;
  canSelect?: boolean;
  selectionActive?: boolean;
  selected?: boolean;
  selectedIdSet?: Set<number>;
  onToggleSelect?: (id: number) => void;
  canDrag?: boolean;
  onDragStartCard?: (item: KnowledgeListItem) => void;
  onDragEndCard?: () => void;
  onContextMenuCard?: (event: React.MouseEvent, item: KnowledgeListItem) => void;
  /** 聚合卡内 hover 切换激活条时回调（用于外部联动预览） */
  onActiveItemChange?: (item: KnowledgeListItem) => void;
  /** 聚合卡侧边步骤浮层显隐变化时回调（用于列表聚焦降噪） */
  onOverlayOpenChange?: (open: boolean) => void;
  /** 当其他卡片抢占浮层聚焦时自动收起自身锁定浮层 */
  isOtherPreviewActive?: boolean;
  /** 禁用侧边悬浮步骤卡（用于导入预览等自带右侧联动的弹窗场景） */
  disableSideOverlay?: boolean;
}

function getSourceHost(item: KnowledgeListItem): { host: string; url: string } | null {
  const firstRelatedLink = item.related_links?.[0];
  if (!firstRelatedLink?.url) return null;
  try {
    return { host: new URL(firstRelatedLink.url).host, url: firstRelatedLink.url };
  } catch {
    const fallback = firstRelatedLink.url.replace(/^https?:\/\//i, '').split('/')[0] ?? '';
    return fallback ? { host: fallback, url: firstRelatedLink.url } : null;
  }
}

const PREFIX_DELIMITERS = new Set([' ', '-', '–', '—', ':', '：', '/', '|', '·']);

/**
 * 提取同组条目的公共前缀作为卡片抬头并剥离重复前缀，消除“满屏重复开头文字”导致的视觉眩晕
 */
function resolveGroupPresentation(
  explicitSection: string | undefined,
  rows: KnowledgeListItem[],
): { headerTitle: string; displayTitles: string[] } {
  const rawTitles = rows.map((r) => (r.title || '未命名知识').trim());
  const cleanSection = (explicitSection || '').trim();

  let commonPrefix = rawTitles[0] ?? '';
  for (let i = 1; i < rawTitles.length && commonPrefix.length > 0; i += 1) {
    const cur = rawTitles[i];
    let j = 0;
    while (j < commonPrefix.length && j < cur.length && commonPrefix[j] === cur[j]) {
      j += 1;
    }
    commonPrefix = commonPrefix.slice(0, j);
  }

  // 只在分隔符边界截断公共前缀，避免把完整词组从中间腰斩
  let cutPos = -1;
  for (let i = commonPrefix.length - 1; i >= 2; i -= 1) {
    if (PREFIX_DELIMITERS.has(commonPrefix[i])) {
      cutPos = i;
      break;
    }
  }

  let stripLen = 0;
  let inferredHeader = '';
  if (cutPos >= 2) {
    const candidateHeader = commonPrefix.slice(0, cutPos).trim();
    const candidateStripLen = cutPos + 1;
    const allRemainMeaningful = rawTitles.every(
      (t) => t.slice(candidateStripLen).trim().length >= 4,
    );
    if (candidateHeader.length >= 2 && allRemainMeaningful) {
      inferredHeader = candidateHeader;
      stripLen = candidateStripLen;
    }
  }

  const headerTitle = cleanSection || inferredHeader || '';
  const displayTitles = stripLen > 0
    ? rawTitles.map((t) => t.slice(stripLen).trim())
    : rawTitles;

  return { headerTitle, displayTitles };
}

interface SidePreviewPopoverProps {
  itemKey: number;
  stepsHtml: string;
  source: { host: string; url: string } | null;
  showSource: boolean;
  top: number;
  arrowTop: number;
  side: 'right' | 'left';
  copied: boolean;
  onCopy: (event: React.MouseEvent) => void;
  onLinkClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/** 统一侧边悬浮速览卡（关联卡激活项 + 单卡折叠内容共用：纯白不透底 + 指向箭头 + 可划选/一键复制 + 右下角相关链接） */
const SidePreviewPopover: React.FC<SidePreviewPopoverProps> = ({
  itemKey,
  stepsHtml,
  source,
  showSource,
  top,
  arrowTop,
  side,
  copied,
  onCopy,
  onLinkClick,
  onMouseEnter,
  onMouseLeave,
}) => (
  <div
    style={{ top }}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    className={cn(
      'absolute z-30 w-[320px]',
      side === 'right' ? 'left-full pl-3' : 'right-full pr-3',
    )}
  >
    <div
      key={itemKey}
      onClick={(e) => e.stopPropagation()}
      className="relative rounded-[9px] border border-black/[0.08] bg-white shadow-[0_20px_48px_rgba(15,23,42,0.16),0_4px_14px_rgba(15,23,42,0.06)] [animation:modalFadeIn_0.12s_ease]"
    >
      <span
        aria-hidden="true"
        style={{ top: arrowTop }}
        className={cn(
          'pointer-events-none absolute h-[10px] w-[10px] rotate-45 bg-white',
          side === 'right'
            ? '-left-[6px] border-b border-l border-black/[0.08]'
            : '-right-[6px] border-t border-r border-black/[0.08]',
        )}
      />

      <div className="relative overflow-hidden rounded-[8px]">
        <div
          className={cn(
            'relative max-h-[340px] overflow-y-auto px-4 pt-3.5 [scrollbar-width:thin]',
            showSource && source ? 'pb-8' : 'pb-3.5',
          )}
        >
          {stepsHtml ? (
            <>
              <button
                type="button"
                onClick={onCopy}
                title={copied ? '已复制' : '复制内容'}
                aria-label="复制内容"
                className="absolute top-2.5 right-2.5 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-[5px] border-0 bg-transparent p-0 text-[#94a0ae] transition-colors hover:bg-black/[0.05] hover:text-[#1f2937]"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.2} />
                ) : (
                  <Copy className="h-3.5 w-3.5" strokeWidth={1.9} />
                )}
              </button>
              <div
                className="card-rich cursor-text select-text pr-6 text-[13px] leading-[1.68] text-[#3c4a5a]"
                dangerouslySetInnerHTML={{ __html: stepsHtml }}
              />
            </>
          ) : (
            <div className="text-[12.5px] text-[#9aa3af]">暂无步骤摘要，点击查看原文档</div>
          )}
        </div>

        {showSource && source && (
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              e.stopPropagation();
              onLinkClick();
            }}
            className="absolute right-0 bottom-0 inline-flex max-w-[68%] items-center gap-1 overflow-hidden rounded-tl-[7px] border-t border-l border-gray-200 bg-card px-[9px] py-[5px] text-[10.5px] whitespace-nowrap text-foreground text-ellipsis no-underline transition-colors hover:bg-[#f6f8fb]"
          >
            <LinkGlyph size={10} className="shrink-0" />
            <span className="truncate">{source.host}</span>
          </a>
        )}
      </div>
    </div>
  </div>
);

/**
 * 知识瀑布流卡片：单条展示标题 + 步骤摘要；同文档多条自动聚合为索引轨折页卡（hover 展开步骤，点击一步进弹窗）
 */
const KnowledgeCardMymindInner: React.FC<KnowledgeCardMymindProps> = ({
  item,
  onClick,
  onFocusOpen,
  index,
  canSelect = false,
  selectionActive = false,
  selected = false,
  selectedIdSet,
  onToggleSelect,
  canDrag = false,
  onDragStartCard,
  onDragEndCard,
  onContextMenuCard,
  onActiveItemChange,
  onOverlayOpenChange,
  isOtherPreviewActive = false,
  disableSideOverlay = false,
}) => {
  const groupedItems = item.grouped_items && item.grouped_items.length > 1 ? item.grouped_items : null;
  const [activeGroupIdx, setActiveGroupIdx] = React.useState(0);
  const [hoverOverlay, setHoverOverlay] = React.useState<{
    idx: number;
    top: number;
    arrowTop: number;
    side: 'right' | 'left';
  } | null>(null);
  const [singleCanScrollMore, setSingleCanScrollMore] = React.useState(false);
  const [isOverlayPinned, setIsOverlayPinned] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<number | null>(null);
  const hoverTimerRef = React.useRef<number | null>(null);
  const closeTimerRef = React.useRef<number | null>(null);
  const copyTimerRef = React.useRef<number | null>(null);
  const cardRootRef = React.useRef<HTMLDivElement | null>(null);
  const singleBodyRef = React.useRef<HTMLDivElement | null>(null);
  const onOverlayOpenChangeRef = React.useRef(onOverlayOpenChange);
  onOverlayOpenChangeRef.current = onOverlayOpenChange;

  const syncSingleScrollFade = React.useCallback(() => {
    const el = singleBodyRef.current;
    if (!el) {
      setSingleCanScrollMore(false);
      return;
    }
    setSingleCanScrollMore(
      el.scrollHeight > el.clientHeight + 2
      && el.scrollTop + el.clientHeight < el.scrollHeight - 4,
    );
  }, []);

  React.useLayoutEffect(() => {
    if (groupedItems) return;
    syncSingleScrollFade();
    const el = singleBodyRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(syncSingleScrollFade);
    observer.observe(el);
    return () => observer.disconnect();
  }, [groupedItems, item.content_preview, syncSingleScrollFade]);

  React.useEffect(() => {
    setActiveGroupIdx(0);
    setHoverOverlay(null);
    setIsOverlayPinned(false);
  }, [item.id, groupedItems?.length]);

  React.useEffect(() => {
    if (!isOtherPreviewActive) return;
    setHoverOverlay(null);
    setIsOverlayPinned(false);
  }, [isOtherPreviewActive]);

  const isOverlayOpen = hoverOverlay !== null;
  React.useEffect(() => {
    onOverlayOpenChangeRef.current?.(isOverlayOpen);
  }, [isOverlayOpen]);

  React.useEffect(() => () => {
    onOverlayOpenChangeRef.current?.(false);
  }, []);

  // 点击外部或按 Esc 解除锁定并收起浮层
  React.useEffect(() => {
    if (!isOverlayPinned) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (cardRootRef.current && !cardRootRef.current.contains(event.target as Node)) {
        setIsOverlayPinned(false);
        setHoverOverlay(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOverlayPinned(false);
        setHoverOverlay(null);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOverlayPinned]);

  React.useEffect(() => {
    if (!onActiveItemChange) return;
    const current = groupedItems ? (groupedItems[activeGroupIdx] ?? groupedItems[0]) : item;
    if (current) onActiveItemChange(current);
  }, [activeGroupIdx, groupedItems, item, onActiveItemChange]);

  React.useEffect(() => () => {
    if (hoverTimerRef.current !== null) window.clearTimeout(hoverTimerRef.current);
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
  }, []);

  const cancelClose = React.useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = React.useCallback(() => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    // 点击链接跳转新标签或切窗口失焦时保持浮层不消失，切回来仍可继续看步骤
    if (isOverlayPinned || document.hidden || !document.hasFocus()) {
      if (hoverOverlay !== null) {
        setIsOverlayPinned(true);
      }
      return;
    }
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => {
      if (document.hidden || !document.hasFocus()) {
        setIsOverlayPinned(true);
        return;
      }
      setHoverOverlay(null);
    }, 110);
  }, [cancelClose, hoverOverlay, isOverlayPinned]);

  const pinOverlay = React.useCallback(() => {
    cancelClose();
    setIsOverlayPinned(true);
  }, [cancelClose]);

  const handleCopySteps = React.useCallback((e: React.MouseEvent, target: KnowledgeListItem) => {
    e.preventDefault();
    e.stopPropagation();
    const plainText = plain(sanitizeStepsHtml(target.content_preview || ''));
    if (!plainText) return;
    void navigator.clipboard?.writeText(plainText);
    setCopiedId(target.id);
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopiedId(null), 1500);
  }, []);

  const singleStepsHtml = React.useMemo(
    () => (groupedItems ? '' : sanitizeStepsHtml(item.content_preview || '')),
    [groupedItems, item.content_preview],
  );

  const safeGroupedIdx = groupedItems
    ? (activeGroupIdx < groupedItems.length ? activeGroupIdx : 0)
    : 0;
  const activeGroupedOverlayItem = groupedItems && hoverOverlay
    ? (groupedItems[hoverOverlay.idx] ?? groupedItems[safeGroupedIdx])
    : null;
  const overlayStepsHtml = React.useMemo(
    () => (activeGroupedOverlayItem ? sanitizeStepsHtml(activeGroupedOverlayItem.content_preview || '') : ''),
    [activeGroupedOverlayItem],
  );

  if (groupedItems) {
    const safeIdx = safeGroupedIdx;
    const activeItem = groupedItems[safeIdx];
    const overlayItem = activeGroupedOverlayItem;
    const anyRowSelected = canSelect && (
      selectedIdSet
        ? groupedItems.some((row) => selectedIdSet.has(row.id))
        : selected
    );
    const activeSource = getSourceHost(overlayItem ?? activeItem);
    const headerSpace = activeItem.space_tag ?? item.space_tag;
    const accentColor = headerSpace?.color || 'var(--theme-primary)';
    const { headerTitle, displayTitles } = resolveGroupPresentation(item.section, groupedItems);
    // 按实际数量渲染底部叠纸层数（克制上限 2 层，贴合瀑布流竖向紧凑节奏）
    const extraLayers = Math.min(groupedItems.length - 1, 2);
    const isLongList = groupedItems.length > 10;

    const scheduleHoverOverlay = (rowIdx: number, rowEl: HTMLDivElement) => {
      cancelClose();
      if (disableSideOverlay) {
        setActiveGroupIdx(rowIdx);
        return;
      }
      if (hoverOverlay?.idx !== rowIdx) {
        setIsOverlayPinned(false);
      }
      if (hoverTimerRef.current !== null) {
        window.clearTimeout(hoverTimerRef.current);
      }
      const computeAndShow = () => {
        setActiveGroupIdx(rowIdx);
        const rootEl = cardRootRef.current;
        if (!rootEl) return;
        const rootRect = rootEl.getBoundingClientRect();
        const rowRect = rowEl.getBoundingClientRect();
        const popoverWidth = 324;
        const preferLeft = Boolean(onActiveItemChange) && rootRect.left > popoverWidth + 24;
        const fitsRight = rootRect.right + popoverWidth + 20 <= window.innerWidth;
        const side: 'right' | 'left' = preferLeft || !fitsRight ? 'left' : 'right';
        // 与当前 hover 行上沿轻柔齐平，临近视口底部时自动微抬避免出屏
        let top = Math.max(4, Math.round(rowRect.top - rootRect.top - 8));
        const estimatedHeight = 160;
        const overflowBottom = rootRect.top + top + estimatedHeight - (window.innerHeight - 16);
        if (overflowBottom > 0) {
          top = Math.max(4, top - overflowBottom);
        }
        const rowCenterRel = rowRect.top - rootRect.top + rowRect.height / 2;
        const arrowTop = Math.max(14, Math.min(120, Math.round(rowCenterRel - top - 5)));
        setHoverOverlay({ idx: rowIdx, top, arrowTop, side });
      };
      // 已展开时跟手即时切换，初次移入略作防抖避免误扫闪烁
      if (hoverOverlay !== null) {
        computeAndShow();
      } else {
        hoverTimerRef.current = window.setTimeout(computeAndShow, 65);
      }
    };

    return (
      <div
        ref={cardRootRef}
        className="group relative hover:z-30 [break-inside:avoid]"
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
        style={{
          paddingBottom: extraLayers * 3,
          animation: 'mymind-appear .25s ease both',
          animationDelay: `${Math.min(index, 24) * 0.015}s`,
        }}
      >
        {/* 底部轻叠纸边缘 */}
        {Array.from({ length: extraLayers }, (_, idx) => {
          const step = extraLayers - idx;
          const insetX = step * 5;
          const bottom = (extraLayers - step) * 3;
          const opacity = Math.max(0.55, 0.92 - (step - 1) * 0.16);
          return (
            <div
              key={step}
              aria-hidden="true"
              className="pointer-events-none absolute h-[14px] rounded-[7px] border border-black/[0.06] bg-card shadow-[0_2px_5px_rgba(0,0,0,0.04)] transition-transform duration-200 ease-out group-hover:translate-y-[var(--stack-shift)]"
              style={{
                left: insetX,
                right: insetX,
                bottom,
                zIndex: idx,
                opacity,
                ['--stack-shift' as string]: `${step * 1.1}px`,
              }}
            />
          );
        })}

        <div
          draggable={canDrag}
          onDragStart={(e) => {
            if (!canDrag) return;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/lms-knowledge-id', String(activeItem.id));
            setCleanDragImage(e);
            onDragStartCard?.(activeItem);
          }}
          onDragEnd={() => {
            onDragEndCard?.();
          }}
          onContextMenu={(e) => {
            onContextMenuCard?.(e, activeItem);
          }}
          className={cn(
            'relative z-10 flex flex-col overflow-hidden rounded-[9px] border bg-card shadow-[0_2px_10px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow] duration-[180ms]',
            anyRowSelected
              ? 'border-primary/40 ring-1 ring-primary/20'
              : 'border-black/[0.06] hover:border-black/[0.14] hover:shadow-[0_6px_20px_rgba(15,23,42,0.09)]',
          )}
        >
          {/* 右上角：hover 浮现专注球（同时让篇数淡出避让，不再挤在一起） */}
          {onFocusOpen && !(canSelect && selectionActive) ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFocusOpen((overlayItem ?? activeItem).id);
              }}
              className="absolute top-[8px] right-[10px] z-[4] flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 opacity-0 transition-opacity duration-180 group-hover:opacity-100"
              title="专注"
              aria-label="专注"
            >
              <FocusOrbIcon size={16} interactive />
            </button>
          ) : null}

          {/* 顶部分组抬头（优先所属系统，无系统时自动提取公共前缀，每张关联卡都有清晰视觉锚点） */}
          {headerTitle ? (
            <div className="flex shrink-0 items-center justify-between gap-2 px-5 pt-4 pb-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-[7px] w-[7px] shrink-0 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
                <span className="truncate text-[13.5px] font-semibold tracking-tight text-[#1f2937]">
                  {headerTitle}
                </span>
              </div>
              <span
                className={cn(
                  'shrink-0 text-[11px] tabular-nums text-[#9aa3af] transition-opacity duration-150',
                  onFocusOpen && !(canSelect && selectionActive) && 'group-hover:opacity-0',
                )}
              >
                {groupedItems.length} 篇
              </span>
            </div>
          ) : null}

          {/* 主体目录区：静态纯展示精简去重后的场景标题 */}
          <div className="relative">
            <div
              onScroll={() => {
                if (hoverOverlay) setHoverOverlay(null);
              }}
              className={cn(
                'max-h-[344px] space-y-0.5 overflow-y-auto px-3.5 pb-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                headerTitle ? 'pt-0.5' : 'pt-3.5 pr-9',
              )}
            >
              {groupedItems.map((row, rowIdx) => {
                const isHoveredRow = disableSideOverlay ? rowIdx === safeIdx : hoverOverlay?.idx === rowIdx;
                const rowSelected = canSelect && Boolean(selectedIdSet?.has(row.id));
                const rowAccent = row.space_tag?.color || accentColor;

                return (
                  <div
                    key={row.id}
                    onMouseEnter={(e) => {
                      scheduleHoverOverlay(rowIdx, e.currentTarget);
                    }}
                    onMouseDown={(e) => {
                      if (canSelect && (e.shiftKey || selectionActive)) {
                        e.preventDefault();
                      }
                    }}
                    onContextMenu={(e) => {
                      e.stopPropagation();
                      onContextMenuCard?.(e, row);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canSelect && (e.shiftKey || selectionActive)) {
                        e.preventDefault();
                        onToggleSelect?.(row.id);
                        return;
                      }
                      onClick(row.id);
                    }}
                    className={cn(
                      'group/row relative cursor-pointer rounded-[6px] py-[5.5px] pr-2.5 pl-3.5 transition-colors duration-150',
                      rowSelected
                        ? 'bg-primary/[0.07]'
                        : isHoveredRow
                          ? 'bg-[#f1f5f9]'
                          : 'hover:bg-[#f6f8fb]',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute top-1/2 left-1 w-[2.5px] -translate-y-1/2 rounded-full transition-[height,background-color,opacity] duration-180 ease-out"
                      style={{
                        height: isHoveredRow ? '15px' : '4px',
                        backgroundColor: isHoveredRow ? rowAccent : '#cbd5e1',
                        opacity: isHoveredRow ? 1 : 0.75,
                      }}
                    />
                    <h3
                      className={cn(
                        'm-0 truncate text-[13.5px] leading-[1.45] transition-colors duration-150',
                        isHoveredRow
                          ? 'font-medium text-[#111827]'
                          : 'font-normal text-[#556374] group-hover/row:text-[#111827]',
                      )}
                    >
                      {displayTitles[rowIdx]}
                    </h3>
                  </div>
                );
              })}
            </div>

            {/* 超长列表未展开遮罩时的底部轻柔渐隐提示（替代粗灰滚动条） */}
            {isLongList && !hoverOverlay ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card via-card/80 to-transparent"
              />
            ) : null}
          </div>
        </div>

        {/* 侧边悬浮步骤卡：100% 不透明纯白 + 指向箭头 + 高海拔投影 + 右下角相关链接 */}
        {hoverOverlay && overlayItem ? (
          <SidePreviewPopover
            itemKey={overlayItem.id}
            stepsHtml={overlayStepsHtml}
            source={activeSource}
            showSource={!(canSelect && selectionActive)}
            top={hoverOverlay.top}
            arrowTop={hoverOverlay.arrowTop}
            side={hoverOverlay.side}
            copied={copiedId === overlayItem.id}
            onCopy={(e) => handleCopySteps(e, overlayItem)}
            onLinkClick={pinOverlay}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          />
        ) : null}
      </div>
    );
  }

  const stepsHtml = singleStepsHtml;
  const source = getSourceHost(item);

  return (
    <div
      ref={cardRootRef}
      className="group relative hover:z-30 [break-inside:avoid]"
      style={{
        animation: 'mymind-appear .25s ease both',
        animationDelay: `${Math.min(index, 24) * 0.015}s`,
      }}
    >
      <div
        draggable={canDrag}
        onDragStart={(e) => {
          if (!canDrag) return;
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/lms-knowledge-id', String(item.id));
          setCleanDragImage(e);
          onDragStartCard?.(item);
        }}
        onDragEnd={() => {
          onDragEndCard?.();
        }}
        onContextMenu={(e) => {
          onContextMenuCard?.(e, item);
        }}
        onMouseDown={(e) => {
          if (canSelect && (e.shiftKey || selectionActive)) {
            e.preventDefault();
          }
        }}
        onClick={(e) => {
          if (canSelect && (e.shiftKey || selectionActive)) {
            e.preventDefault();
            onToggleSelect?.(item.id);
            return;
          }
          onClick(item.id);
        }}
        className={cn(
          'relative cursor-pointer overflow-hidden rounded-[9px] border bg-card px-6 py-[22px] shadow-[0_2px_10px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow] duration-[180ms]',
          canSelect && selected
            ? 'border-primary/40 ring-1 ring-primary/20'
            : 'border-black/[0.06] hover:border-black/[0.14] hover:shadow-[0_6px_20px_rgba(15,23,42,0.09)]',
        )}
      >
        {onFocusOpen && !(canSelect && selectionActive) ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFocusOpen(item.id);
            }}
            className="absolute top-[10px] right-[10px] z-[3] flex h-7 w-7 items-center justify-center rounded-full border-none bg-transparent p-0 opacity-0 transition-opacity duration-180 group-hover:opacity-100"
            title="专注"
            aria-label="专注"
          >
            <FocusOrbIcon size={16} interactive />
          </button>
        ) : null}

        {(item.section || item.space_tag) ? (
          <div className="mb-2 flex items-center gap-1.5 pr-6">
            <span
              aria-hidden="true"
              className="h-[6px] w-[6px] shrink-0 rounded-full"
              style={{ backgroundColor: item.space_tag?.color || 'var(--theme-primary)' }}
            />
            <span className="truncate text-[11.5px] font-medium text-[#8a94a3]">
              {item.section || item.space_tag?.name}
            </span>
          </div>
        ) : null}

        {item.title ? (
          <h3 className="m-0 mb-2.5 line-clamp-2 text-[15.5px] leading-[1.45] font-semibold text-[#1f2937]">
            {item.title}
          </h3>
        ) : null}

        {stepsHtml ? (
          <div className="relative -mx-6">
            <div
              ref={singleBodyRef}
              onScroll={syncSingleScrollFade}
              className="card-rich scrollbar-subtle max-h-[234px] overflow-y-auto px-6 pb-1 text-[13.5px] leading-[1.72] text-[#5c6a7a]"
              dangerouslySetInnerHTML={{ __html: stepsHtml }}
            />
            {singleCanScrollMore ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-card via-card/85 to-transparent"
              />
            ) : null}
          </div>
        ) : null}

        {!(canSelect && selectionActive) && source && (
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-none absolute right-0 bottom-0 inline-flex max-w-[62%] translate-y-1 items-center gap-1 overflow-hidden rounded-tl-[7px] border border-gray-200 bg-card px-[9px] py-[5px] text-[10.5px] whitespace-nowrap text-foreground opacity-0 text-ellipsis no-underline transition-[opacity,transform] duration-160 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100"
          >
            <LinkGlyph size={10} />
            {source.host}
          </a>
        )}
      </div>
    </div>
  );
};

export const KnowledgeCardMymind = React.memo(KnowledgeCardMymindInner);
