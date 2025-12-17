/**
 * Quiz Utility Functions
 * Helper functions for quiz management
 * @module features/test-center/api/quizzes/utils
 */

import type { Quiz } from '@/types/domain';
import type { QuizQuestionInput } from './types';

/**
 * Check if user can edit/delete a quiz
 * Requirements: 13.5, 13.6 - Ownership-based edit control
 * @param quiz - Quiz to check
 * @param currentUserId - Current user ID
 * @param isAdmin - Whether current user is admin
 * @returns Whether user can edit the quiz
 */
export function canEditQuiz(
  quiz: Quiz,
  currentUserId: number | undefined,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  if (!currentUserId) return false;
  return quiz.created_by.id === currentUserId;
}

/**
 * Calculate total score from quiz questions
 * @param questions - Quiz questions with scores
 * @returns Total score
 */
export function calculateTotalScore(questions: QuizQuestionInput[]): number {
  return questions.reduce((sum, q) => sum + q.score, 0);
}
