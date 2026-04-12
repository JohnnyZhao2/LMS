import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';

interface QuizSubmitDialogProps {
  open: boolean;
  unansweredCount: number;
  isExam: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

interface QuizTimeUpDialogProps {
  open: boolean;
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
  isExam,
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
                ⚠️ 还有 {unansweredCount} 道题未作答
              </div>
            )}
            <div>
              {isExam ? '考试提交后无法重做，确定要提交吗？' : '确定要提交吗？'}
            </div>
          </div>
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          继续答题
        </Button>
        <Button
          variant={isExam ? 'destructive' : 'default'}
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

export const QuizTimeUpDialog: React.FC<QuizTimeUpDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="rounded-lg">
      <DialogHeader>
        <DialogTitle>⏰ 时间到</DialogTitle>
        <DialogDescription>
          考试时间已结束，系统将自动提交
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button onClick={onConfirm}>
          查看结果
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
