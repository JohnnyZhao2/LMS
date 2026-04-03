import type { QuestionType } from '@/types/api';

export interface QuizQuestionItem {
  id: number;
  resource_uuid: string;
  is_current: boolean;
  content: string;
  question_type: QuestionType;
  question_type_display: string;
  score: string;
  order: number;
}

/** 内联编辑用的扩展类型，包含完整表单数据 */
export interface InlineQuestionItem {
  /** 临时 key，用于 React 列表渲染 */
  key: string;
  /** 已有题目的 id，新建题目为 null */
  questionId: number | null;
  resourceUuid: string | null;
  isCurrent: boolean;
  /** 表单数据 */
  questionType: QuestionType;
  spaceTagId?: number | null;
  content: string;
  options: Array<{ key: string; value: string }>;
  answer: string | string[];
  explanation: string;
  showExplanation: boolean;
  score: string;
  /** 用于 PATCH 脏字段比较的初始快照（仅已有题目） */
  original?: {
    spaceTagId?: number | null;
    content: string;
    options: Array<{ key: string; value: string }>;
    answer: string | string[];
    explanation: string;
    score: string;
  };
  /** 是否已保存到后端 */
  saved: boolean;
}
