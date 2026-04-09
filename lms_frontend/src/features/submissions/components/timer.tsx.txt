import { useState, useEffect, useRef } from 'react';
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
  const [seconds, setSeconds] = useState(remainingSeconds);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    hasTriggeredRef.current = false;
    setSeconds(remainingSeconds);
  }, [remainingSeconds]);

  useEffect(() => {
    if (seconds <= 0) {
      if (!hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        onTimeUp?.();
      }
      return;
    }

    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!hasTriggeredRef.current) {
            hasTriggeredRef.current = true;
            onTimeUp?.();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds, onTimeUp]);

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
