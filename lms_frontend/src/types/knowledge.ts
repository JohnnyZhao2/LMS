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
  content: string;
  content_preview?: string;
  view_count: number;
  updated_at: string;
}

export interface KnowledgeListItem {
  id: number;
  title: string;
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

export interface KnowledgeDetail {
  id: number;
  title: string;
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

export interface KnowledgeCreateRequest {
  title?: string;
  space_tag_id?: number;
  content: string;
  related_links?: RelatedLink[];
  tag_ids?: number[];
}

export interface KnowledgeUpdateRequest {
  title?: string;
  space_tag_id?: number;
  content?: string;
  related_links?: RelatedLink[];
  tag_ids?: number[];
}

export interface ParseDocumentResponse {
  suggested_title: string;
  content: string;
  file_type: string;
}
