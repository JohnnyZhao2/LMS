import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';

interface QuizSubmitDialogProps {
  open: boolean;
  unansweredCount: number;
  allowRetry: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

interface QuizAbandonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const QuizSubmitDialog: React.FC<QuizSubmitDialogProps> = ({
  open,
  unansweredCount,
  allowRetry,
  isPending,
  onOpenChange,
  onConfirm,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="rounded-lg">
      <DialogHeader>
        <DialogTitle>确认提交</DialogTitle>
        <DialogDescription asChild>
          <div>
            {unansweredCount > 0 && (
              <div className="mb-3 text-warning">
                还有 {unansweredCount} 道题未作答
              </div>
            )}
            <div>
              {allowRetry ? '确定要提交吗？' : '提交后无法重做，确定要提交吗？'}
            </div>
          </div>
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          继续答题
        </Button>
        <Button
          variant={allowRetry ? 'default' : 'destructive'}
          onClick={onConfirm}
          disabled={isPending}
        >
          {isPending && <Spinner size="sm" className="mr-2" />}
          确认提交
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const QuizAbandonDialog: React.FC<QuizAbandonDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="rounded-lg">
      <DialogHeader>
        <DialogTitle>确认放弃作答</DialogTitle>
        <DialogDescription>
          当前已保存的答案会保留，再次进入后可继续作答。
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          继续答题
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          暂时退出
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
