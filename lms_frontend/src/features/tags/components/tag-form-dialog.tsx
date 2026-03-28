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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Tag, TagType } from '@/types/api';


interface TagFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  tagType: TagType;
  tag?: Tag | null;
  onSubmit: (payload: {
    name: string;
    color: string;
    sort_order: number;
    is_active: boolean;
    allow_knowledge: boolean;
    allow_question: boolean;
  }) => Promise<void> | void;
  isSubmitting?: boolean;
}

export const TagFormDialog: React.FC<TagFormDialogProps> = ({
  open,
  onOpenChange,
  mode,
  tagType,
  tag,
  onSubmit,
  isSubmitting = false,
}) => {
  const [name, setName] = React.useState('');
  const [color, setColor] = React.useState('#4A90E2');
  const [sortOrder, setSortOrder] = React.useState('0');
  const [isActive, setIsActive] = React.useState(true);
  const [allowKnowledge, setAllowKnowledge] = React.useState(true);
  const [allowQuestion, setAllowQuestion] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName(tag?.name ?? '');
    setColor(tag?.color ?? '#4A90E2');
    setSortOrder(String(tag?.sort_order ?? 0));
    setIsActive(tag?.is_active ?? true);
    setAllowKnowledge(tag?.allow_knowledge ?? true);
    setAllowQuestion(tag?.allow_question ?? false);
  }, [open, tag]);

  const handleSubmit = async () => {
    await onSubmit({
      name: name.trim(),
      color,
      sort_order: Number(sortOrder) || 0,
      is_active: isActive,
      allow_knowledge: tagType === 'LINE' ? true : allowKnowledge,
      allow_question: tagType === 'LINE' ? true : allowQuestion,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? '新建标签' : '编辑标签'}</DialogTitle>
          <DialogDescription>
            {tagType === 'LINE' ? '条线类型会同时适用于知识与题目。' : '普通标签可按知识/题目控制适用范围。'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tag-name">名称</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={tagType === 'LINE' ? '例如：风控条线' : '例如：高频考点'}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tag-color">颜色</Label>
              <Input
                id="tag-color"
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-10 p-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag-sort">排序</Label>
              <Input
                id="tag-sort"
                type="number"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
              />
            </div>
          </div>

          {tagType === 'TAG' && (
            <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
              <Label>适用范围</Label>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="tag-knowledge"
                  checked={allowKnowledge}
                  onCheckedChange={(checked) => setAllowKnowledge(Boolean(checked))}
                />
                <Label htmlFor="tag-knowledge" className="cursor-pointer">知识</Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="tag-question"
                  checked={allowQuestion}
                  onCheckedChange={(checked) => setAllowQuestion(Boolean(checked))}
                />
                <Label htmlFor="tag-question" className="cursor-pointer">题目</Label>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-4">
            <Checkbox
              id="tag-active"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(Boolean(checked))}
            />
            <Label htmlFor="tag-active" className="cursor-pointer">启用标签</Label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:space-x-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || !name.trim() || (tagType === 'TAG' && !allowKnowledge && !allowQuestion)}
          >
            {isSubmitting ? '处理中...' : mode === 'create' ? '创建' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

