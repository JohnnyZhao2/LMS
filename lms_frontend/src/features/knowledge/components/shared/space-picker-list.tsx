import * as React from 'react';
import { Plus } from 'lucide-react';

import { SelectionIndicator } from '@/components/common/selection-indicator';
import { SPACE_THEME_COLORS } from '@/components/common/space-color-ring-picker';
import { cn } from '@/lib/utils';
import type { SimpleTag } from '@/types/common';

interface SpacePickerListProps {
  spaces: SimpleTag[];
  selectedSpaceId?: number | null;
  showUnassign?: boolean;
  canCreate?: boolean;
  disabled?: boolean;
  onSelect: (spaceId: number | null) => void | Promise<void>;
  onCreate?: (payload: { name: string; color: string }) => void | Promise<void>;
}

/**
 * 空间选择列表：默认底部显示「新建空间」按钮，点击后原地切换为输入框（回车创建，Esc/失焦收起）
 */
export const SpacePickerList: React.FC<SpacePickerListProps> = ({
  spaces,
  selectedSpaceId,
  showUnassign = false,
  canCreate = false,
  disabled = false,
  onSelect,
  onCreate,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [name, setName] = React.useState('');
  const [colorIdx, setColorIdx] = React.useState(() => spaces.length % SPACE_THEME_COLORS.length);
  const [creating, setCreating] = React.useState(false);

  const activeColor = SPACE_THEME_COLORS[colorIdx % SPACE_THEME_COLORS.length];

  const resetEditor = () => {
    setIsEditing(false);
    setName('');
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || !onCreate || creating || disabled) {
      resetEditor();
      return;
    }
    setCreating(true);
    try {
      await onCreate({ name: trimmed, color: activeColor });
      resetEditor();
      setColorIdx((idx) => (idx + 1) % SPACE_THEME_COLORS.length);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="max-h-56 overflow-y-auto">
        {spaces.map((space) => {
          const isSelected = selectedSpaceId === space.id;
          return (
            <button
              key={space.id}
              type="button"
              disabled={disabled || creating}
              onClick={() => void onSelect(space.id)}
              className={cn(
                'flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left text-[13.5px] text-[#333] transition-colors hover:bg-[#f5f7fa] disabled:opacity-50',
                isSelected && 'bg-[#f0f4ff]',
              )}
            >
              <SelectionIndicator
                color={space.color || 'var(--theme-primary)'}
                selected={isSelected}
                size={14}
                dotSize={5}
              />
              <span className="truncate">{space.name}</span>
            </button>
          );
        })}

        {showUnassign && (
          <button
            type="button"
            disabled={disabled || creating}
            onClick={() => void onSelect(null)}
            className="flex w-full cursor-pointer items-center gap-2.5 border-t border-border/50 px-4 py-2.5 text-left text-[13.5px] text-text-muted transition-colors hover:bg-[#f5f7fa] hover:text-foreground disabled:opacity-50"
          >
            <span className="inline-block h-[14px] w-[14px] shrink-0 rounded-full border-2 border-border" />
            <span>取消空间</span>
          </button>
        )}
      </div>

      {canCreate && onCreate && (
        <div className="border-t border-border/50 p-1.5">
          {isEditing ? (
            <div
              className="flex items-center gap-2.5 rounded-[6px] border border-primary/40 bg-[#f4f6f9] px-2.5 py-2 transition-colors focus-within:bg-white"
              onBlur={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                if (!creating) resetEditor();
              }}
            >
              <button
                type="button"
                title="点击切换颜色"
                aria-label="切换空间颜色"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setColorIdx((idx) => (idx + 1) % SPACE_THEME_COLORS.length)}
                className="flex shrink-0 cursor-pointer items-center justify-center p-0"
              >
                <SelectionIndicator
                  color={activeColor}
                  selected
                  size={14}
                  dotSize={6}
                />
              </button>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleCreate();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    resetEditor();
                  }
                }}
                disabled={disabled || creating}
                placeholder="空间名称"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-text-muted/65"
              />
            </div>
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setColorIdx(spaces.length % SPACE_THEME_COLORS.length);
                setIsEditing(true);
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[13px] font-medium text-text-muted transition-colors hover:bg-[#f5f7fa] hover:text-foreground disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              <span>新建空间</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
