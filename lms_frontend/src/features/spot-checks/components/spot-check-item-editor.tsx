import { Target, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card className="border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.96))] shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
        <div className="space-y-2">
          <Badge variant="info" className="w-fit">主题 {index + 1}</Badge>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary-500" />
            单主题表现记录
          </CardTitle>
        </div>
        {canRemove ? (
          <Button variant="ghost" size="icon" className="h-9 w-9 text-text-muted hover:text-destructive" onClick={() => onRemove(index)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_140px]">
        <div className="space-y-2 md:col-span-2">
          <Label>抽查主题</Label>
          <Input
            value={item.topic}
            onChange={(event) => onChange(index, 'topic', event.target.value)}
            placeholder="例如：HTTP 缓存、React 状态管理、SQL 索引"
            className="bg-white/80"
          />
          {errors[`item-${index}-topic`] ? <p className="text-sm text-destructive-500">{errors[`item-${index}-topic`]}</p> : null}
        </div>

        <div className="space-y-2">
          <Label>抽查内容</Label>
          <Textarea
            value={item.content ?? ''}
            onChange={(event) => onChange(index, 'content', event.target.value)}
            placeholder="可选，写本次具体追问点或考察内容"
            className="min-h-[112px] bg-white/80"
          />
        </div>

        <div className="space-y-2">
          <Label>评分</Label>
          <div className="space-y-3 rounded-xl border border-border/70 bg-white/85 p-4">
            <Input
              type="number"
              min={0}
              max={100}
              value={item.score}
              onChange={(event) => onChange(index, 'score', event.target.value)}
              className={cn('bg-white text-lg font-semibold', getScoreTone(item.score))}
            />
            <p className="text-xs text-text-muted">0-100 分，建议按单主题独立给分。</p>
          </div>
          {errors[`item-${index}-score`] ? <p className="text-sm text-destructive-500">{errors[`item-${index}-score`]}</p> : null}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>评语</Label>
          <Textarea
            value={item.comment ?? ''}
            onChange={(event) => onChange(index, 'comment', event.target.value)}
            placeholder="写清楚表现、短板和后续建议"
            className="min-h-[120px] bg-white/80"
          />
        </div>
      </CardContent>
    </Card>
  );
};
