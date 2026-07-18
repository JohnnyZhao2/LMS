import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

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
import { SpaceColorRingPicker, SPACE_THEME_COLORS } from '@/features/tags/components/space-color-ring-picker';
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
import type { Tag, TagType } from '@/types/common';

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
    allow_knowledge: boolean;
    allow_question: boolean;
  }) => Promise<void> | void;
  isSubmitting?: boolean;
}

const tagFormSchema = z.object({
  name: z.string().trim().min(1, '请输入名称'),
  tag_type: z.enum(['SPACE', 'TAG']),
  color: z.string().min(1),
  allow_knowledge: z.boolean(),
  allow_question: z.boolean(),
}).refine(
  (values) => values.tag_type === 'SPACE' || values.allow_knowledge || values.allow_question,
  { message: '至少选择一个适用模块', path: ['allow_knowledge'] },
);

type TagFormValues = z.infer<typeof tagFormSchema>;

export const TagFormDialog: React.FC<TagFormDialogProps> = ({
  open,
  onOpenChange,
  mode,
  initialTagType,
  tag,
  onSubmit,
  isSubmitting = false,
}) => {
  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      tag_type: initialTagType,
      color: SPACE_THEME_COLORS[0],
      allow_knowledge: true,
      allow_question: false,
    },
  });
  const tagType = useWatch({ control: form.control, name: 'tag_type' });

  React.useEffect(() => {
    if (!open) return;
    form.reset({
      tag_type: tag?.tag_type ?? initialTagType,
      name: tag?.name ?? '',
      color: tag?.color ?? SPACE_THEME_COLORS[0],
      allow_knowledge: tag?.allow_knowledge ?? true,
      allow_question: tag?.allow_question ?? false,
    });
  }, [form, open, tag, initialTagType]);

  const handleSubmit = async (values: TagFormValues) => {
    await onSubmit({
      name: values.name,
      tag_type: values.tag_type,
      color: values.tag_type === 'SPACE' ? values.color : undefined,
      allow_knowledge: values.tag_type === 'SPACE' ? true : values.allow_knowledge,
      allow_question: values.tag_type === 'SPACE' ? true : values.allow_question,
    });
  };

  const isSpaceTag = tagType === 'SPACE';
  const dialogTitle = mode === 'create' ? '新建标签' : '编辑标签';
  const dialogDescription = isSpaceTag
    ? '用于单选归类。'
    : '用于补充语义。';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        'overflow-hidden border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(232,121,58,0.08),transparent_26%),radial-gradient(circle_at_top_right,rgba(37,99,235,0.06),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(251,251,250,0.99))] p-0 shadow-[0_24px_60px_rgba(15,23,42,0.14)]',
        isSpaceTag ? 'max-w-[520px]' : 'max-w-[620px]',
      )}>
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
            {isSpaceTag ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                      标签类型
                    </Label>
                    <Controller
                      control={form.control}
                      name="tag_type"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-12 rounded-lg border border-border/70 bg-white/90 px-4 text-[15px] font-semibold shadow-[0_8px_18px_rgba(15,23,42,0.04)] data-[placeholder]:text-text-muted/80 [&>span]:text-left">
                            <SelectValue placeholder="选择标签类型" className="text-left" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SPACE">空间</SelectItem>
                            <SelectItem value="TAG">普通标签</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tag-name" className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                      名称
                    </Label>
                    <Input
                      id="tag-name"
                      {...form.register('name')}
                      placeholder="例如：风控空间"
                      className="h-12 rounded-lg border-border/70 bg-white/90 px-4 text-[15px] font-semibold shadow-[0_8px_18px_rgba(15,23,42,0.04)] placeholder:text-text-muted/80"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="block text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                    颜色
                  </Label>
                  <div className="flex justify-center rounded-[22px] border border-border/60 bg-white/70 px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                    <Controller
                      control={form.control}
                      name="color"
                      render={({ field }) => (
                        <SpaceColorRingPicker value={field.value} onChange={field.onChange} size="sm" />
                      )}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <Label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                      标签类型
                    </Label>
                    <Controller control={form.control} name="tag_type" render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-12 rounded-lg border border-border/70 bg-white/90 px-4 text-[15px] font-semibold shadow-[0_8px_18px_rgba(15,23,42,0.04)] data-[placeholder]:text-text-muted/80">
                        <SelectValue placeholder="选择标签类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SPACE">空间</SelectItem>
                        <SelectItem value="TAG">普通标签</SelectItem>
                      </SelectContent>
                    </Select>
                    )} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tag-name" className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                      名称
                    </Label>
                    <Input
                      id="tag-name"
                      {...form.register('name')}
                      placeholder="例如：高频考点"
                      className="h-12 rounded-lg border-border/70 bg-white/90 px-4 text-[15px] font-semibold shadow-[0_8px_18px_rgba(15,23,42,0.04)] placeholder:text-text-muted/80"
                    />
                  </div>
                </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className={cn("flex cursor-pointer items-center gap-4 rounded-xl border border-border/70 bg-white/90 px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)] hover:-translate-y-0.5", SUBTLE_SURFACE_HOVER_CLASSNAME)}>
                  <Controller control={form.control} name="allow_knowledge" render={({ field }) => (
                    <Checkbox id="tag-knowledge" checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                  )} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">知识</p>
                  </div>
                </label>

                <label className={cn("flex cursor-pointer items-center gap-4 rounded-xl border border-border/70 bg-white/90 px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)] hover:-translate-y-0.5", SUBTLE_SURFACE_HOVER_CLASSNAME)}>
                  <Controller control={form.control} name="allow_question" render={({ field }) => (
                    <Checkbox id="tag-question" checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                  )} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">题目</p>
                  </div>
                </label>
              </div>
              </>
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
              onClick={form.handleSubmit(handleSubmit)}
              disabled={isSubmitting || !form.formState.isValid}
            >
              {isSubmitting ? '处理中...' : mode === 'create' ? '创建' : '保存'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
