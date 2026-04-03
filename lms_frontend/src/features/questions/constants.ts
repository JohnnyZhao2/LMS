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

import type { QuestionType } from '@/types/api';

type QuestionTypePresentation = {
  value: QuestionType;
  label: string;
  fullLabel: string;
  icon: LucideIcon;
  color: string;
  bg: string;
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
    color: 'text-primary-600',
    bg: 'bg-primary-50',
    accent: 'bg-primary-500',
  },
  MULTIPLE_CHOICE: {
    value: 'MULTIPLE_CHOICE',
    label: '多选',
    fullLabel: '多选题',
    icon: CheckSquare2,
    color: 'text-secondary-600',
    bg: 'bg-secondary-50',
    accent: 'bg-secondary-500',
  },
  TRUE_FALSE: {
    value: 'TRUE_FALSE',
    label: '判断',
    fullLabel: '判断题',
    icon: ToggleLeft,
    color: 'text-warning-600',
    bg: 'bg-warning-50',
    accent: 'bg-warning-500',
  },
  SHORT_ANSWER: {
    value: 'SHORT_ANSWER',
    label: '简答',
    fullLabel: '简答题',
    icon: AlignLeft,
    color: 'text-primary-600',
    bg: 'bg-primary-50',
    accent: 'bg-primary-500',
  },
};

export const QUESTION_TYPE_PICKER_OPTIONS = Object.values(QUESTION_TYPE_CONFIG) as QuestionTypePresentation[];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_CHOICE: QUESTION_TYPE_CONFIG.SINGLE_CHOICE.fullLabel,
  MULTIPLE_CHOICE: QUESTION_TYPE_CONFIG.MULTIPLE_CHOICE.fullLabel,
  TRUE_FALSE: QUESTION_TYPE_CONFIG.TRUE_FALSE.fullLabel,
  SHORT_ANSWER: QUESTION_TYPE_CONFIG.SHORT_ANSWER.fullLabel,
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
  const { label, color, bg, accent } = QUESTION_TYPE_CONFIG[type];
  return { label, color, bg, accent };
};
