import * as React from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Circle, Hash, Maximize2, Pin, PinOff, Trash2 } from 'lucide-react';

import { TagInput } from '@/components/tags/tag-input';
import { plain, sanitizeStepsHtml } from '@/lib/knowledge-content';
import { cn } from '@/lib/utils';
import type { SimpleTag } from '@/types/common';
import type { KnowledgeListItem } from '@/types/knowledge';
import { SpacePickerList } from './shared/space-picker-list';

/**
 * 为原生 HTML5 拖拽生成透明底圆角拖影，避免浏览器把圆角外的父容器底色一并截出四个尖角
 */
export function setCleanDragImage(event: React.DragEvent<HTMLElement>) {
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.position = 'fixed';
  clone.style.top = '-9999px';
  clone.style.left = '-9999px';
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.margin = '0';
  clone.style.boxShadow = 'none';
  clone.style.opacity = '1';
  clone.style.transform = 'none';
  clone.style.pointerEvents = 'none';
  document.body.appendChild(clone);
  event.dataTransfer.setDragImage(clone, event.clientX - rect.left, event.clientY - rect.top);
  window.requestAnimationFrame(() => clone.remove());
}

interface KnowledgePinnedBarProps {
  items: KnowledgeListItem[];
  canManage: boolean;
  draggingItem: KnowledgeListItem | null;
  onOpen: (id: number) => void;
  onPin: (item: KnowledgeListItem) => void;
  onUnpin: (item: KnowledgeListItem) => void;
  onContextMenuCard: (event: React.MouseEvent, item: KnowledgeListItem) => void;
}

/**
 * 顶部置顶托盘（参考 Top of Mind）：
 * - 有置顶知识时常驻展示；管理态拖动下方未置顶卡片时自动展开投放区
 * - 拖入托盘即置顶；托盘内卡片拖出托盘外松手即取消置顶
 */
export const KnowledgePinnedBar: React.FC<KnowledgePinnedBarProps> = ({
  items,
  canManage,
  draggingItem,
  onOpen,
  onPin,
  onUnpin,
  onContextMenuCard,
}) => {
  const barRef = React.useRef<HTMLDivElement | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [draggingPinnedId, setDraggingPinnedId] = React.useState<number | null>(null);

  const isDraggingUnpinned = Boolean(
    canManage && draggingItem && !items.some((item) => item.id === draggingItem.id),
  );
  const visible = items.length > 0 || isDraggingUnpinned;

  React.useEffect(() => {
    if (!draggingItem) {
      setIsDragOver(false);
    }
  }, [draggingItem]);

  if (!visible) return null;

  const handleDragOver = (event: React.DragEvent) => {
    if (!canManage || !isDraggingUnpinned) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    if (barRef.current?.contains(event.relatedTarget as Node | null)) return;
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    if (!canManage || !draggingItem) return;
    if (!items.some((item) => item.id === draggingItem.id)) {
      onPin(draggingItem);
    }
  };

  return (
    <div
      ref={barRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative flex min-h-[164px] w-full shrink-0 items-center overflow-hidden rounded-[10px] bg-black/[0.045] transition-colors duration-200',
        isDragOver && 'bg-black/[0.075] ring-1 ring-black/15',
      )}
    >
      <div className="flex min-w-0 flex-1 items-stretch gap-3 overflow-x-auto overflow-y-hidden px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const previewText = plain(sanitizeStepsHtml(item.content_preview || ''));
          const isBeingDragged = draggingPinnedId === item.id;
          return (
            <div
              key={item.id}
              draggable={canManage}
              onDragStart={(event) => {
                if (!canManage) return;
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/lms-pinned-id', String(item.id));
                setCleanDragImage(event);
                setDraggingPinnedId(item.id);
              }}
              onDragEnd={(event) => {
                setDraggingPinnedId(null);
                const rect = barRef.current?.getBoundingClientRect();
                if (!rect) return;
                const { clientX, clientY } = event;
                // 拖到托盘外松手即取消置顶（clientX/Y 为 0 表示取消拖拽）
                if (clientX === 0 && clientY === 0) return;
                const inside = (
                  clientX >= rect.left
                  && clientX <= rect.right
                  && clientY >= rect.top
                  && clientY <= rect.bottom
                );
                if (!inside) {
                  onUnpin(item);
                }
              }}
              onClick={() => onOpen(item.id)}
              onContextMenu={(event) => onContextMenuCard(event, item)}
              className={cn(
                'flex h-[132px] w-[132px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-[7px] bg-white p-3 text-left [box-shadow:0_2px_6px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] transition-[box-shadow,opacity,transform] duration-200 hover:[box-shadow:0_8px_16px_rgba(0,0,0,0.12),4px_8px_14px_rgba(0,0,0,0.08)]',
                isBeingDragged && 'scale-95 opacity-45',
              )}
            >
              {item.title ? (
                <div className="line-clamp-2 text-[13px] leading-[1.35] font-semibold text-[#1a1a1a]">
                  {item.title}
                </div>
              ) : null}
              {previewText ? (
                <div className="mt-1.5 line-clamp-4 text-[11.5px] leading-[1.45] text-[#666]">
                  {previewText}
                </div>
              ) : !item.title ? (
                <div className="text-[12px] text-text-muted/60">未命名知识</div>
              ) : null}
            </div>
          );
        })}

        {isDraggingUnpinned && (
          <div
            className={cn(
              'flex h-[132px] w-[132px] shrink-0 flex-col items-center justify-center rounded-[7px] border-2 border-dashed px-3 text-center text-[12.5px] leading-snug font-medium transition-colors duration-150',
              isDragOver
                ? 'border-gray-400 bg-white/75 text-gray-700'
                : 'border-gray-300 bg-white/40 text-gray-400',
            )}
          >
            <span>松手置顶</span>
            <span className="mt-0.5 text-[11px] font-normal opacity-80">放进置顶栏</span>
          </div>
        )}
      </div>
    </div>
  );
};

