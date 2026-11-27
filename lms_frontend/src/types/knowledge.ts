/**
 * 知识相关类型定义
 */

import type { SimpleTag } from './common';

export interface RelatedLink {
  title?: string;
  url: string;
}

export interface KnowledgeExtraField {
  label: string;
  value: string;
}

export interface LatestKnowledge {
  id: number;
  title: string;
  space_tag?: SimpleTag | null;
  content_preview: string;
  view_count: number;
  updated_at: string;
}

export interface KnowledgeDocSibling {
  id: number;
  title: string;
  section?: string;
}

export interface KnowledgeListItem {
  id: number;
  title: string;
  section?: string;
  summary?: string;
  space_tag?: SimpleTag | null;
  tags?: SimpleTag[];
  content_preview: string;
  external_doc_url: string;
  doc_key?: string;
  created_by_name?: string;
  updated_by_name?: string;
  view_count: number;
  is_pinned?: boolean;
  related_links?: RelatedLink[];
  /** 按同文档聚合展示时的组内全部知识点（含主条，长度 >= 2） */
  grouped_items?: KnowledgeListItem[];
  created_at: string;
  updated_at: string;
}

export interface KnowledgeDetail {
  id: number;
  title: string;
  section?: string;
  summary?: string;
  space_tag?: SimpleTag | null;
  content: string;
  extra_fields?: KnowledgeExtraField[];
  external_doc_url: string;
  doc_key?: string;
  doc_siblings?: KnowledgeDocSibling[];
  tags: SimpleTag[];
  created_by_name?: string;
  updated_by_name?: string;
  view_count: number;
  is_pinned?: boolean;
  related_links?: RelatedLink[];
  created_at: string;
  updated_at: string;
}

/** 创建 / 更新共用写入体 */
export interface KnowledgeWriteRequest {
  title?: string;
  section?: string;
  summary?: string;
  space_tag_id?: number | null;
  content?: string;
  extra_fields?: KnowledgeExtraField[];
  external_doc_url?: string;
  related_links?: RelatedLink[];
  tag_ids?: number[];
  is_pinned?: boolean;
}
