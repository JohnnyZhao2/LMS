import { useCallback, useSyncExternalStore } from 'react';

import {
  DEFAULT_WORKBENCH,
  getWorkbench,
  setWorkbench as writeWorkbench,
  subscribeWorkbench,
} from '@/lib/workbench-store';
import type { Workbench } from '@/types/common';

export const useWorkbench = (): Workbench => useSyncExternalStore(
  subscribeWorkbench,
  getWorkbench,
  () => DEFAULT_WORKBENCH,
);

export const useSetWorkbench = () => useCallback((next: Workbench) => {
  writeWorkbench(next);
}, []);
