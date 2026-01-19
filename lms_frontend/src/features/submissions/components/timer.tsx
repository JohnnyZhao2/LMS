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
        isCritical && 'bg-red-50 border-red-300 animate-pulse',
        isWarning && !isCritical && 'bg-orange-50 border-orange-300',
        !isWarning && 'bg-blue-50 border-blue-200'
      )}
    >
      {isCritical ? (
        <AlertTriangle className="w-4 h-4 text-red-500" />
      ) : (
        <Clock
          className={cn(
            'w-4 h-4',
            isWarning ? 'text-orange-600' : 'text-blue-600'
          )}
        />
      )}
      <span
        className={cn(
          'font-mono text-sm font-semibold tracking-wide',
          isCritical && 'text-red-600',
          isWarning && !isCritical && 'text-orange-600',
          !isWarning && 'text-blue-600'
        )}
      >
        {formatTime(seconds)}
      </span>
    </div>
  );
};
