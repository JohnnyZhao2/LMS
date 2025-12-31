import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { SubmissionDetail } from '@/types/api';

interface StartQuizPayload {
    assignmentId: number;
    quizId: number;
}

/**
 * 开始答题（统一接口，根据试卷类型自动判断行为）
 */
export const useStartQuiz = () => {
    return useMutation({
        mutationFn: ({ assignmentId, quizId }: StartQuizPayload) =>
            apiClient.post<SubmissionDetail>('/submissions/start/', {
                assignment_id: assignmentId,
                quiz_id: quizId,
            }),
    });
};

/**
 * 提交答卷（统一接口，根据试卷类型自动判断行为）
 */
export const useSubmitQuiz = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (submissionId: number) =>
            apiClient.post<SubmissionDetail>(`/submissions/${submissionId}/submit/`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['student-tasks'] });
        },
    });
};
