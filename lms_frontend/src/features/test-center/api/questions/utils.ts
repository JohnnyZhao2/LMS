/**
 * Question Utility Functions
 * Helper functions for question management
 * @module features/test-center/api/questions/utils
 */

import type { Question, QuestionType } from '@/types/domain';

/**
 * Check if user can edit/delete a question
 * Requirements: 12.5, 12.6 - Ownership-based edit control
 * @param question - Question to check
 * @param currentUserId - Current user ID
 * @param isAdmin - Whether current user is admin
 * @returns Whether user can edit the question
 */
export function canEditQuestion(
  question: Question,
  currentUserId: number | undefined,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  if (!currentUserId) return false;
  return question.created_by.id === currentUserId;
}

/**
 * Get question type display label
 * @param type - Question type
 * @returns Display label
 */
export function getQuestionTypeLabel(type: QuestionType): string {
  const labels: Record<QuestionType, string> = {
    SINGLE_CHOICE: '单选题',
    MULTIPLE_CHOICE: '多选题',
    TRUE_FALSE: '判断题',
    SHORT_ANSWER: '简答题',
  };
  return labels[type];
}

/**
 * Get question type badge variant
 * @param type - Question type
 * @returns Badge variant
 */
export function getQuestionTypeBadgeVariant(type: QuestionType): 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' {
  const variants: Record<QuestionType, 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive'> = {
    SINGLE_CHOICE: 'default',
    MULTIPLE_CHOICE: 'secondary',
    TRUE_FALSE: 'outline',
    SHORT_ANSWER: 'warning',
  };
  return variants[type];
}
