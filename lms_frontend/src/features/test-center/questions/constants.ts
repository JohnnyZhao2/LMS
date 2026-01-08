/**
 * 题目相关常量配置
 */
import type { QuestionType } from '@/types/api';

/**
 * 题目类型筛选选项
 */
export const QUESTION_TYPE_FILTER_OPTIONS = [
  { label: '全部', value: 'ALL' },
  { label: '单选题', value: 'SINGLE_CHOICE' },
  { label: '多选题', value: 'MULTIPLE_CHOICE' },
  { label: '判断题', value: 'TRUE_FALSE' },
  { label: '简答题', value: 'SHORT_ANSWER' },
];

/**
 * 题目类型配置（用于显示标签）
 */
export const QUESTION_TYPE_CONFIG: Record<QuestionType, { label: string; color: string; bg: string }> = {
  SINGLE_CHOICE: { label: '单选', color: 'text-blue-600', bg: 'bg-blue-50' },
  MULTIPLE_CHOICE: { label: '多选', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  TRUE_FALSE: { label: '判断', color: 'text-amber-600', bg: 'bg-amber-50' },
  SHORT_ANSWER: { label: '简答', color: 'text-blue-600', bg: 'bg-blue-50' },
};

/**
 * 题目类型显示名称映射
 */
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_CHOICE: '单选题',
  MULTIPLE_CHOICE: '多选题',
  TRUE_FALSE: '判断题',
  SHORT_ANSWER: '简答题',
};

/**
 * 获取题目类型显示名称
 */
export const getQuestionTypeLabel = (type: QuestionType): string => {
  return QUESTION_TYPE_LABELS[type] || type;
};

/**
 * 获取题目类型标签样式
 */
export const getQuestionTypeStyle = (type: QuestionType) => {
  return QUESTION_TYPE_CONFIG[type] || { label: '未知', color: 'text-gray-600', bg: 'bg-gray-100' };
};
