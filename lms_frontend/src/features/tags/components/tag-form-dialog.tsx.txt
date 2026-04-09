import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SpaceColorRingPicker, SPACE_THEME_COLORS } from '@/components/common/space-color-ring-picker';
import { SUBTLE_SURFACE_HOVER_CLASSNAME } from '@/components/ui/interactive-styles';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Tag, TagType } from '@/types/api';

interface TagFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initialTagType: TagType;
  tag?: Tag | null;
  onSubmit: (payload: {
    name: string;
    tag_type: TagType;
    color?: string;
    sort_order?: number;
    allow_knowledge: boolean;
    allow_question: boolean;
  }) => Promise<void> | void;
  isSubmitting?: boolean;
}

export const TagFormDialog: React.FC<TagFormDialogProps> = ({
  open,
  onOpenChange,
  mode,
  initialTagType,
  tag,
  onSubmit,
  isSubmitting = false,
}) => {
  const [name, setName] = React.useState('');
  const [tagType, setTagType] = React.useState<TagType>(initialTagType);
  const [color, setColor] = React.useState<string>(SPACE_THEME_COLORS[0]);
  const [sortOrder, setSortOrder] = React.useState('0');
  const [allowKnowledge, setAllowKnowledge] = React.useState(true);
  const [allowQuestion, setAllowQuestion] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setTagType(tag?.tag_type ?? initialTagType);
    setName(tag?.name ?? '');
    setColor(tag?.color ?? SPACE_THEME_COLORS[0]);
    setSortOrder(String(tag?.sort_order ?? 0));
    setAllowKnowledge(tag?.allow_knowledge ?? true);
    setAllowQuestion(tag?.allow_question ?? false);
  }, [open, tag, initialTagType]);

  const handleSubmit = async () => {
    await onSubmit({
      name: name.trim(),
      tag_type: tagType,
      color: tagType === 'SPACE' ? color : undefined,
      sort_order: tagType === 'SPACE' ? (Number(sortOrder) || 0) : undefined,
      allow_knowledge: tagType === 'SPACE' ? true : allowKnowledge,
      allow_question: tagType === 'SPACE' ? true : allowQuestion,
    });
  };

  const isSpaceType = tagType === 'SPACE';
  const dialogTitle = mode === 'create' ? '新建标签' : '编辑标签';
  const dialogDescription = isSpaceType
    ? '用于单选归类。'
    : '用于补充语义。';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[620px] overflow-hidden border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(232,121,58,0.08),transparent_26%),radial-gradient(circle_at_top_right,rgba(37,99,235,0.06),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(251,251,250,0.99))] p-0 shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
        <div className="relative px-7 py-7 sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute -left-10 top-0 h-24 w-24 rounded-full bg-[rgba(232,121,58,0.08)] blur-2xl" />
          <div className="pointer-events-none absolute right-0 top-6 h-20 w-20 rounded-full bg-[rgba(37,99,235,0.06)] blur-2xl" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,rgba(232,121,58,0),rgba(232,121,58,0.55),rgba(37,99,235,0.32),rgba(37,99,235,0))]" />
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-[24px] font-semibold tracking-[-0.04em] text-foreground sm:text-[28px]">
              {dialogTitle}
            </DialogTitle>
            <DialogDescription className="text-[14px] text-text-muted">
              {dialogDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-7 space-y-5">
            <div className={`grid gap-4 ${isSpaceType ? 'md:grid-cols-[180px_minmax(0,1fr)_112px]' : 'md:grid-cols-[200px_minmax(0,1fr)]'}`}>
              <div className="space-y-2">
                <Label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                  标签类型
                </Label>
                <Select value={tagType} onValueChange={(value) => setTagType(value as TagType)}>
                  <SelectTrigger className="h-12 rounded-lg border border-border/70 bg-white/90 px-4 text-[15px] font-semibold shadow-[0_8px_18px_rgba(15,23,42,0.04)] data-[placeholder]:text-text-muted/80">
                    <SelectValue placeholder="选择标签类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SPACE">空间</SelectItem>
                    <SelectItem value="TAG">普通标签</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tag-name" className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                  名称
                </Label>
                <Input
                  id="tag-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={isSpaceType ? '例如：风控空间' : '例如：高频考点'}
                  className="h-12 rounded-lg border-border/70 bg-white/90 px-4 text-[15px] font-semibold shadow-[0_8px_18px_rgba(15,23,42,0.04)] placeholder:text-text-muted/80"
                />
              </div>

              {isSpaceType ? (
                <div className="space-y-2">
                  <Label htmlFor="tag-sort" className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                    排序
                  </Label>
                  <Input
                    id="tag-sort"
                    type="number"
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value)}
                    className="h-12 rounded-lg border-border/70 bg-white/90 px-4 text-[15px] font-semibold shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
                  />
                </div>
              ) : null}
            </div>

            {isSpaceType ? (
              <div className="flex flex-col items-center space-y-2 pt-1">
                <Label className="block text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                  颜色
                </Label>
                <SpaceColorRingPicker
                  value={color}
                  onChange={setColor}
                  size="sm"
                  className="mt-2"
                />
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <label className={cn("flex cursor-pointer items-center gap-4 rounded-xl border border-border/70 bg-white/90 px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)] hover:-translate-y-0.5", SUBTLE_SURFACE_HOVER_CLASSNAME)}>
                  <Checkbox
                    id="tag-knowledge"
                    checked={allowKnowledge}
                    onCheckedChange={(checked) => setAllowKnowledge(Boolean(checked))}
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">知识</p>
                  </div>
                </label>

                <label className={cn("flex cursor-pointer items-center gap-4 rounded-xl border border-border/70 bg-white/90 px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)] hover:-translate-y-0.5", SUBTLE_SURFACE_HOVER_CLASSNAME)}>
                  <Checkbox
                    id="tag-question"
                    checked={allowQuestion}
                    onCheckedChange={(checked) => setAllowQuestion(Boolean(checked))}
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">题目</p>
                  </div>
                </label>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6 gap-3 border-t border-border/60 pt-5 sm:space-x-0">
            <Button
              variant="outline"
              className="h-10 min-w-[112px] rounded-full px-6 text-[15px] font-semibold"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button
              className="h-10 min-w-[112px] rounded-full px-6 text-[15px] font-semibold"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || !name.trim() || (tagType === 'TAG' && !allowKnowledge && !allowQuestion)}
            >
              {isSubmitting ? '处理中...' : mode === 'create' ? '创建' : '保存'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
