/**
 * Task API exports
 * @module features/tasks/api
 */

// Keys and Types
export { taskKeys } from './keys';
export type { TaskAssignmentDetail, TaskListResponse } from './types';

// Student task assignment APIs
export { getTaskAssignments, useTaskAssignments } from './get-task-assignments';
export { getTaskAssignmentDetail, useTaskAssignmentDetail } from './get-task-assignment-detail';

// Learning task APIs
export { completeKnowledgeLearning, useCompleteKnowledgeLearning } from './complete-knowledge-learning';

// Practice task APIs
export { startPracticeQuiz, useStartPracticeQuiz } from './start-practice-quiz';
export { submitPracticeAnswers, useSubmitPracticeAnswers } from './submit-practice-answers';
export { getPracticeResult, getPracticeHistory, useGetPracticeResult } from './get-practice-result';

// Exam task APIs
export { startExam, useStartExam } from './start-exam';
export { saveAnswer, useSaveAnswer } from './save-answer';
export { submitExamAnswers, useSubmitExamAnswers } from './submit-exam-answers';
export { getExamResult, useGetExamResult } from './get-exam-result';

// Task management APIs (re-export from management folder)
export * from './management';
