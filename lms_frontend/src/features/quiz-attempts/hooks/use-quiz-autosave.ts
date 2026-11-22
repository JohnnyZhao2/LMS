import { useCallback, useEffect, useRef } from 'react';
import { useSaveAnswer } from '../api/save-answer';
import { showApiError } from '@/utils/error-handler';
import type { SaveAnswerRequest } from '@/features/quiz-attempts/types';

const AUTOSAVE_DELAY_MS = 3000;
const DRAFT_KEY_PREFIX = 'quiz_draft_';

const readDraft = (submissionId: number): Record<number, SaveAnswerRequest> => {
  try {
    const raw = window.localStorage.getItem(`${DRAFT_KEY_PREFIX}${submissionId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, SaveAnswerRequest>;
    const result: Record<number, SaveAnswerRequest> = {};
    for (const item of Object.values(parsed)) {
      if (item && typeof item.question_id === 'number') {
        result[item.question_id] = item;
      }
    }
    return result;
  } catch {
    return {};
  }
};

const writeDraft = (submissionId: number, pending: Record<number, SaveAnswerRequest>) => {
  try {
    const key = `${DRAFT_KEY_PREFIX}${submissionId}`;
    if (Object.keys(pending).length === 0) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(pending));
  } catch {
    // 忽略无痕模式或存储配额异常，避免打断答题。
  }
};

interface FlushPendingOptions {
  keepalive?: boolean;
  forceKeepalive?: boolean;
  skipUnmountFlush?: boolean;
}

export const useQuizAutosave = (submissionId: number | null) => {
  const { mutateAsync: saveAnswerMutation } = useSaveAnswer();

  const submissionIdRef = useRef<number | null>(submissionId);
  const pendingRef = useRef<Record<number, SaveAnswerRequest>>({});
  const pendingVersionRef = useRef(0);
  const lastKeepaliveVersionRef = useRef(-1);
  const saveTimerRef = useRef<number | null>(null);
  const inFlightSaveRef = useRef<Promise<boolean> | null>(null);
  const flushQueuedRef = useRef(false);
  const queuedKeepaliveRef = useRef(false);
  const skipUnmountFlushRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const isUnmountedRef = useRef(false);
  const saveErrorNotifiedRef = useRef(false);

  useEffect(() => {
    submissionIdRef.current = submissionId;
  }, [submissionId]);

  const clearSaveTimer = useCallback(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, []);

  const flushPending = useCallback(async (options: FlushPendingOptions = {}): Promise<boolean> => {
    if (options.skipUnmountFlush) {
      skipUnmountFlushRef.current = true;
    }
    if (isSubmittingRef.current) {
      return false;
    }
    clearSaveTimer();
    if (options.keepalive) {
      queuedKeepaliveRef.current = true;
    }
    if (inFlightSaveRef.current) {
      flushQueuedRef.current = true;
      if (
        options.keepalive
        && options.forceKeepalive
        && lastKeepaliveVersionRef.current < pendingVersionRef.current
      ) {
        const currentSubmissionId = submissionIdRef.current;
        const entries = Object.values(pendingRef.current);
        if (currentSubmissionId !== null && entries.length > 0) {
          lastKeepaliveVersionRef.current = pendingVersionRef.current;
          void saveAnswerMutation({
            submissionId: currentSubmissionId,
            data: { answers: entries },
            keepalive: true,
          }).catch(() => undefined);
        }
      }
      return inFlightSaveRef.current;
    }

    const runFlushLoop = async (): Promise<boolean> => {
      let succeeded = true;
      try {
        while (!isSubmittingRef.current) {
          flushQueuedRef.current = false;
          const keepalive = queuedKeepaliveRef.current;
          queuedKeepaliveRef.current = false;
          const currentSubmissionId = submissionIdRef.current;
          const currentVersion = pendingVersionRef.current;
          const entries = Object.values(pendingRef.current);
          if (currentSubmissionId === null || entries.length === 0) {
            break;
          }

          try {
            if (keepalive) {
              lastKeepaliveVersionRef.current = currentVersion;
            }
            await saveAnswerMutation({
              submissionId: currentSubmissionId,
              data: { answers: entries },
              ...(keepalive ? { keepalive: true } : {}),
            });
            saveErrorNotifiedRef.current = false;
            if (submissionIdRef.current === currentSubmissionId) {
              for (const sent of entries) {
                const current = pendingRef.current[sent.question_id];
                if (current === sent) {
                  delete pendingRef.current[sent.question_id];
                }
              }
              writeDraft(currentSubmissionId, pendingRef.current);
            }
          } catch (error) {
            succeeded = false;
            console.error('批量保存答案失败:', error);
            if (!saveErrorNotifiedRef.current) {
              saveErrorNotifiedRef.current = true;
              showApiError(error, '部分答案暂未保存到服务器，已暂存本地');
            }
            if (
              !isUnmountedRef.current
              && !isSubmittingRef.current
              && Object.keys(pendingRef.current).length > 0
              && saveTimerRef.current === null
            ) {
              saveTimerRef.current = window.setTimeout(() => {
                saveTimerRef.current = null;
                void flushPending();
              }, AUTOSAVE_DELAY_MS * 2);
            }
            break;
          }

          if (!flushQueuedRef.current) {
            break;
          }
        }
      } finally {
        inFlightSaveRef.current = null;
      }
      return succeeded;
    };

    const request = runFlushLoop();
    inFlightSaveRef.current = request;
    return request;
  }, [clearSaveTimer, saveAnswerMutation]);

  const scheduleSave = useCallback(() => {
    if (isSubmittingRef.current) {
      return;
    }
    clearSaveTimer();
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void flushPending();
    }, AUTOSAVE_DELAY_MS);
  }, [clearSaveTimer, flushPending]);

  useEffect(() => {
    isUnmountedRef.current = false;
    const handlePageHide = () => {
      if (isSubmittingRef.current) {
        return;
      }
      void flushPending({ keepalive: true, forceKeepalive: true });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !isSubmittingRef.current) {
        void flushPending({ keepalive: true });
      }
    };
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      isUnmountedRef.current = true;
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearSaveTimer();
      if (!skipUnmountFlushRef.current && !isSubmittingRef.current) {
        void flushPending({ keepalive: true });
      }
    };
  }, [clearSaveTimer, flushPending]);

  const restoreDraft = useCallback((
    targetSubmissionId: number,
    validQuestionIds: Set<number>,
  ): Record<number, SaveAnswerRequest> => {
    submissionIdRef.current = targetSubmissionId;
    isSubmittingRef.current = false;
    skipUnmountFlushRef.current = false;
    const draft = readDraft(targetSubmissionId);
    const restoredPending: Record<number, SaveAnswerRequest> = {};
    for (const item of Object.values(draft)) {
      if (validQuestionIds.has(item.question_id)) {
        restoredPending[item.question_id] = item;
      }
    }
    pendingRef.current = restoredPending;
    pendingVersionRef.current += 1;
    saveErrorNotifiedRef.current = false;
    if (Object.keys(restoredPending).length > 0) {
      scheduleSave();
    }
    return restoredPending;
  }, [scheduleSave]);

  const queueAnswerUpdate = useCallback((
    questionId: number,
    patch: Omit<SaveAnswerRequest, 'question_id'>,
  ) => {
    const currentSubmissionId = submissionIdRef.current;
    if (currentSubmissionId === null || isSubmittingRef.current) {
      return;
    }
    skipUnmountFlushRef.current = false;
    pendingRef.current[questionId] = {
      ...pendingRef.current[questionId],
      ...patch,
      question_id: questionId,
    };
    pendingVersionRef.current += 1;
    writeDraft(currentSubmissionId, pendingRef.current);
    scheduleSave();
  }, [scheduleSave]);

  const beginSubmit = useCallback(async (): Promise<boolean> => {
    if (isSubmittingRef.current) {
      return false;
    }
    isSubmittingRef.current = true;
    flushQueuedRef.current = false;
    clearSaveTimer();
    if (inFlightSaveRef.current) {
      await inFlightSaveRef.current.catch(() => undefined);
    }
    return true;
  }, [clearSaveTimer]);

  const finishSubmit = useCallback((targetSubmissionId: number) => {
    pendingRef.current = {};
    writeDraft(targetSubmissionId, {});
  }, []);

  const cancelSubmit = useCallback(() => {
    isSubmittingRef.current = false;
    if (Object.keys(pendingRef.current).length > 0) {
      scheduleSave();
    }
  }, [scheduleSave]);

  return {
    restoreDraft,
    queueAnswerUpdate,
    flushPending,
    beginSubmit,
    finishSubmit,
    cancelSubmit,
  };
};
