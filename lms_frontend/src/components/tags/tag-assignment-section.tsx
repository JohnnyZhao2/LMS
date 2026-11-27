import * as React from 'react';
import {
  Box,
  Layers,
  Monitor,
  Plus,
  X,
} from 'lucide-react';

import { TagInput } from '@/components/tags/tag-input';
import { cn } from '@/lib/utils';

export interface TagChipItem {
  id: number;
  name?: string;
  category?: string;
}

/** 按标签分类或分组状态返回语义图标（普通标签不加图标） */
export function renderTagCategoryIcon(
  category?: string,
  isGroupTag?: boolean,
  className = 'h-[12px] w-[12px] shrink-0 text-[#6e7b8b]',
): React.ReactNode {
  if (isGroupTag) {
    return <Layers className={className} strokeWidth={1.8} />;
  }
  const cat = (category || '').trim();
  if (!cat) return null;
  if (cat.includes('系统') || cat.includes('分组')) {
    return <Layers className={className} strokeWidth={1.8} />;
  }
  if (cat.includes('平台') || cat.includes('工具')) {
    return <Monitor className={className} strokeWidth={1.8} />;
  }
  if (cat.includes('对象') || cat.includes('集群') || cat.includes('节点') || cat.includes('服务')) {
    return <Box className={className} strokeWidth={1.8} />;
  }
  return null;
}

/** 排序权重：分组/系统 → 执行平台 → 应急对象 → 普通标签 */
function getTagSortWeight(tag: TagChipItem, activeGroupTagName: string): number {
  const name = (tag.name || '').trim();
  if (activeGroupTagName && name === activeGroupTagName) return 0;
  const cat = (tag.category || '').trim();
  if (cat.includes('系统') || cat.includes('分组')) return 1;
  if (cat.includes('平台') || cat.includes('工具')) return 2;
  if (cat.includes('对象') || cat.includes('集群') || cat.includes('节点') || cat.includes('服务')) return 3;
  return 4;
}

/** 估算单个标签胶囊的视觉像素宽度，用于按行紧致装箱避免长标签后留下大段空白 */
function estimateTagPillWidth(tag: TagChipItem, normalizedGroup: string): number {
  const name = (tag.name ?? `#${tag.id}`).trim();
  const isGroupTag = Boolean(normalizedGroup && tag.name && name === normalizedGroup);
  const hasIcon = Boolean(renderTagCategoryIcon(tag.category, isGroupTag));
  let textWidth = 0;
  for (const ch of name) {
    if (ch.charCodeAt(0) > 255) {
      textWidth += 12.6;
    } else if (/[il1I.,:;()\-/ ]/.test(ch)) {
      textWidth += 5.4;
    } else {
      textWidth += 7.4;
    }
  }
  return Math.ceil(textWidth + (hasIcon ? 19 : 0) + 26);
}

/** 保持语义优先级的同时按行贪心补位，把较短标签填入长标签后方的剩余空间 */
function packTagsForWidth(
  tags: TagChipItem[],
  containerWidth: number,
  firstRowUsedWidth: number,
  normalizedGroup: string,
  gap = 6,
): TagChipItem[] {
  if (tags.length <= 2 || containerWidth <= 140) return tags;
  const pool = tags.map((tag) => ({
    tag,
    width: estimateTagPillWidth(tag, normalizedGroup),
  }));
  const packed: TagChipItem[] = [];
  let remaining = Math.max(0, containerWidth - firstRowUsedWidth);

  while (pool.length > 0) {
    const fitIndex = pool.findIndex((item) => item.width <= remaining);
    if (fitIndex !== -1) {
      const [picked] = pool.splice(fitIndex, 1);
      packed.push(picked.tag);
      remaining -= picked.width + gap;
    } else {
      const [first] = pool.splice(0, 1);
      packed.push(first.tag);
      remaining = Math.max(0, containerWidth - first.width - gap);
    }
  }
  return packed;
}

