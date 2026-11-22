import { useCallback, useSyncExternalStore } from 'react';

import { useAuth } from '@/lib/auth';
import {
  DEFAULT_WORKBENCH,
  getWorkbench,
  setWorkbench as writeWorkbench,
  subscribeWorkbench,
} from '@/lib/workbench-store';
import type { Workbench } from '@/types/common';

export const useWorkbench = (): Workbench => {
  const { canAccessManage } = useAuth();
  const workbench = useSyncExternalStore(
    subscribeWorkbench,
    getWorkbench,
    () => DEFAULT_WORKBENCH,
  );
  return canAccessManage ? workbench : DEFAULT_WORKBENCH;
};

export const useSetWorkbench = () => useCallback((next: Workbench) => {
  writeWorkbench(next);
}, []);
