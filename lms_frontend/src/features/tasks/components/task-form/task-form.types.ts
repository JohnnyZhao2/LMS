import { formatScore } from '@/lib/score';
import type { TaskResourceOption } from '@/types/task';

export type ResourceType = 'DOCUMENT' | 'QUIZ';
export type ResourceFilterType = 'ALL' | 'DOCUMENT' | 'QUIZ';
export type ResourceGroup = 'DOCUMENT' | 'PRACTICE' | 'EXAM';

export interface ResourceItem {
  id: number;
  title: string;
  resourceType: ResourceType;
  category?: string;
  quizType?: 'EXAM' | 'PRACTICE';
  taskQuizId?: number;
  totalScore?: number;
  duration?: string;
  passScore?: string;
  isMissingSource?: boolean;
}

export interface SelectedResource extends ResourceItem {
  uid: string;
}

export const mapTaskResourceOptionToResource = (item: TaskResourceOption): ResourceItem => {
  const totalScore = item.total_score != null ? Number(item.total_score) : undefined;
  return {
    id: item.id,
    title: item.title,
    category: item.resource_type === 'DOCUMENT'
      ? item.space_tag_name || '未分类'
      : totalScore != null
        ? `${item.question_count || 0} 题 · 总分 ${formatScore(totalScore)}`
        : `${item.question_count || 0} 个题目`,
    resourceType: item.resource_type,
    totalScore,
  };
};
