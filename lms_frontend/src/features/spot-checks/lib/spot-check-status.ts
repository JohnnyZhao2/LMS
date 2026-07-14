import type { SpotCheckStatus } from '@/types/spot-check';

export const SPOT_CHECK_STATUS_META: Record<
  SpotCheckStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: '待填写',
    className: 'bg-primary-100/70 text-primary-700',
  },
  SUBMITTED: {
    label: '已提交',
    className: 'bg-warning-100/75 text-warning-700',
  },
  SCORED: {
    label: '已评分',
    className: 'bg-secondary-100/70 text-secondary-700',
  },
};
