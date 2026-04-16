import dayjs from '@/lib/dayjs';

export const LIST_DATE_FORMAT = 'YYYY.MM.DD';
export const LIST_TIME_FORMAT = 'HH:mm';
export const LIST_DATE_TIME_FORMAT = `${LIST_DATE_FORMAT} ${LIST_TIME_FORMAT}`;

export const formatListDate = (value?: string | Date | null) => {
  if (!value) return '';
  return dayjs(value).format(LIST_DATE_FORMAT);
};

export const formatListTime = (value?: string | Date | null) => {
  if (!value) return '';
  return dayjs(value).format(LIST_TIME_FORMAT);
};

export const formatListDateTime = (value?: string | Date | null) => {
  if (!value) return '';
  return dayjs(value).format(LIST_DATE_TIME_FORMAT);
};
