export const formatScore = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '';

  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) return String(value);

  const roundedValue = Math.round(numericValue * 10) / 10;
  return Number.isInteger(roundedValue) ? String(roundedValue) : roundedValue.toFixed(1);
};
