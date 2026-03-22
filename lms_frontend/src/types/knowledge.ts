/**
 * 知识相关类型定义
 */

import type { SimpleTag } from './common';

/**
 * 学员知识列表项
 */
export interface StudentKnowledgeList {
  id: number;
  title: string;
  content_preview?: string;
  line_tag_name?: string;
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
  content?: string;
  content_preview?: string;
  table_of_contents?: TableOfContentsItem[];
  line_tag?: SimpleTag | null;
  tags?: SimpleTag[];
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
  content_preview?: string;
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
  is_current: boolean;
  line_tag?: SimpleTag | null;
  content: string;
  content_preview?: string;
  table_of_contents?: TableOfContentsItem[];
  created_by?: number;
  created_by_name?: string;
  updated_by?: number;
  updated_by_name?: string;
  view_count: number;
  source_url?: string;
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
  is_current: boolean;
  line_tag?: SimpleTag | null;
  content: string;
  table_of_contents?: TableOfContentsItem[];
  tags: SimpleTag[];
  created_by?: number;
  created_by_name?: string;
  updated_by?: number;
  updated_by_name?: string;
  view_count: number;
  source_url?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 创建知识文档请求
 */
export interface KnowledgeCreateRequest {
  title: string;
  line_tag_id?: number;
  line_tag_name?: string;
  content: string;
  source_url?: string;
  tag_ids?: number[];
}

/**
 * 更新知识文档请求
 */
export interface KnowledgeUpdateRequest {
  title?: string;
  line_tag_id?: number;
  content?: string;
  source_url?: string;
  tag_ids?: number[];
}

/**
 * 文档解析响应
 */
export interface ParseDocumentResponse {
  suggested_title: string;
  content: string;
  file_type: string;
}
