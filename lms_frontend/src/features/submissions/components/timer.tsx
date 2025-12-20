import { useState, useEffect } from 'react';
import { Typography } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface TimerProps {
  remainingSeconds: number;
  onTimeUp?: () => void;
}

/**
 * 倒计时组件
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
    return `${minutes}:${s.toString().padStart(2, '0')}`;
  };

  const isWarning = seconds <= 300; // 5分钟以内警告

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <ClockCircleOutlined style={{ color: isWarning ? '#ff4d4f' : '#1890ff' }} />
      <Text type={isWarning ? 'danger' : undefined} strong>
        {formatTime(seconds)}
      </Text>
    </div>
  );
};


