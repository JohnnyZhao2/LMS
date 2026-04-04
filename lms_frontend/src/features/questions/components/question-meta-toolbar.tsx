import React from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QUIET_OUTLINE_FIELD_CLASSNAME } from '@/components/ui/interactive-styles';
import { cn } from '@/lib/utils';
import type { Tag } from '@/types/api';

import { QuestionTagInput } from './question-tag-input';

const getSpaceAccentColor = (space?: Tag) => space?.color || 'var(--theme-primary)';

const SpaceSelectValueContent: React.FC<{
  space?: Tag;
}> = ({ space }) => (
  <span className="flex h-full min-w-0 flex-1 items-center leading-none">
    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
      <span
        className="inline-flex h-3 w-3 shrink-0 rounded-full border-[1.5px]"
        style={{ borderColor: space ? getSpaceAccentColor(space) : 'color-mix(in oklab, var(--color-text-muted) 46%, white)' }}
        aria-hidden="true"
      />
    </span>
    <span className="mx-1.5 h-3.5 w-px shrink-0 bg-foreground/16" aria-hidden="true" />
    {space ? (
      <span className="min-w-0 flex-1 truncate text-[10.5px] font-semibold leading-none tracking-[-0.01em] text-text-muted">
        {space.name}
      </span>
    ) : (
      <span className="flex min-w-0 flex-1 items-center">
        <span className="block h-px w-4 rounded-full bg-text-muted/55" aria-hidden="true" />
      </span>
    )}
    <span className="ml-1 inline-flex h-4 w-4 shrink-0 items-center justify-center text-text-muted/62">
      <ChevronDown className="h-3.25 w-3.25 shrink-0" strokeWidth={2.2} />
    </span>
  </span>
);

const SpaceSelectItemContent: React.FC<{
  space?: Tag;
}> = ({ space }) => (
  <span className="flex min-w-0 items-center gap-2.5">
    <span
      className="inline-flex h-3.5 w-3.5 shrink-0 rounded-full border-2"
      style={{ borderColor: space ? getSpaceAccentColor(space) : 'color-mix(in oklab, var(--color-text-muted) 46%, white)' }}
      aria-hidden="true"
    />
    <span className="h-3.5 w-px shrink-0 bg-border/80" aria-hidden="true" />
    {space ? (
      <span className="truncate text-[12.5px] font-semibold tracking-[-0.01em] text-foreground/88">
        {space.name}
      </span>
    ) : (
      <span className="flex min-w-[20px] items-center">
        <span className="block h-px w-4 rounded-full bg-text-muted/55" aria-hidden="true" />
      </span>
    )}
  </span>
);

interface QuestionMetaToolbarProps {
  spaceTypes?: Tag[];
  spaceTagId?: number | null;
  tagIds?: number[];
  onSpaceTagIdChange: (value: number | null) => void;
  onTagAdd: (tag: { id: number; name: string }) => void;
  onTagRemove: (tagId: number) => void;
  onSave?: () => void;
  isSaving?: boolean;
  trailingContent?: React.ReactNode;
}

export const QuestionMetaToolbar: React.FC<QuestionMetaToolbarProps> = ({
  spaceTypes,
  spaceTagId,
  tagIds = [],
  onSpaceTagIdChange,
  onTagAdd,
  onTagRemove,
  onSave,
  isSaving = false,
  trailingContent,
}) => {
  const [tagPopoverOpen, setTagPopoverOpen] = React.useState(false);
  const currentSpace = spaceTypes?.find((item) => item.id === spaceTagId);

  return (
    <>
      <section className="group flex min-h-7 flex-wrap items-center justify-between gap-3">
        <div
          className={cn(
            'flex flex-wrap items-center gap-2 transition-opacity duration-150',
            'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto',
            tagPopoverOpen && 'opacity-100 pointer-events-auto',
          )}
        >
          <div className="w-fit shrink-0">
            <Select
              value={spaceTagId == null ? '__none__' : String(spaceTagId)}
              onValueChange={(value) => onSpaceTagIdChange(value === '__none__' ? null : Number(value))}
            >
              <SelectTrigger className={`${QUIET_OUTLINE_FIELD_CLASSNAME} h-7 w-auto min-w-[84px] max-w-[118px] rounded-full px-2 text-[11px] font-medium shadow-none [&>span]:w-full [&>span]:min-w-0 [&>svg]:hidden`}>
                <SelectValue aria-label={currentSpace?.name ?? '不设置'}>
                  <SpaceSelectValueContent space={currentSpace} />
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <SpaceSelectItemContent />
                </SelectItem>
                {spaceTypes?.map((item) => (
                  <SelectItem key={item.id} value={item.id.toString()}>
                    <SpaceSelectItemContent space={item} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn('akm-tool-btn', tagPopoverOpen && 'akm-tool-btn-active')}
              >
                标签{tagIds.length > 0 && ` (${tagIds.length})`}
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              sideOffset={14}
              className="akm-tag-popover !w-[340px] !rounded-[16px] !border-[1px] !border-[rgba(255,255,255,0.5)] !bg-[rgba(255,255,255,0.42)] !p-[16px_18px] !text-foreground !shadow-[0_4px_24px_rgba(0,0,0,0.06)] backdrop-blur-[20px]"
            >
              <QuestionTagInput
                selectedTagIds={tagIds}
                onAdd={onTagAdd}
                onRemove={onTagRemove}
              />
            </PopoverContent>
          </Popover>
        </div>

        {trailingContent ? trailingContent : onSave ? (
          <Button
            onClick={onSave}
            disabled={isSaving}
            size="sm"
            className="h-7 w-7 rounded-full p-0 opacity-0 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
            aria-label="保存"
            title="保存"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </Button>
        ) : (
          <span className="h-7 w-7 shrink-0" aria-hidden="true" />
        )}
      </section>

      <style>{`
        .akm-tool-btn {
          border: 1.5px solid rgba(0,0,0,0.08);
          border-radius: 20px;
          height: 28px;
          padding: 0 12px;
          font-size: 10.5px;
          font-weight: 600;
          line-height: 1;
          letter-spacing: -0.01em;
          color: var(--color-text-muted);
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(6px);
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s;
        }
        .akm-tool-btn-active {
          background: rgba(255,255,255,0.94);
          color: var(--color-foreground);
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
      `}</style>
    </>
  );
};
