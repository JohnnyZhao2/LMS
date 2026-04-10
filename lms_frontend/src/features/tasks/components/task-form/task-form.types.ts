import type { TaskResourceOption } from '@/types/task';

export type ResourceType = 'DOCUMENT' | 'QUIZ';

export interface ResourceItem {
  id: number;
  resource_uuid: string;
  is_current: boolean;
  title: string;
  resourceType: ResourceType;
  category?: string;
  quizType?: 'EXAM' | 'PRACTICE';
}

export interface SelectedResource extends ResourceItem {
  uid: number;
}

export const mapTaskResourceOptionToResource = (item: TaskResourceOption): ResourceItem => ({
  id: item.id,
  resource_uuid: item.resource_uuid,
  is_current: item.is_current,
  title: item.title,
  category: item.resource_type === 'DOCUMENT'
    ? item.space_tag_name || '未分类'
    : `${item.question_count || 0} 个题目`,
  resourceType: item.resource_type,
  quizType: item.quiz_type,
});
