import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimerProps {
  remainingSeconds: number;
}

/**
 * 参考时间倒计时组件
 */
export const Timer: React.FC<TimerProps> = ({ remainingSeconds }) => {
  const [deadline] = useState(() => Date.now() + (Math.max(remainingSeconds, 0) * 1000));
  const [now, setNow] = useState(() => Date.now());
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));
  const isExceeded = remainingSeconds <= 0 || seconds === 0;

  useEffect(() => {
    if (remainingSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setNow((currentNow) => {
        const nextNow = Date.now();
        if (nextNow >= deadline) {
          window.clearInterval(timer);
        }
        return nextNow > currentNow ? nextNow : currentNow;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [deadline, remainingSeconds]);

  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isWarning = !isExceeded && seconds <= 300;
  const timeText = formatTime(seconds);

  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-2',
        isExceeded && 'border-destructive-300 bg-destructive-50',
        isWarning && 'border-warning-300 bg-warning-50',
        !isWarning && !isExceeded && 'border-primary-200 bg-primary-50'
      )}
    >
      <div className="flex items-center gap-2">
        {isExceeded ? (
          <AlertTriangle className="h-4 w-4 text-destructive-500" />
        ) : (
          <Clock
            className={cn(
              'h-4 w-4',
              isWarning ? 'text-warning-600' : 'text-primary-600'
            )}
          />
        )}
        <span
          className={cn(
            'font-mono text-sm font-semibold tracking-wide',
            isExceeded && 'text-destructive-600',
            isWarning && 'text-warning-600',
            !isWarning && !isExceeded && 'text-primary-600'
          )}
        >
          {timeText}
        </span>
      </div>
      {isExceeded ? (
        <div className="mt-1 text-xs font-medium text-destructive-600">
          你已超过参考时间
        </div>
      ) : null}
    </div>
  );
};
