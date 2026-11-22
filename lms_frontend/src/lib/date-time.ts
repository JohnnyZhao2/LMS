import dayjs from '@/lib/dayjs';

export const LIST_DATE_FORMAT = 'YYYY.MM.DD';
export const LIST_TIME_FORMAT = 'HH:mm';
export const LIST_DATE_TIME_FORMAT = `${LIST_DATE_FORMAT} ${LIST_TIME_FORMAT}`;

export const formatListDateTime = (value?: string | Date | null) => {
  if (!value) return '';
  return dayjs(value).format(LIST_DATE_TIME_FORMAT);
};

export const formatDurationClock = (minutes: number | null): string => {
  if (minutes === null || !Number.isFinite(minutes) || minutes <= 0) {
    return '—';
  }
  const totalSeconds = Math.round(minutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hours > 0) {
    return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
};
