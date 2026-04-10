import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { QuizPreviewWorkbench } from './quiz-preview-workbench';

interface QuizPreviewDialogProps {
  open: boolean;
  quizId: number | null;
  onOpenChange: (open: boolean) => void;
  onPrimaryAction?: (quizId: number) => void;
}

export function QuizPreviewDialog({
  open,
  quizId,
  onOpenChange,
  onPrimaryAction,
}: QuizPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[min(88vh,860px)] max-w-[min(1380px,calc(100vw-32px))] gap-0 overflow-hidden p-3"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>试卷快速预览</DialogTitle>
        </DialogHeader>

        {quizId ? (
          <QuizPreviewWorkbench
            quizId={quizId}
            onPrimaryAction={onPrimaryAction}
            className="h-full"
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