interface TagAssignmentSectionProps {
  applicableTo: 'knowledge' | 'question';
  title?: string;
  canEdit?: boolean;
  selectedTags: TagChipItem[];
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onAdd: (tag: { id: number; name: string; category?: string }) => void;
  onRemove: (tagId: number) => void;
  /** 当前被设为拆卡分组的标签名（可选） */
  activeGroupTagName?: string;
  /** 点击标签切换为/取消拆卡分组（可选） */
  onToggleGroupTag?: (tagName: string) => void;
  /** 超过一定高度时底部渐隐折叠的背景色（默认透明不折叠，传入如 #eef2f6 启用 Mymind 渐隐折叠） */
  collapseFadeColor?: string;
  /** 折叠态最大高度（px） */
  collapsedMaxHeight?: number;
  /** 将添加按钮作为亮色首胶囊排在标签流首位（Mymind 风格） */
  inlineAddButton?: boolean;
  /** 首胶囊文案 */
  addButtonLabel?: string;
  className?: string;
  labelClassName?: string;
  headerClassName?: string;
  addButtonClassName?: string;
  tagsWrapClassName?: string;
  tagClassName?: string;
  removeButtonClassName?: string;
}

export const TagAssignmentSection: React.FC<TagAssignmentSectionProps> = ({
  applicableTo,
  title = '标签',
  canEdit = true,
  selectedTags,
  expanded,
  onExpandedChange,
  onAdd,
  onRemove,
  activeGroupTagName,
  onToggleGroupTag,
  collapseFadeColor,
  collapsedMaxHeight = 104,
  inlineAddButton = false,
  addButtonLabel = '添加标签',
  className = 'mb-[18px]',
  labelClassName = 'text-[10px] font-bold uppercase tracking-[0.1em] text-[#a0a8b0]',
  headerClassName = 'mb-[10px] flex items-center justify-between gap-3',
  addButtonClassName = 'inline-flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-[#a0a8b0] transition hover:bg-white/30 hover:text-[#526277]',
  tagsWrapClassName = 'flex flex-wrap items-center gap-[7px]',
  tagClassName = 'inline-flex items-center gap-[5px] rounded-[100px] bg-[#e0e3e8] px-[11px] py-1 text-[12px] text-[#555]',
}) => {
  const normalizedGroup = (activeGroupTagName || '').trim();
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState(332);
  const [isOverflowing, setIsOverflowing] = React.useState(false);
  const [isTagsExpanded, setIsTagsExpanded] = React.useState(false);

  const showInlineAddPill = Boolean(inlineAddButton && canEdit && !expanded);

  const sortedTags = React.useMemo(() => {
    const baseSorted = [...selectedTags].sort(
      (a, b) => getTagSortWeight(a, normalizedGroup) - getTagSortWeight(b, normalizedGroup),
    );
    if (!inlineAddButton && !collapseFadeColor) {
      return baseSorted;
    }
    const addPillWidth = showInlineAddPill ? Math.ceil(addButtonLabel.length * 12.6 + 44) : 0;
    return packTagsForWidth(baseSorted, containerWidth, addPillWidth, normalizedGroup, 6);
  }, [
    addButtonLabel,
    collapseFadeColor,
    containerWidth,
    inlineAddButton,
    normalizedGroup,
    selectedTags,
    showInlineAddPill,
  ]);

  // 监测标签容器宽度与是否超出折叠高度
  React.useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const check = () => {
      const usableWidth = Math.max(0, el.clientWidth - 8);
      if (usableWidth > 0) {
        setContainerWidth((prev) => (Math.abs(prev - usableWidth) > 4 ? usableWidth : prev));
      }
      if (collapseFadeColor) {
        setIsOverflowing(el.scrollHeight > collapsedMaxHeight + 10);
      } else {
        setIsOverflowing(false);
      }
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [collapseFadeColor, collapsedMaxHeight, sortedTags, inlineAddButton, expanded]);

  // 标签减少到无需折叠时自动复位
  React.useEffect(() => {
    if (!isOverflowing && isTagsExpanded) {
      setIsTagsExpanded(false);
    }
  }, [isOverflowing, isTagsExpanded]);

  const shouldClamp = Boolean(collapseFadeColor && isOverflowing && !isTagsExpanded);

  return (
    <div className={className}>
      <div className={headerClassName}>
        <p className={labelClassName}>{title}</p>
        <div className="flex items-center gap-1.5">
          {collapseFadeColor && isOverflowing ? (
            <button
              type="button"
              onClick={() => setIsTagsExpanded((v) => !v)}
              className="cursor-pointer border-0 bg-transparent px-1 py-0.5 text-[11px] text-[#8f9aa8] transition-colors hover:text-[#334155]"
            >
              {isTagsExpanded ? '收起' : `展开 (${sortedTags.length})`}
            </button>
          ) : null}
          {!inlineAddButton && canEdit && !expanded ? (
            <button
              type="button"
              onClick={() => onExpandedChange(true)}
              className={addButtonClassName}
              aria-label={`添加${title}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {canEdit && expanded ? (
        <div className="mb-2">
          <TagInput
            applicableTo={applicableTo}
            selectedTags={selectedTags}
            onAdd={onAdd}
            onRemove={onRemove}
            hideChips
            onDismiss={() => onExpandedChange(false)}
          />
        </div>
      ) : null}

      {sortedTags.length > 0 || showInlineAddPill ? (
        <div className="relative">
          <div
            ref={listRef}
            className={cn(
              tagsWrapClassName,
              // 为 hover 浮现的右上角删除圆钮预留顶部/右侧空间，避免折叠态 overflow-hidden 裁切
              'pt-1.5 pr-2',
              shouldClamp && 'overflow-hidden',
            )}
            style={shouldClamp ? { maxHeight: `${collapsedMaxHeight + 6}px` } : undefined}
          >
            {showInlineAddPill ? (
              <button
                type="button"
                onClick={() => onExpandedChange(true)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full border-0 bg-[#ff5a26] px-3 py-[5.5px] text-[12.5px] leading-[1.2] font-medium text-white shadow-[0_2px_10px_rgba(255,90,38,0.24)] transition-colors duration-150 hover:bg-[#ea4d1c]"
              >
                <Plus className="h-[12.5px] w-[12.5px]" strokeWidth={2.5} />
                <span>{addButtonLabel}</span>
              </button>
            ) : null}

            {sortedTags.map((tag) => {
              const tagName = (tag.name ?? `#${tag.id}`).trim();
              const isGroupTag = Boolean(normalizedGroup && tag.name && tagName === normalizedGroup);
              const canToggleGroup = Boolean(canEdit && onToggleGroupTag && tag.name);
              const icon = renderTagCategoryIcon(tag.category, isGroupTag, 'h-[13px] w-[13px] shrink-0 text-[#7a8797]');
              const tipParts = [
                tag.category ? `${tag.category}：${tagName}` : tagName,
                canToggleGroup
                  ? (isGroupTag ? '当前卡片分组（点击取消）' : '点击设为卡片分组')
                  : null,
              ].filter(Boolean);

              return (
                <span
                  key={tag.id}
                  title={tipParts.join(' · ')}
                  className={cn(
                    'group/tag relative transition-all duration-150',
                    tagClassName,
                    canEdit && 'hover:bg-white hover:text-[#334155] hover:shadow-[0_2px_8px_rgba(15,23,42,0.08)]',
                  )}
                >
                  {canToggleGroup ? (
                    <button
                      type="button"
                      onClick={() => onToggleGroupTag?.(tagName)}
                      className="inline-flex max-w-full cursor-pointer items-center gap-[6px] border-0 bg-transparent p-0 font-inherit text-inherit"
                    >
                      {icon}
                      <span className="truncate">{tagName}</span>
                    </button>
                  ) : (
                    <span className="inline-flex max-w-full items-center gap-[6px]">
                      {icon}
                      <span className="truncate">{tagName}</span>
                    </span>
                  )}

                  {canEdit ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(tag.id);
                      }}
                      aria-label={`移除${tagName}`}
                      className="pointer-events-none absolute -top-1.5 -right-1.5 z-10 flex h-[19px] w-[19px] scale-90 cursor-pointer items-center justify-center rounded-full border border-[#ff5a26] bg-white p-0 text-[#ff5a26] opacity-0 shadow-[0_1px_4px_rgba(15,23,42,0.14)] transition-all duration-150 group-hover/tag:pointer-events-auto group-hover/tag:scale-100 group-hover/tag:opacity-100 hover:bg-[#ff5a26] hover:text-white"
                    >
                      <X className="h-[11px] w-[11px]" strokeWidth={2.4} />
                    </button>
                  ) : null}
                </span>
              );
            })}
          </div>

          {/* 底部自然渐隐遮罩（无文字叠压），点击直接展开 */}
          {shouldClamp ? (
            <button
              type="button"
              onClick={() => setIsTagsExpanded(true)}
              aria-label={`展开全部 ${sortedTags.length} 个标签`}
              title={`点击展开全部 (${sortedTags.length})`}
              className="absolute inset-x-0 bottom-0 h-9 cursor-pointer border-0 p-0"
              style={{
                background: `linear-gradient(to bottom, transparent 0%, ${collapseFadeColor} 92%)`,
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
