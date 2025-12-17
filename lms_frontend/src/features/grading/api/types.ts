/**
 * Grading API Types
 * Type definitions for grading center API
 * @module features/grading/api/types
 */

import type { 
  Submission, 
  Answer, 
  UserBasic, 
  Task, 
  Quiz 
} from '@/types/domain';
import type { ListParams } from '@/types/api';

/**
 * Pending grading submission item
 */
export interface PendingGradingItem {
  id: number;
  task: Pick<Task, 'id' | 'title' | 'type'>;
  quiz: Pick<Quiz, 'id' | 'title' | 'total_score'>;
  user: UserBasic;
  submitted_at: string;
  total_score: number;
  auto_score: number;
  pending_questions_count: number;
}

/**
 * Grading detail data - full submission with answers for grading
 */
export interface GradingDetailData extends Submission {
  auto_graded_score: number;
  manual_grading_required: Answer[];
}

/**
 * Grade answer request
 */
export interface GradeAnswerRequest {
  answer_id: number;
  score: number;
  comment?: string;
}

/**
 * Submit grading request
 */
export interface SubmitGradingRequest {
  grades: GradeAnswerRequest[];
}

/**
 * Submit grading response
 */
export interface SubmitGradingResponse {
  success: boolean;
  submission_id: number;
  final_score: number;
  message?: string;
}

/**
 * Grading filter params
 */
export interface GradingFilterParams extends ListParams {
  task_id?: number;
  student_id?: number;
}
