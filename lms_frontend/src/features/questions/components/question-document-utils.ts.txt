import React from 'react';

import type { QuestionType } from '@/types/api';

export const QUESTION_TRUE_FALSE_ITEMS = [
  { key: 'TRUE', label: '正确' },
  { key: 'FALSE', label: '错误' },
] as const;

export const normalizeQuestionValueToArray = (
  value: string | string[] | undefined,
  questionType: QuestionType,
): string[] => {
  if (questionType === 'MULTIPLE_CHOICE') {
    return Array.isArray(value) ? value : typeof value === 'string' && value ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return value ? [value] : [];
};

export const useQuestionDocumentSplitLayout = (compactWidth = 760) => {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const [splitPercent, setSplitPercent] = React.useState(46);
  const [isCompact, setIsCompact] = React.useState(false);

  React.useEffect(() => {
    const node = rootRef.current;
    if (!node) {
      return undefined;
    }

    const observer = new ResizeObserver(([entry]) => {
      setIsCompact(entry.contentRect.width < compactWidth);
    });
    observer.observe(node);

    return () => observer.disconnect();
  }, [compactWidth]);

  const startResize = React.useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (isCompact) {
      return;
    }

    const root = rootRef.current;
    if (!root) {
      return;
    }

    event.preventDefault();
    const bounds = root.getBoundingClientRect();
    const { body } = document;
    const previousCursor = body.style.cursor;
    const previousUserSelect = body.style.userSelect;

    body.style.cursor = 'col-resize';
    body.style.userSelect = 'none';

    const handleMove = (moveEvent: PointerEvent) => {
      const next = ((moveEvent.clientX - bounds.left) / bounds.width) * 100;
      setSplitPercent(Math.min(68, Math.max(32, next)));
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      body.style.cursor = previousCursor;
      body.style.userSelect = previousUserSelect;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [isCompact]);

  return {
    rootRef,
    isCompact,
    splitLayoutStyle: isCompact
      ? undefined
      : { gridTemplateColumns: `${splitPercent}% minmax(0,1fr)` },
    dividerPositionStyle: isCompact ? undefined : { left: `${splitPercent}%` },
    startResize,
  };
};
