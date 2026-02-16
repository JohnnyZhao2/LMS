import type { KnowledgeListItem, QuizListItem } from '@/types/api';

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

export interface AssignableUser {
  id: number;
  username: string;
  employee_id?: string;
  department?: { name: string };
}

export const mapKnowledgeToResource = (item: KnowledgeListItem): ResourceItem => ({
  id: item.id,
  resource_uuid: item.resource_uuid,
  is_current: item.is_current,
  title: item.title,
  category: item.line_tag?.name || '未分类',
  resourceType: 'DOCUMENT',
});

export const mapQuizToResource = (quiz: QuizListItem): ResourceItem => ({
  id: quiz.id,
  resource_uuid: quiz.resource_uuid,
  is_current: quiz.is_current,
  title: quiz.title,
  category: `${quiz.question_count} 个题目`,
  resourceType: 'QUIZ',
  quizType: quiz.quiz_type,
});
