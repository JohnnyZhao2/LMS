/**
 * 知识相关类型定义
 */

import type { KnowledgeType, SimpleTag } from './common';

/**
 * 知识分类
 */
export interface KnowledgeCategory {
  id: number;
  name: string;
  code: string;
  description?: string;
  level: 'PRIMARY' | 'SECONDARY';
  knowledge_count: string;
}

/**
 * 学员知识列表项
 */
export interface StudentKnowledgeList {
  id: number;
  title: string;
  summary?: string;
  knowledge_type: KnowledgeType;
  knowledge_type_display: string;
  operation_tags?: Record<string, unknown>;
  primary_category_name?: string;
  secondary_category_name?: string;
  updated_by_name?: string;
  created_by_name?: string;
  updated_at: string;
  view_count: number;
}

/**
 * 学员知识详情
 */
export interface StudentKnowledgeDetail {
  id: number;
  title: string;
  knowledge_type: KnowledgeType;
  knowledge_type_display: string;
  summary?: string;
  content?: string;
  operation_tags?: Record<string, unknown>;
  fault_scenario?: string;
  trigger_process?: string;
  solution?: string;
  verification_plan?: string;
  recovery_plan?: string;
  structured_content?: string;
  table_of_contents?: string;
  primary_category_name?: string;
  secondary_category_name?: string;
  created_by_name?: string;
  updated_by_name?: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * 最新知识
 */
export interface LatestKnowledge {
  id: number;
  title: string;
  summary?: string;
  updated_at: string;
}

/**
 * 目录项
 */
export interface TableOfContentsItem {
  level: number;
  text: string;
}

/**
 * 知识文档列表项（管理员视图）
 */
export interface KnowledgeListItem {
  id: number;
  resource_uuid: string;
  version_number: number;
  title: string;
  knowledge_type: KnowledgeType;
  knowledge_type_display: string;
  is_current: boolean;
  line_type?: SimpleTag | null;
  /** 知识概要 */
  summary?: string;
  content_preview?: string;
  /** 目录结构 */
  table_of_contents?: TableOfContentsItem[];
  system_tags: SimpleTag[];
  operation_tags: SimpleTag[];
  created_by?: number;
  created_by_name?: string;
  updated_by?: number;
  updated_by_name?: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * 知识文档详情（管理员视图）
 */
export interface KnowledgeDetail {
  id: number;
  resource_uuid: string;
  version_number: number;
  title: string;
  knowledge_type: KnowledgeType;
  knowledge_type_display: string;
  is_current: boolean;
  line_type?: SimpleTag | null;
  // 应急类知识结构化字段
  fault_scenario?: string;
  trigger_process?: string;
  solution?: string;
  verification_plan?: string;
  recovery_plan?: string;
  // 其他类型知识正文
  content?: string;
  // 知识概要
  summary?: string;
  // 目录结构
  table_of_contents?: TableOfContentsItem[];
  // 标签
  system_tags: SimpleTag[];
  operation_tags: SimpleTag[];
  // 元数据
  created_by?: number;
  created_by_name?: string;
  updated_by?: number;
  updated_by_name?: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * 创建知识文档请求
 */
export interface KnowledgeCreateRequest {
  title: string;
  knowledge_type: KnowledgeType;
  // 条线类型（使用 ID 或名称）
  line_type_id?: number;
  line_type_name?: string;
  // 应急类知识结构化字段
  fault_scenario?: string;
  trigger_process?: string;
  solution?: string;
  verification_plan?: string;
  recovery_plan?: string;
  // 其他类型知识正文
  content?: string;
  // 知识概要
  summary?: string;
  // 标签（使用ID）
  system_tag_ids?: number[];
  operation_tag_ids?: number[];
}

/**
 * 更新知识文档请求
 */
export interface KnowledgeUpdateRequest {
  title?: string;
  knowledge_type?: KnowledgeType;
  line_type_id?: number;
  fault_scenario?: string;
  trigger_process?: string;
  solution?: string;
  verification_plan?: string;
  recovery_plan?: string;
  content?: string;
  // 知识概要
  summary?: string;
  system_tag_ids?: number[];
  operation_tag_ids?: number[];
}
