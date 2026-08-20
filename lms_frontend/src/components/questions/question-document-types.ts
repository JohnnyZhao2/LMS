import type { ReactNode } from 'react';

import type { QuestionType } from '@/types/common';

export type QuestionDocumentMode = 'edit' | 'preview' | 'answer';

export interface QuestionChoiceOption {
  key: string;
  value: string;
}

export interface QuestionDocumentBodyProps {
  mode?: QuestionDocumentMode;
  className?: string;
  metaBar?: ReactNode;
  footerActions?: ReactNode;
  score?: string | number;
  questionType: QuestionType;
  content: string;
  options: QuestionChoiceOption[];
  answer: string | string[];
  response?: string | string[];
  explanation: string;
  showExplanation: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  questionNumber?: number;
  onContentChange?: (value: string) => void;
  onOptionsChange?: (value: QuestionChoiceOption[]) => void;
  onAnswerChange?: (value: string | string[]) => void;
  onResponseChange?: (value: string | string[]) => void;
  onExplanationChange?: (value: string) => void;
  onShowExplanationChange?: (show: boolean) => void;
}