export interface KnowledgeContextMenuState {
  item: KnowledgeListItem;
  x: number;
  y: number;
}

interface KnowledgeCardContextMenuProps {
  menu: KnowledgeContextMenuState | null;
  spaces: SimpleTag[];
  canUpdate: boolean;
  canCreateSpace?: boolean;
  canDelete: boolean;
  isBusy?: boolean;
  onClose: () => void;
  onTogglePin: (item: KnowledgeListItem) => void;
  onUpdateTags: (item: KnowledgeListItem, nextTags: SimpleTag[]) => void | Promise<void>;
  onSelectSpace: (item: KnowledgeListItem, spaceId: number | null) => void | Promise<void>;
  onCreateSpace: (item: KnowledgeListItem, payload: { name: string; color: string }) => void | Promise<void>;
  onFocusOpen: (id: number) => void;
  onDelete: (id: number) => void;
}

type ContextMenuPanel = 'menu' | 'tags' | 'space';

export const KnowledgeCardContextMenu: React.FC<KnowledgeCardContextMenuProps> = ({
  menu,
  spaces,
  canUpdate,
  canCreateSpace = false,
  canDelete,
  isBusy = false,
  onClose,
  onTogglePin,
  onUpdateTags,
  onSelectSpace,
  onCreateSpace,
  onFocusOpen,
  onDelete,
}) => {
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const [panel, setPanel] = React.useState<ContextMenuPanel>('menu');
  const [localTags, setLocalTags] = React.useState<SimpleTag[]>([]);

  React.useEffect(() => {
    setPanel('menu');
    setLocalTags(menu?.item.tags ?? []);
  }, [menu]);

  React.useEffect(() => {
    if (!menu) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node | null)) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (panel !== 'menu') {
        setPanel('menu');
        return;
      }
      onClose();
    };
    const handleScroll = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node | null)) return;
      onClose();
    };
    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [menu, onClose, panel]);

  if (!menu) return null;

  const panelWidth = panel === 'tags' ? 288 : panel === 'space' ? 224 : 188;
  const panelHeight = panel === 'tags' ? 240 : panel === 'space' ? 280 : 212;
  const left = Math.min(menu.x, Math.max(8, window.innerWidth - panelWidth - 8));
  const top = Math.min(menu.y, Math.max(8, window.innerHeight - panelHeight - 8));
  const isPinned = Boolean(menu.item.is_pinned);

  const handleAddTag = (tag: SimpleTag) => {
    if (localTags.some((t) => t.id === tag.id)) return;
    const next = [...localTags, tag];
    setLocalTags(next);
    void onUpdateTags(menu.item, next);
  };

  const handleRemoveTag = (tagId: number) => {
    const next = localTags.filter((t) => t.id !== tagId);
    setLocalTags(next);
    void onUpdateTags(menu.item, next);
  };

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      onContextMenu={(event) => event.preventDefault()}
      style={{ left, top, width: panelWidth }}
      className="fixed z-50 overflow-hidden rounded-[12px] bg-white shadow-[0_12px_36px_rgba(15,23,42,0.16),0_2px_8px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]"
    >
      {panel === 'menu' ? (
        <div className="p-1.5">
          {canUpdate && (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => setPanel('tags')}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-3 py-2 text-left text-[13.5px] font-medium text-foreground transition-colors hover:bg-[#f1f4f9]"
              >
                <Hash className="h-4 w-4 text-foreground/70" strokeWidth={1.8} />
                <span>添加标签</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => setPanel('space')}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-3 py-2 text-left text-[13.5px] font-medium text-foreground transition-colors hover:bg-[#f1f4f9]"
              >
                <Circle className="h-4 w-4 text-foreground/70" strokeWidth={1.8} />
                <span>移至空间</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onTogglePin(menu.item);
                  onClose();
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-3 py-2 text-left text-[13.5px] font-medium text-foreground transition-colors hover:bg-[#f1f4f9]"
              >
                {isPinned ? (
                  <PinOff className="h-4 w-4 text-foreground/70" strokeWidth={1.8} />
                ) : (
                  <Pin className="h-4 w-4 text-foreground/70" strokeWidth={1.8} />
                )}
                <span>{isPinned ? '取消置顶' : '置顶知识'}</span>
              </button>
            </>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onFocusOpen(menu.item.id);
              onClose();
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-3 py-2 text-left text-[13.5px] font-medium text-foreground transition-colors hover:bg-[#f1f4f9]"
          >
            <Maximize2 className="h-4 w-4 text-foreground/70" strokeWidth={1.8} />
            <span>专注阅读</span>
          </button>

          {canDelete && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onDelete(menu.item.id);
                onClose();
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-3 py-2 text-left text-[13.5px] font-medium text-destructive transition-colors hover:bg-destructive/8"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.8} />
              <span>删除知识</span>
            </button>
          )}
        </div>
      ) : panel === 'tags' ? (
        <div className="bg-[#f4f6f9] p-3 pb-1">
          <div className="mb-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPanel('menu')}
              aria-label="返回"
              className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-text-muted transition-colors hover:bg-black/[0.05] hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[12.5px] font-semibold text-foreground">添加标签</span>
          </div>
          <TagInput
            applicableTo="knowledge"
            selectedTags={localTags}
            onAdd={handleAddTag}
            onRemove={handleRemoveTag}
          />
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-1.5 border-b border-border/50 px-2.5 py-2">
            <button
              type="button"
              onClick={() => setPanel('menu')}
              aria-label="返回"
              className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-text-muted transition-colors hover:bg-black/[0.05] hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[12.5px] font-semibold text-foreground">移至空间</span>
          </div>
          <SpacePickerList
            spaces={spaces}
            selectedSpaceId={menu.item.space_tag?.id ?? null}
            showUnassign={Boolean(menu.item.space_tag?.id)}
            canCreate={canCreateSpace}
            disabled={isBusy}
            onSelect={async (spaceId) => {
              await onSelectSpace(menu.item, spaceId);
              onClose();
            }}
            onCreate={async (payload) => {
              await onCreateSpace(menu.item, payload);
              onClose();
            }}
          />
        </div>
      )}
    </div>,
    document.body,
  );
};
