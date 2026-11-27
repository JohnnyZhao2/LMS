import type { Workbench } from '@/types/common';
import { tokenStorage } from '@/lib/token-storage';

export const WORKBENCH_STORAGE_KEY = 'lms.workbench';
export const IMPERSONATION_WORKBENCH_KEY = 'lms.impersonation.workbench';
export const DEFAULT_WORKBENCH: Workbench = 'learn';

const isWorkbench = (value: string | null): value is Workbench => (
  value === 'learn' || value === 'manage'
);

const readStoredWorkbench = (): Workbench => {
  try {
    if (tokenStorage.isImpersonating() && typeof sessionStorage !== 'undefined') {
      const value = sessionStorage.getItem(IMPERSONATION_WORKBENCH_KEY);
      return isWorkbench(value) ? value : DEFAULT_WORKBENCH;
    }
    if (typeof localStorage === 'undefined') {
      return DEFAULT_WORKBENCH;
    }
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
  const changed = next !== workbench;
  workbench = next;
  try {
    if (tokenStorage.isImpersonating() && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(IMPERSONATION_WORKBENCH_KEY, next);
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(WORKBENCH_STORAGE_KEY, next);
    }
  } catch {
    // ignore quota / private mode
  }
  if (changed) {
    listeners.forEach((listener) => listener());
  }
};

export const syncWorkbenchFromStorage = (): void => {
  const next = readStoredWorkbench();
  if (next === workbench) {
    return;
  }
  workbench = next;
  listeners.forEach((listener) => listener());
};

export const clearImpersonationWorkbench = (): void => {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(IMPERSONATION_WORKBENCH_KEY);
    }
  } catch {
    // ignore
  }
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
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(IMPERSONATION_WORKBENCH_KEY);
    }
    localStorage.removeItem(WORKBENCH_STORAGE_KEY);
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener());
};
