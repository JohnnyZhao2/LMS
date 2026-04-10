import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimerProps {
  remainingSeconds: number;
  onTimeUp?: () => void;
}

/**
 * 倒计时组件
 * 带有视觉警告效果
 */
export const Timer: React.FC<TimerProps> = ({ remainingSeconds, onTimeUp }) => {
  const [deadline] = useState(() => Date.now() + (Math.max(remainingSeconds, 0) * 1000));
  const [now, setNow] = useState(() => Date.now());
  const hasTriggeredRef = useRef(false);
  const handleTimeUp = useEffectEvent(() => {
    onTimeUp?.();
  });
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));

  useEffect(() => {
    if (remainingSeconds <= 0) {
      if (!hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        handleTimeUp();
      }
      return;
    }

    hasTriggeredRef.current = false;

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [remainingSeconds]);

  useEffect(() => {
    if (seconds > 0 || hasTriggeredRef.current) {
      return;
    }

    hasTriggeredRef.current = true;
    handleTimeUp();
  }, [seconds]);

  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isWarning = seconds <= 300; // 5分钟以内警告
  const isCritical = seconds <= 60; // 1分钟以内紧急

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg border',
        isCritical && 'bg-destructive-50 border-destructive-300 animate-pulse',
        isWarning && !isCritical && 'bg-warning-50 border-warning-300',
        !isWarning && 'bg-primary-50 border-primary-200'
      )}
    >
      {isCritical ? (
        <AlertTriangle className="w-4 h-4 text-destructive-500" />
      ) : (
        <Clock
          className={cn(
            'w-4 h-4',
            isWarning ? 'text-warning-600' : 'text-primary-600'
          )}
        />
      )}
      <span
        className={cn(
          'font-mono text-sm font-semibold tracking-wide',
          isCritical && 'text-destructive-600',
          isWarning && !isCritical && 'text-warning-600',
          !isWarning && 'text-primary-600'
        )}
      >
        {formatTime(seconds)}
      </span>
    </div>
  );
};
