/**
 * Start Exam API
 * Starts an exam attempt
 * @module features/tasks/api/start-exam
 * Requirements: 9.5 - 加载试卷并启动倒计时
 * Requirements: 12.1, 12.2, 12.7, 12.8
 */

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Submission } from '@/types/domain';

/**
 * Start an exam attempt
 * Requirements: 9.5 - 加载试卷并启动倒计时
 * Requirements: 12.1, 12.2, 12.7, 12.8
 * @param taskId - Task ID
 * @returns Submission with exam questions
 */
export async function startExam(
  taskId: number | string
): Promise<Submission> {
  return api.post<Submission>(
    API_ENDPOINTS.submissions.examStart,
    { task_id: taskId }
  );
}

/**
 * Hook to start exam
 */
export function useStartExam() {
  return useMutation({
    mutationFn: (taskId: number | string) => startExam(taskId),
  });
}
