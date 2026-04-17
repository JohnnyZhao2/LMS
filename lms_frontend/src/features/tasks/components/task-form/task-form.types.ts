import type { TaskResourceOption } from '@/types/task';

export type ResourceType = 'DOCUMENT' | 'QUIZ';
export type ResourceGroup = 'DOCUMENT' | 'PRACTICE' | 'EXAM';

export interface ResourceItem {
  id: number;
  title: string;
  resourceType: ResourceType;
  category?: string;
  quizType?: 'EXAM' | 'PRACTICE';
  isMissingSource?: boolean;
}

export interface SelectedResource extends ResourceItem {
  uid: number;
}

export const mapTaskResourceOptionToResource = (item: TaskResourceOption): ResourceItem => ({
  id: item.id,
  title: item.title,
  category: item.resource_type === 'DOCUMENT'
    ? item.space_tag_name || '未分类'
    : `${item.question_count || 0} 个题目`,
  resourceType: item.resource_type,
  quizType: item.quiz_type,
});
