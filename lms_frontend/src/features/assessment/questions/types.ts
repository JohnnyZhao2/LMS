import type { ReactNode } from 'react';

import type { QuestionType } from '@/types/common';

/** 题目文档只读展示模式：预览参考答案 / 用户作答 */
export type QuestionDocumentMode = 'preview' | 'answer';

export interface QuestionChoiceOption {
  key: string;
  value: string;
}

export interface QuestionDocumentBodyProps {
  mode?: QuestionDocumentMode;
  className?: string;
  footerActions?: ReactNode;
  score?: string | number;
  questionType: QuestionType;
  content: string;
  options: QuestionChoiceOption[];
  answer: string | string[];
  response?: string | string[];
  explanation: string;
  showExplanation: boolean;
  disabled?: boolean;
  questionNumber?: number;
  onResponseChange?: (value: string | string[]) => void;
}
