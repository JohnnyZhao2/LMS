import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { SpotCheckItem } from '@/types/api';

interface SpotCheckItemEditorProps {
  index: number;
  item: SpotCheckItem;
  canRemove: boolean;
  errors: Record<string, string>;
  onChange: (index: number, field: keyof SpotCheckItem, value: string) => void;
  onRemove: (index: number) => void;
}

const getScoreTone = (score: string) => {
  const value = Number(score);
  if (Number.isNaN(value)) {
    return 'text-text-muted';
  }
  if (value >= 85) {
    return 'text-secondary';
  }
  if (value >= 60) {
    return 'text-warning';
  }
  return 'text-destructive';
};

export const SpotCheckItemEditor: React.FC<SpotCheckItemEditorProps> = ({
  index,
  item,
  canRemove,
  errors,
  onChange,
  onRemove,
}) => {
  return (
    <section className="group relative space-y-3 rounded-xl border border-border/55 bg-white/72 p-4">
      {canRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 z-10 h-[26px] w-[26px] translate-x-[18%] -translate-y-[18%] rounded-full border border-border/70 bg-white text-text-muted opacity-0 shadow-[0_2px_8px_rgba(15,23,42,0.05)] pointer-events-none transition-all duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 hover:border-foreground/10 hover:bg-white hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100"
          onClick={() => onRemove(index)}
          aria-label={`删除主题 ${index + 1}`}
        >
          <X className="h-[12px] w-[12px]" strokeWidth={2} />
        </Button>
      ) : null}

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px] md:items-start">
        <div>
          <Label className="mb-3 block text-xs font-medium text-text-muted">主题 {index + 1}</Label>
          <Input
            value={item.topic}
            onChange={(event) => onChange(index, 'topic', event.target.value)}
            placeholder="例如：HTTP 缓存"
            className="h-10 rounded-lg border-transparent bg-muted/40 px-3.5 text-[13px] placeholder:text-[13px] focus:border-primary/20 focus:bg-background focus:ring-0"
          />
          {errors[`item-${index}-topic`] ? (
            <p className="text-sm text-destructive-500">{errors[`item-${index}-topic`]}</p>
          ) : null}
        </div>

        <div>
          <Label className="mb-3 block text-xs font-medium text-text-muted">得分</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={item.score}
            onChange={(event) => onChange(index, 'score', event.target.value)}
            className={cn(
              'h-10 rounded-lg border-transparent bg-amber-50/72 px-3.5 text-[13px] font-semibold tabular-nums placeholder:text-[13px] focus:border-primary/20 focus:bg-white focus:ring-0',
              getScoreTone(item.score),
            )}
          />
          {errors[`item-${index}-score`] ? (
            <p className="text-sm text-destructive-500">{errors[`item-${index}-score`]}</p>
          ) : null}
        </div>
      </div>

      <div>
        <Label className="mb-3 block text-xs font-medium text-text-muted">评语</Label>
        <Textarea
          value={item.comment}
          onChange={(event) => onChange(index, 'comment', event.target.value)}
          placeholder="可选"
          className="min-h-[56px] rounded-lg border-transparent bg-muted/40 px-3.5 py-2.5 text-[13px] leading-5 placeholder:text-[13px] focus:border-primary/20 focus:bg-background focus:ring-0"
        />
      </div>
    </section>
  );
};
