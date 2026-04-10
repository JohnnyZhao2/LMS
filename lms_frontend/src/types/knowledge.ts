/**
 * 知识相关类型定义
 */

import type { SimpleTag } from './common';

export interface RelatedLink {
  title?: string;
  url: string;
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
 * 知识文档列表项（管理员视图）
 */
export interface KnowledgeListItem {
  id: number;
  resource_uuid: string;
  version_number: number;
  title: string;
  is_current: boolean;
  space_tag?: SimpleTag | null;
  content: string;
  content_preview?: string;
  created_by_name?: string;
  updated_by_name?: string;
  view_count: number;
  related_links?: RelatedLink[];
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
  space_tag?: SimpleTag | null;
  content: string;
  tags: SimpleTag[];
  created_by_name?: string;
  updated_by_name?: string;
  view_count: number;
  related_links?: RelatedLink[];
  created_at: string;
  updated_at: string;
}

/**
 * 创建知识文档请求
 */
export interface KnowledgeCreateRequest {
  title?: string;
  space_tag_id?: number;
  content: string;
  related_links?: RelatedLink[];
  tag_ids?: number[];
}

/**
 * 更新知识文档请求
 */
export interface KnowledgeUpdateRequest {
  title?: string;
  space_tag_id?: number;
  content?: string;
  related_links?: RelatedLink[];
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
