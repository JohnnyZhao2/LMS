import { useState, useEffect } from 'react';
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

  useEffect(() => {
    setSeconds(remainingSeconds);
  }, [remainingSeconds]);

  useEffect(() => {
    if (seconds <= 0) {
      onTimeUp?.();
      return;
    }

    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeUp?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds > 0, onTimeUp]);

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
        'flex items-center gap-2 px-4 py-2 rounded-full border',
        isCritical && 'bg-error-50 border-error-300 animate-pulse',
        isWarning && !isCritical && 'bg-warning-50 border-warning-300',
        !isWarning && 'bg-white/10 border-white/20'
      )}
    >
      {isCritical ? (
        <AlertTriangle className="w-4 h-4 text-error-500" />
      ) : (
        <Clock
          className={cn(
            'w-4 h-4',
            isWarning ? 'text-warning-600' : 'text-white'
          )}
        />
      )}
      <span
        className={cn(
          'font-mono text-lg font-semibold tracking-wide',
          isCritical && 'text-error-600',
          isWarning && !isCritical && 'text-warning-600',
          !isWarning && 'text-white'
        )}
      >
        {formatTime(seconds)}
      </span>
    </div>
  );
};
