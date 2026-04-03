import { ArrowLeft, Loader2, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EditorWorkbenchHeader } from '@/components/ui/editor-workbench-header';
import { Input } from '@/components/ui/input';
import type { TaskDetail } from '@/types/task';

interface TaskFormHeaderProps {
  isEdit: boolean;
  task?: TaskDetail;
  title: string;
  onTitleChange: (value: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  isSubmitting: boolean;
}

export function TaskFormHeader({
  isEdit,
  task,
  title,
  onTitleChange,
  onBack,
  onSubmit,
  canSubmit,
  isSubmitting,
}: TaskFormHeaderProps) {
  return (
    <EditorWorkbenchHeader
      leftSlot={
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-10 w-10 shrink-0 rounded-full border border-border bg-background text-text-muted shadow-sm hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      }
      centerClassName="px-6"
      centerSlot={
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8">
          <Input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="输入任务标题..."
            className="pointer-events-auto h-7 w-full max-w-[280px] rounded-none border-transparent bg-transparent px-0 text-center text-[14px] font-semibold shadow-none placeholder:text-text-muted/40 hover:border-transparent focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      }
      rightSlot={
        <div className="flex min-w-0 items-center justify-end gap-3">
          {isEdit && task ? (
            <div className="hidden items-center gap-2 text-xs text-text-muted lg:flex">
              <span>{task.updated_by_name || task.created_by_name}</span>
              <span>·</span>
              <span>
                {new Date(task.updated_at).toLocaleString('zh-CN', {
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ) : null}

          <Button
            onClick={onSubmit}
            disabled={!canSubmit || isSubmitting}
            className="h-10 rounded-xl bg-foreground px-4 text-[12px] font-semibold text-background hover:bg-foreground/90"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {isEdit ? '保存修改' : '发布任务'}
          </Button>
        </div>
      }
    />
  );
}
