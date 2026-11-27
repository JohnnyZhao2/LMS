import * as React from 'react';
import { Search, X } from 'lucide-react';

import { PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Tag as TagType } from '@/types/common';

const TAG_POPOVER_PAGE_SIZE = 48;

/** 二级标签分类展示优先级：系统 -> 类别 -> 执行平台 -> 对象 -> 其余自定义分类 -> 其他 */
function getTagCategorySortRank(category: string): number {
  const normalized = category.trim();
  if (!normalized || normalized === '其他') return 5;
  if (normalized.includes('系统')) return 0;
  if (normalized.includes('类别') || normalized.includes('分类')) return 1;
  if (normalized.includes('平台')) return 2;
  if (normalized.includes('对象')) return 3;
  return 4;
}

function groupAndSortTags(list: TagType[]): Array<[string, TagType[]]> {
  const map = new Map<string, TagType[]>();
  for (const tag of list) {
    const cat = (tag.category || '').trim() || '其他';
    const bucket = map.get(cat);
    if (bucket) bucket.push(tag);
    else map.set(cat, [tag]);
  }
  return Array.from(map.entries()).sort(([catA], [catB]) => {
    const rankDiff = getTagCategorySortRank(catA) - getTagCategorySortRank(catB);
    if (rankDiff !== 0) return rankDiff;
    return catA.localeCompare(catB, 'zh-Hans-CN');
  });
}

interface KnowledgeTagFilterPopoverProps {
  tags: TagType[];
  selectedTagIds: number[];
  activeTagColor: string;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onToggleTag: (tagId: number) => void;
  onClearTags: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/**
 * 知识筛选双栏二级标签弹窗：
 * - 顶部跨全部分类即时搜索
 * - 左侧固定分类导航（带总数与已选计数），右侧单分类分批渐进渲染
 * - 底部已选标签汇总条
 */
export const KnowledgeTagFilterPopover: React.FC<KnowledgeTagFilterPopoverProps> = ({
  tags,
  selectedTagIds,
  activeTagColor,
  searchInputRef,
  onToggleTag,
  onClearTags,
  onMouseEnter,
  onMouseLeave,
}) => {
  const [searchText, setSearchText] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);
  const [visibleCountByCat, setVisibleCountByCat] = React.useState<Record<string, number>>({});

  const selectedTagIdSet = React.useMemo(() => new Set(selectedTagIds), [selectedTagIds]);
  const selectedTags = React.useMemo(
    () => tags.filter((tag) => selectedTagIdSet.has(tag.id)),
    [selectedTagIdSet, tags],
  );
  const trimmedSearch = searchText.trim().toLowerCase();

  const hasCategories = React.useMemo(
    () => tags.some((t) => Boolean(t.category?.trim())),
    [tags],
  );
  const allCategoryGroups = React.useMemo(
    () => (hasCategories ? groupAndSortTags(tags) : null),
    [hasCategories, tags],
  );
  const filteredTags = React.useMemo(() => {
    if (!trimmedSearch) return tags;
    return tags.filter((tag) => (
      tag.name.toLowerCase().includes(trimmedSearch)
      || (tag.category || '').toLowerCase().includes(trimmedSearch)
    ));
  }, [tags, trimmedSearch]);

  const searchMatchedGroups = React.useMemo(() => {
    if (!trimmedSearch || !hasCategories) return null;
    return groupAndSortTags(filteredTags);
  }, [filteredTags, hasCategories, trimmedSearch]);

  const effectiveActiveCategory = React.useMemo(() => {
    if (!allCategoryGroups || allCategoryGroups.length === 0) return null;
    if (activeCategory && allCategoryGroups.some(([cat]) => cat === activeCategory)) {
      return activeCategory;
    }
    return allCategoryGroups[0][0];
  }, [activeCategory, allCategoryGroups]);

  const activeCategoryTags = React.useMemo(() => {
    if (!allCategoryGroups || !effectiveActiveCategory) return tags;
    return allCategoryGroups.find(([cat]) => cat === effectiveActiveCategory)?.[1] ?? [];
  }, [allCategoryGroups, effectiveActiveCategory, tags]);

  const renderTagButton = (tag: TagType) => {
    const active = selectedTagIdSet.has(tag.id);
    return (
      <button
        key={tag.id}
        type="button"
        onClick={() => onToggleTag(tag.id)}
        className={cn(
          'inline-flex h-7 cursor-pointer items-center gap-1 rounded-[6px] px-2.5 text-[12px] font-medium transition-colors duration-150',
          active
            ? 'bg-black/[0.08] font-semibold'
            : 'bg-black/[0.025] text-text-muted hover:bg-black/[0.055] hover:text-gray-900',
        )}
        style={active ? { color: activeTagColor } : undefined}
      >
        <span
          className={cn(
            'text-[12px]',
            active ? 'font-bold' : 'font-normal text-text-muted/50',
          )}
          style={active ? { color: activeTagColor } : undefined}
        >
          #
        </span>
        <span>{tag.name}</span>
      </button>
    );
  };

