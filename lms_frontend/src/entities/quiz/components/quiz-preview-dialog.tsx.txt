import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { QuizPreviewWorkbench } from '@/entities/quiz/components/quiz-preview-workbench';

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
        className="flex h-[min(88vh,860px)] min-h-0 w-[min(1380px,calc(100vw-32px))] max-w-none flex-col gap-0 overflow-hidden p-3"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>试卷快速预览</DialogTitle>
        </DialogHeader>

        {quizId ? (
          <QuizPreviewWorkbench
            quizId={quizId}
            onPrimaryAction={onPrimaryAction}
            className="min-h-0 flex-1"
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
