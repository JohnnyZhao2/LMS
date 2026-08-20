import type { Workbench } from '@/types/common';

export const WORKBENCH_STORAGE_KEY = 'lms.workbench';
export const DEFAULT_WORKBENCH: Workbench = 'learn';

const isWorkbench = (value: string | null): value is Workbench => (
  value === 'learn' || value === 'manage'
);

const readStoredWorkbench = (): Workbench => {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_WORKBENCH;
  }
  try {
    const value = localStorage.getItem(WORKBENCH_STORAGE_KEY);
    return isWorkbench(value) ? value : DEFAULT_WORKBENCH;
  } catch {
    return DEFAULT_WORKBENCH;
  }
};

let workbench: Workbench = readStoredWorkbench();
const listeners = new Set<() => void>();

export const getWorkbench = (): Workbench => workbench;

export const setWorkbench = (next: Workbench): void => {
  if (next === workbench) {
    return;
  }
  workbench = next;
  try {
    localStorage.setItem(WORKBENCH_STORAGE_KEY, next);
  } catch {
    // ignore quota / private mode
  }
  listeners.forEach((listener) => listener());
};

export const subscribeWorkbench = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const resetWorkbenchForTests = (): void => {
  workbench = DEFAULT_WORKBENCH;
  try {
    localStorage.removeItem(WORKBENCH_STORAGE_KEY);
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener());
};
