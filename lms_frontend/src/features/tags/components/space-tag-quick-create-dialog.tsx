import * as React from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { SpaceColorRingPicker, SPACE_THEME_COLORS } from '@/components/common/space-color-ring-picker';
import { cn } from '@/lib/utils';

interface SpaceTagQuickCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'create' | 'edit';
  initialName?: string;
  initialColor?: string;
  onSubmit: (payload: { name: string; color: string }) => Promise<void> | void;
  isSubmitting?: boolean;
}

export const SpaceTagQuickCreateDialog: React.FC<SpaceTagQuickCreateDialogProps> = ({
  open,
  onOpenChange,
  mode = 'create',
  initialName = '',
  initialColor = SPACE_THEME_COLORS[0],
  onSubmit,
  isSubmitting = false,
}) => {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [name, setName] = React.useState('');
  const [color, setColor] = React.useState<string>(SPACE_THEME_COLORS[0]);

  React.useEffect(() => {
    if (open) {
      setStep(1);
      setName(initialName);
      setColor(initialColor);
      return;
    }
    setStep(1);
    setName('');
    setColor(SPACE_THEME_COLORS[0]);
  }, [open, initialColor, initialName]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      return;
    }
    await onSubmit({
      name: name.trim(),
      color,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] overflow-hidden border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(232,121,58,0.08),transparent_26%),radial-gradient(circle_at_top_right,rgba(37,99,235,0.06),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(251,251,250,0.99))] p-0 shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
        <div className="relative px-7 py-8 sm:px-10 sm:py-9">
          <div className="pointer-events-none absolute -left-10 top-0 h-24 w-24 rounded-full bg-[rgba(232,121,58,0.08)] blur-2xl" />
          <div className="pointer-events-none absolute right-0 top-6 h-20 w-20 rounded-full bg-[rgba(37,99,235,0.06)] blur-2xl" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,rgba(232,121,58,0),rgba(232,121,58,0.55),rgba(37,99,235,0.32),rgba(37,99,235,0))]" />
          {step === 1 ? (
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-5 h-12 w-12">
                <span className="absolute left-1/2 top-0 h-5 w-5 -translate-x-1/2 rounded-full border-[2.5px] border-primary-300" />
                <span className="absolute left-0 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-[2.5px] border-secondary-300" />
                <span className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-[2.5px] border-destructive-300" />
                <span className="absolute bottom-0 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full border-[2.5px] border-primary-600" />
              </div>

              <DialogTitle className="text-center text-[30px] font-medium leading-none tracking-[-0.03em] text-foreground sm:text-[34px]">
                {mode === 'create' ? '创建新 Space' : '编辑 Space'}
              </DialogTitle>
              <DialogDescription className="mt-4 max-w-[360px] text-center text-[14px] leading-[1.8] text-text-muted sm:text-[15px]">
                {mode === 'create'
                  ? 'Space 是知识卡片的单选归类。你可以直接上传卡片到 Space，也可以从概览中选择卡片。'
                  : '先更新名称，再确认颜色。整个管理端都统一走这一套 Space 编辑流程。'}
              </DialogDescription>

              <div className="mt-7 w-full max-w-[360px]">
                <input
                  id="space-tag-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && name.trim()) {
                      e.preventDefault();
                      setStep(2);
                    }
                  }}
                  placeholder="输入 Space 名称"
                  maxLength={20}
                  autoFocus
                  className="h-14 w-full rounded-lg border border-border bg-transparent px-5 text-center text-[16px] text-foreground outline-none transition-colors placeholder:text-text-muted focus:border-primary"
                />
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!name.trim()}
                className={cn(
                  'mt-7 rounded-full px-7 py-2.5 text-[14px] font-medium tracking-[0.08em] transition-colors disabled:cursor-not-allowed disabled:opacity-70',
                  !name.trim()
                    ? 'bg-muted text-foreground'
                    : 'bg-[#E8793A] text-white hover:bg-[#D96C2F]',
                )}
              >
                下一步
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <DialogTitle className="text-center text-[30px] font-medium leading-none tracking-[-0.03em] text-foreground sm:text-[34px]">
                选择主题色
              </DialogTitle>
              <DialogDescription className="mt-4 max-w-[360px] text-center text-[14px] leading-[1.8] text-text-muted sm:text-[15px]">
                颜色会帮助你更快识别这个 Space。先选一个你最顺眼的标记色。
              </DialogDescription>

              <SpaceColorRingPicker
                value={color}
                onChange={setColor}
                className="mt-5"
              />

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={cn(
                    'w-[110px] rounded-full border border-border px-7 py-2.5 text-[14px] font-medium tracking-[0.08em] text-text-muted transition-colors hover:bg-muted',
                  )}
                >
                  上一步
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={isSubmitting || !name.trim()}
                  className={cn(
                    'w-[110px] rounded-full px-7 py-2.5 text-[14px] font-medium tracking-[0.08em] transition-colors disabled:cursor-not-allowed disabled:opacity-70',
                    isSubmitting || !name.trim()
                      ? 'bg-muted text-foreground'
                      : 'bg-[#E8793A] text-white hover:bg-[#D96C2F]',
                  )}
                >
                  {isSubmitting ? '保存中' : mode === 'create' ? '保存' : '更新'}
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
