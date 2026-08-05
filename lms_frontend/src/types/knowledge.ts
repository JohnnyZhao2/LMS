/**
 * 知识相关类型定义
 */

import type { SimpleTag } from './common';

export interface RelatedLink {
  title?: string;
  url: string;
}

export interface LatestKnowledge {
  id: number;
  title: string;
  space_tag?: SimpleTag | null;
  content_preview: string;
  view_count: number;
  updated_at: string;
}

export interface KnowledgeListItem {
  id: number;
  title: string;
  space_tag?: SimpleTag | null;
  content_preview: string;
  external_doc_url: string;
  created_by_name?: string;
  updated_by_name?: string;
  view_count: number;
  related_links?: RelatedLink[];
  created_at: string;
  updated_at: string;
}

export interface KnowledgeDetail {
  id: number;
  title: string;
  space_tag?: SimpleTag | null;
  content: string;
  external_doc_url: string;
  tags: SimpleTag[];
  created_by_name?: string;
  updated_by_name?: string;
  view_count: number;
  related_links?: RelatedLink[];
  created_at: string;
  updated_at: string;
}

/** 创建 / 更新共用写入体 */
export interface KnowledgeWriteRequest {
  title?: string;
  space_tag_id?: number | null;
  content?: string;
  external_doc_url?: string;
  related_links?: RelatedLink[];
  tag_ids?: number[];
}
