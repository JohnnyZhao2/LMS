import React from 'react';

import { ensureChoiceOptions } from '@/features/assessment/questions/config';
import type { QuestionType } from '@/types/common';
import type { Question, QuestionCreateRequest } from '@/types/question';

let questionEditorKeyCounter = 0;

export const DEFAULT_QUESTION_SCORE = '5';

const nextQuestionEditorKey = () => `question_editor_${++questionEditorKeyCounter}`;

export const normalizeQuestionScore = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return DEFAULT_QUESTION_SCORE;
  const num = Number(value);
  return Number.isNaN(num) ? String(value) : String(num);
};

export interface EditableQuestionItem {
  key: string;
  questionId: number | null;
  sourceQuestionId?: number | null;
  quizQuestionId?: number | null;
  questionType: QuestionType;
  spaceTagId?: number | null;
  content: string;
  options: Array<{ key: string; value: string }>;
  answer: string | string[];
  explanation: string;
  showExplanation: boolean;
  score: string;
  tagIds: number[];
  original?: Partial<QuestionCreateRequest>;
  saved: boolean;
}

export const buildQuestionForm = (question: Question): Partial<QuestionCreateRequest> => ({
  question_type: question.question_type,
  content: question.content,
  options: question.options || [],
  answer: question.answer || '',
  explanation: question.explanation || '',
  space_tag_id: question.space_tag?.id,
  tag_ids: question.tags?.map((tag) => tag.id) ?? [],
});

export const hasQuestionAnswer = (value: QuestionCreateRequest['answer']) =>
  Array.isArray(value) ? value.length > 0 : Boolean(value);

const normalizeCompareValue = (value: unknown, field: keyof QuestionCreateRequest) => {
  if (field === 'tag_ids' && Array.isArray(value)) {
    return [...value].sort((a, b) => Number(a) - Number(b));
  }
  return value ?? null;
};

export const buildQuestionPatchPayload = (
  baseline: Partial<QuestionCreateRequest>,
  current: Partial<QuestionCreateRequest>,
): Partial<QuestionCreateRequest> => {
  const fields: Array<keyof QuestionCreateRequest> = [
    'space_tag_id',
    'content',
    'options',
    'answer',
    'explanation',
    'tag_ids',
  ];
  const patch: Partial<QuestionCreateRequest> = {};

  fields.forEach((field) => {
    const before = normalizeCompareValue(baseline[field], field);
    const after = normalizeCompareValue(current[field], field);

    if (JSON.stringify(before) !== JSON.stringify(after)) {
      switch (field) {
        case 'space_tag_id':
          patch.space_tag_id = current.space_tag_id;
          break;
        case 'content':
          patch.content = current.content;
          break;
        case 'options':
          patch.options = current.options;
          break;
        case 'answer':
          patch.answer = current.answer;
          break;
        case 'explanation':
          patch.explanation = current.explanation;
          break;
        case 'tag_ids':
          patch.tag_ids = current.tag_ids;
          break;
        default:
          break;
      }
    }
  });

  return patch;
};

export const buildQuestionCreatePayload = (item: EditableQuestionItem): QuestionCreateRequest => ({
  question_type: item.questionType,
  content: item.content,
  options: item.options,
  answer: item.answer,
  explanation: item.explanation,
  space_tag_id: item.spaceTagId ?? null,
  tag_ids: item.tagIds,
});

export const questionToEditableItem = (question: Question, key = nextQuestionEditorKey()): EditableQuestionItem => {
  const form = buildQuestionForm(question);

  return {
    key,
    questionId: question.id,
    sourceQuestionId: question.id,
    quizQuestionId: null,
    questionType: question.question_type,
    spaceTagId: question.space_tag?.id ?? null,
    content: question.content,
    options: question.options || [],
    answer: question.answer || '',
    explanation: question.explanation || '',
    showExplanation: Boolean(question.explanation?.trim()),
    score: DEFAULT_QUESTION_SCORE,
    tagIds: question.tags?.map((tag) => tag.id) ?? [],
    original: form,
    saved: true,
  };
};

export const syncEditableQuestionItem = (
  source: Pick<EditableQuestionItem, 'key' | 'score'>,
  question: Question,
  scoreOverride?: string | number | null,
): EditableQuestionItem => {
  const next = questionToEditableItem(question, source.key);
  const resolvedScore = normalizeQuestionScore(scoreOverride ?? source.score ?? next.score);

  next.score = resolvedScore;

  return next;
};

export const createBlankEditableQuestion = (
  questionType: QuestionType = 'SINGLE_CHOICE',
  spaceTagId: number | null = null,
): EditableQuestionItem => {
  const isChoiceType = questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE';

  return {
    key: nextQuestionEditorKey(),
    questionId: null,
    sourceQuestionId: null,
    quizQuestionId: null,
    questionType,
    spaceTagId,
    content: '',
    options: isChoiceType ? ensureChoiceOptions([]) : [],
    answer: '',
    explanation: '',
    showExplanation: false,
    score: DEFAULT_QUESTION_SCORE,
    tagIds: [],
    saved: false,
  };
};

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

/**
 * 题目文档左右分栏布局：监听宽度切换紧凑模式，并支持拖拽调整比例。
 */
export const useQuestionDocumentSplitLayout = (compactWidth = 700) => {
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