  const renderChunkedTagList = (catKey: string, list: TagType[], prioritizeSelected: boolean) => {
    const limitCount = visibleCountByCat[catKey] ?? TAG_POPOVER_PAGE_SIZE;
    const ordered = prioritizeSelected && list.length > limitCount
      ? [
          ...list.filter((t) => selectedTagIdSet.has(t.id)),
          ...list.filter((t) => !selectedTagIdSet.has(t.id)),
        ]
      : list;
    const visibleSlice = ordered.slice(0, limitCount);
    const remainingCount = ordered.length - visibleSlice.length;

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {visibleSlice.map(renderTagButton)}
        {remainingCount > 0 ? (
          <button
            type="button"
            onClick={() => setVisibleCountByCat((prev) => ({
              ...prev,
              [catKey]: limitCount + TAG_POPOVER_PAGE_SIZE,
            }))}
            className="inline-flex h-7 cursor-pointer items-center rounded-[6px] border border-dashed border-black/[0.12] bg-transparent px-2.5 text-[11.5px] font-medium text-text-muted transition-colors hover:border-black/[0.22] hover:bg-black/[0.03] hover:text-foreground"
          >
            加载更多 (+{remainingCount})
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <PopoverContent
      align="start"
      sideOffset={8}
      onOpenAutoFocus={(e) => e.preventDefault()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        'flex flex-col overflow-hidden rounded-[10px] border border-black/[0.06] bg-white/98 p-0 shadow-[0_14px_38px_rgba(15,23,42,0.14)] backdrop-blur-sm',
        allCategoryGroups
          ? 'w-[min(620px,calc(100vw-32px))]'
          : 'w-[min(480px,calc(100vw-32px))]',
      )}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-black/[0.05] px-3.5 py-2.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-text-muted/60" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder={`搜索全部 ${tags.length} 个标签…`}
          aria-label="搜索标签"
          className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-text-muted/55"
        />
        {searchText ? (
          <button
            type="button"
            onClick={() => setSearchText('')}
            aria-label="清空标签搜索"
            className="inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-text-muted/60 transition-colors hover:bg-black/[0.05] hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        ) : null}
      </div>

      {trimmedSearch ? (
        <div className="h-[300px] overflow-y-auto p-3.5 [scrollbar-width:thin]">
          {filteredTags.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[12.5px] text-text-muted/70">
              未找到匹配「{searchText.trim()}」的标签
            </div>
          ) : searchMatchedGroups ? (
            <div className="space-y-3.5">
              {searchMatchedGroups.map(([category, groupTags]) => (
                <div key={category} className="space-y-1.5">
                  <div className="text-[11px] font-medium text-text-muted">
                    {category}
                    <span className="ml-1 tabular-nums text-text-muted/60">({groupTags.length})</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {groupTags.slice(0, TAG_POPOVER_PAGE_SIZE).map(renderTagButton)}
                    {groupTags.length > TAG_POPOVER_PAGE_SIZE ? (
                      <span className="px-1.5 text-[11px] text-text-muted/70">
                        还有 {groupTags.length - TAG_POPOVER_PAGE_SIZE} 个，可输入更精确关键词
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              {filteredTags.slice(0, TAG_POPOVER_PAGE_SIZE).map(renderTagButton)}
            </div>
          )}
        </div>
      ) : allCategoryGroups ? (
        <div className="flex h-[300px] min-h-0">
          <div className="w-[136px] shrink-0 space-y-1 overflow-y-auto border-r border-black/[0.05] bg-[#f8fafc]/80 p-2 [scrollbar-width:thin]">
            {allCategoryGroups.map(([category, groupTags]) => {
              const isCatActive = effectiveActiveCategory === category;
              const selectedCountInCat = groupTags.reduce(
                (acc, t) => acc + (selectedTagIdSet.has(t.id) ? 1 : 0),
                0,
              );
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={cn(
                    'flex w-full cursor-pointer items-center justify-between gap-1.5 rounded-[7px] border-0 px-2.5 py-2 text-left text-[12.5px] transition-colors',
                    isCatActive
                      ? 'bg-white font-medium text-foreground shadow-[0_1px_3px_rgba(15,23,42,0.07)]'
                      : 'bg-transparent text-text-muted hover:bg-black/[0.035] hover:text-foreground',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    {selectedCountInCat > 0 ? (
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: activeTagColor }}
                      />
                    ) : null}
                    <span className="truncate">{category}</span>
                  </span>
                  <span
                    className={cn(
                      'shrink-0 text-[11px] tabular-nums',
                      selectedCountInCat > 0
                        ? 'font-semibold'
                        : isCatActive
                          ? 'text-text-muted/80'
                          : 'text-text-muted/55',
                    )}
                    style={selectedCountInCat > 0 ? { color: activeTagColor } : undefined}
                  >
                    {selectedCountInCat > 0 ? `${selectedCountInCat}/${groupTags.length}` : groupTags.length}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="min-w-0 flex-1 overflow-y-auto p-3.5 [scrollbar-width:thin]">
            {renderChunkedTagList(effectiveActiveCategory ?? '__all__', activeCategoryTags, true)}
          </div>
        </div>
      ) : (
        <div className="max-h-[300px] overflow-y-auto p-3.5 [scrollbar-width:thin]">
          {renderChunkedTagList('__flat__', tags, false)}
        </div>
      )}

      {selectedTags.length > 0 ? (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-black/[0.05] bg-[#f8fafc]/90 px-3.5 py-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {selectedTags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex max-w-[160px] items-center gap-1 rounded-[5px] bg-white px-2 py-0.5 text-[11.5px] font-medium shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
                style={{ color: activeTagColor }}
              >
                <span className="truncate">#{tag.name}</span>
                <button
                  type="button"
                  onClick={() => onToggleTag(tag.id)}
                  aria-label={`移除标签 ${tag.name}`}
                  className="inline-flex h-3.5 w-3.5 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-text-muted/60 hover:bg-black/[0.06] hover:text-foreground"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={onClearTags}
            className="shrink-0 cursor-pointer border-0 bg-transparent px-1 text-[11.5px] text-text-muted transition-colors hover:text-foreground"
          >
            清空
          </button>
        </div>
      ) : null}
    </PopoverContent>
  );
};
