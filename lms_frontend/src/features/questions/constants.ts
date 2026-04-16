/**
 * 题目相关常量配置
 */
import {
  AlignLeft,
  CheckSquare2,
  CircleDot,
  ToggleLeft,
  type LucideIcon,
} from 'lucide-react';

import type { QuestionType } from '@/types/common';

type QuestionTypePresentation = {
  value: QuestionType;
  label: string;
  fullLabel: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
  accent: string;
};

/**
 * 题目类型配置（用于显示标签）
 */
export const QUESTION_TYPE_CONFIG: Record<QuestionType, QuestionTypePresentation> = {
  SINGLE_CHOICE: {
    value: 'SINGLE_CHOICE',
    label: '单选',
    fullLabel: '单选题',
    icon: CircleDot,
    color: 'text-primary-700',
    bg: 'bg-primary-50',
    border: 'border-primary-200',
    accent: 'bg-primary-500',
  },
  MULTIPLE_CHOICE: {
    value: 'MULTIPLE_CHOICE',
    label: '多选',
    fullLabel: '多选题',
    icon: CheckSquare2,
    color: 'text-secondary-700',
    bg: 'bg-secondary-50',
    border: 'border-secondary-200',
    accent: 'bg-secondary-500',
  },
  TRUE_FALSE: {
    value: 'TRUE_FALSE',
    label: '判断',
    fullLabel: '判断题',
    icon: ToggleLeft,
    color: 'text-warning-700',
    bg: 'bg-warning-50',
    border: 'border-warning-200',
    accent: 'bg-warning-500',
  },
  SHORT_ANSWER: {
    value: 'SHORT_ANSWER',
    label: '简答',
    fullLabel: '简答题',
    icon: AlignLeft,
    color: 'text-slate-700',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    accent: 'bg-slate-400',
  },
};

export const QUESTION_TYPE_PICKER_OPTIONS = Object.values(QUESTION_TYPE_CONFIG) as QuestionTypePresentation[];

const DEFAULT_CHOICE_OPTIONS = [
  { key: 'A', value: '' },
  { key: 'B', value: '' },
  { key: 'C', value: '' },
  { key: 'D', value: '' },
];

export const ensureChoiceOptions = (options?: Array<{ key: string; value: string }>) => {
  const existing = options ?? [];
  if (existing.length >= 4) {
    return existing;
  }
  return [
    ...existing,
    ...DEFAULT_CHOICE_OPTIONS.slice(existing.length).map((option) => ({ ...option })),
  ];
};

interface QuestionTypeFields {
  options?: Array<{ key: string; value: string }>;
  answer?: string | string[];
}

export const normalizeQuestionTypeFields = (
  prev: QuestionTypeFields,
  nextType: QuestionType,
) => {
  if (nextType === 'SINGLE_CHOICE') {
    return {
      options: ensureChoiceOptions(prev.options),
      answer: typeof prev.answer === 'string' ? prev.answer : '',
    };
  }

  if (nextType === 'MULTIPLE_CHOICE') {
    return {
      options: ensureChoiceOptions(prev.options),
      answer: Array.isArray(prev.answer) ? prev.answer : [],
    };
  }

  if (nextType === 'TRUE_FALSE') {
    return {
      options: [],
      answer: prev.answer === 'TRUE' || prev.answer === 'FALSE' ? prev.answer : '',
    };
  }

  return {
    options: [],
    answer: typeof prev.answer === 'string' ? prev.answer : '',
  };
};

export const getQuestionTypePresentation = (type: QuestionType): QuestionTypePresentation =>
  QUESTION_TYPE_CONFIG[type];

/**
 * 获取题目类型显示名称
 */
export const getQuestionTypeLabel = (type: QuestionType): string =>
  QUESTION_TYPE_CONFIG[type].fullLabel;

/**
 * 获取题目类型标签样式
 */
export const getQuestionTypeStyle = (type: QuestionType) => {
  const { label, color, bg, border, accent } = QUESTION_TYPE_CONFIG[type];
  return { label, color, bg, border, accent };
};
