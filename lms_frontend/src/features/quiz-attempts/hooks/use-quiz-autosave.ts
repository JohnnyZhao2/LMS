import { useCallback, useEffect, useRef } from 'react';
import { useSaveAnswer } from '../api/save-answer';
import { showApiError } from '@/utils/error-handler';
import type { SaveAnswerRequest } from '@/features/quiz-attempts/types';

const AUTOSAVE_DELAY_MS = 3000;
const DRAFT_KEY_PREFIX = 'quiz_draft_';

interface FlushPendingOptions {
  keepalive?: boolean;
  forceKeepalive?: boolean;
  skipUnmountFlush?: boolean;
}

type SaveMutation = ReturnType<typeof useSaveAnswer>['mutateAsync'];

interface AutosaveState {
  submissionId: number | null;
  pending: Record<number, SaveAnswerRequest>;
  version: number;
  lastKeepaliveVersion: number;
  timer: number | null;
  inFlight: Promise<boolean> | null;
  flushQueued: boolean;
  queuedKeepalive: boolean;
  skipUnmountFlush: boolean;
  submitting: boolean;
  unmounted: boolean;
  errorNotified: boolean;
}

const readDraft = (submissionId: number): Record<number, SaveAnswerRequest> => {
  try {
    const raw = window.localStorage.getItem(`${DRAFT_KEY_PREFIX}${submissionId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, SaveAnswerRequest>;
    return Object.fromEntries(
      Object.values(parsed)
        .filter((item): item is SaveAnswerRequest => Boolean(item && typeof item.question_id === 'number'))
        .map((item) => [item.question_id, item]),
    );
  } catch {
    return {};
  }
};

const writeDraft = (submissionId: number, pending: Record<number, SaveAnswerRequest>) => {
  try {
    const key = `${DRAFT_KEY_PREFIX}${submissionId}`;
    if (Object.keys(pending).length === 0) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(pending));
    }
  } catch {
    // 忽略无痕模式或存储配额异常，避免打断答题。
  }
};

const clearTimer = (s: AutosaveState) => {
  if (s.timer !== null) {
    window.clearTimeout(s.timer);
    s.timer = null;
  }
};

const scheduleSaveTimer = (s: AutosaveState, saveRef: { current: SaveMutation }, delay = AUTOSAVE_DELAY_MS) => {
  if (s.submitting) return;
  clearTimer(s);
  s.timer = window.setTimeout(() => {
    s.timer = null;
    void runFlush(s, saveRef);
  }, delay);
};

async function runFlush(
  s: AutosaveState,
  saveRef: { current: SaveMutation },
  options: FlushPendingOptions = {},
): Promise<boolean> {
  if (options.skipUnmountFlush) s.skipUnmountFlush = true;
  if (s.submitting) return false;
  clearTimer(s);
  if (options.keepalive) s.queuedKeepalive = true;

  if (s.inFlight) {
    s.flushQueued = true;
    const entries = Object.values(s.pending);
    if (options.keepalive && options.forceKeepalive && s.lastKeepaliveVersion < s.version && s.submissionId !== null && entries.length > 0) {
      s.lastKeepaliveVersion = s.version;
      void saveRef.current({ submissionId: s.submissionId, data: { answers: entries }, keepalive: true }).catch(() => undefined);
    }
    return s.inFlight;
  }

  const loop = async (): Promise<boolean> => {
    let succeeded = true;
    try {
      while (!s.submitting) {
        s.flushQueued = false;
        const keepalive = s.queuedKeepalive;
        s.queuedKeepalive = false;
        const targetId = s.submissionId;
        const entries = Object.values(s.pending);
        if (targetId === null || entries.length === 0) break;

        try {
          if (keepalive) s.lastKeepaliveVersion = s.version;
          await saveRef.current({
            submissionId: targetId,
            data: { answers: entries },
            ...(keepalive ? { keepalive: true } : {}),
          });
          s.errorNotified = false;
          if (s.submissionId === targetId) {
            for (const sent of entries) {
              if (s.pending[sent.question_id] === sent) delete s.pending[sent.question_id];
            }
            writeDraft(targetId, s.pending);
          }
        } catch (error) {
          succeeded = false;
          console.error('批量保存答案失败:', error);
          if (!s.errorNotified) {
            s.errorNotified = true;
            showApiError(error, '部分答案暂未保存到服务器，已暂存本地');
          }
          if (!s.unmounted && !s.submitting && Object.keys(s.pending).length > 0 && s.timer === null) {
            scheduleSaveTimer(s, saveRef, AUTOSAVE_DELAY_MS * 2);
          }
          break;
        }
        if (!s.flushQueued) break;
      }
    } finally {
      s.inFlight = null;
    }
    return succeeded;
  };

  s.inFlight = loop();
  return s.inFlight;
}

export const useQuizAutosave = (submissionId: number | null) => {
  const { mutateAsync: saveAnswerMutation } = useSaveAnswer();
  const saveRef = useRef(saveAnswerMutation);
  const stateRef = useRef<AutosaveState>({
    submissionId,
    pending: {},
    version: 0,
    lastKeepaliveVersion: -1,
    timer: null,
    inFlight: null,
    flushQueued: false,
    queuedKeepalive: false,
    skipUnmountFlush: false,
    submitting: false,
    unmounted: false,
    errorNotified: false,
  });

  useEffect(() => {
    saveRef.current = saveAnswerMutation;
    stateRef.current.submissionId = submissionId;
  }, [saveAnswerMutation, submissionId]);

  const flushPending = useCallback(
    (options: FlushPendingOptions = {}) => runFlush(stateRef.current, saveRef, options),
    [],
  );

  useEffect(() => {
    const s = stateRef.current;
    s.unmounted = false;
    const onPageHide = () => {
      if (!s.submitting) void runFlush(s, saveRef, { keepalive: true, forceKeepalive: true });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !s.submitting) void runFlush(s, saveRef, { keepalive: true });
    };
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      s.unmounted = true;
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearTimer(s);
      if (!s.skipUnmountFlush && !s.submitting) void runFlush(s, saveRef, { keepalive: true });
    };
  }, []);

  const restoreDraft = useCallback((targetId: number, validIds: Set<number>): Record<number, SaveAnswerRequest> => {
    const s = stateRef.current;
    s.submissionId = targetId;
    s.submitting = false;
    s.skipUnmountFlush = false;
    s.errorNotified = false;
    const restored: Record<number, SaveAnswerRequest> = {};
    for (const item of Object.values(readDraft(targetId))) {
      if (validIds.has(item.question_id)) restored[item.question_id] = item;
    }
    s.pending = restored;
    s.version += 1;
    if (Object.keys(restored).length > 0) scheduleSaveTimer(s, saveRef);
    return restored;
  }, []);

  const queueAnswerUpdate = useCallback((questionId: number, patch: Omit<SaveAnswerRequest, 'question_id'>) => {
    const s = stateRef.current;
    if (s.submissionId === null || s.submitting) return;
    s.skipUnmountFlush = false;
    s.pending[questionId] = { ...s.pending[questionId], ...patch, question_id: questionId };
    s.version += 1;
    writeDraft(s.submissionId, s.pending);
    scheduleSaveTimer(s, saveRef);
  }, []);

  const beginSubmit = useCallback(async (): Promise<boolean> => {
    const s = stateRef.current;
    if (s.submitting) return false;
    s.submitting = true;
    s.flushQueued = false;
    clearTimer(s);
    if (s.inFlight) await s.inFlight.catch(() => undefined);
    return true;
  }, []);

  const finishSubmit = useCallback((targetId: number) => {
    stateRef.current.pending = {};
    writeDraft(targetId, {});
  }, []);

  const cancelSubmit = useCallback(() => {
    const s = stateRef.current;
    s.submitting = false;
    if (Object.keys(s.pending).length > 0) scheduleSaveTimer(s, saveRef);
  }, []);

  return { restoreDraft, queueAnswerUpdate, flushPending, beginSubmit, finishSubmit, cancelSubmit };
};
