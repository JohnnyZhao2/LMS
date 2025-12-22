import { useState, useEffect } from 'react';
import { Typography } from 'antd';
import { ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';

const { Text } = Typography;

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
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-2)',
        padding: 'var(--spacing-2) var(--spacing-4)',
        borderRadius: 'var(--radius-full)',
        background: isCritical
          ? 'var(--color-error-50)'
          : isWarning
            ? 'var(--color-warning-50)'
            : 'rgba(255, 255, 255, 0.1)',
        border: `1px solid ${
          isCritical
            ? 'var(--color-error-300)'
            : isWarning
              ? 'var(--color-warning-300)'
              : 'rgba(255, 255, 255, 0.2)'
        }`,
        animation: isCritical ? 'pulse 1s ease-in-out infinite' : undefined,
      }}
    >
      {isCritical ? (
        <WarningOutlined
          style={{
            color: 'var(--color-error-500)',
            fontSize: 16,
          }}
        />
      ) : (
        <ClockCircleOutlined
          style={{
            color: isWarning ? 'var(--color-warning-600)' : 'white',
            fontSize: 16,
          }}
        />
      )}
      <Text
        strong
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-lg)',
          color: isCritical
            ? 'var(--color-error-600)'
            : isWarning
              ? 'var(--color-warning-600)'
              : 'white',
          letterSpacing: '0.5px',
        }}
      >
        {formatTime(seconds)}
      </Text>
    </div>
  );
};
