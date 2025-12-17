/**
 * Knowledge API Types
 * Type definitions for knowledge management API
 * @module features/knowledge/api/types
 */

import type { KnowledgeType, EmergencyContent } from '@/types/domain';

/**
 * Request type for creating knowledge
 * Requirements: 17.2, 17.3, 17.4, 17.5
 */
export interface KnowledgeCreateRequest {
  title: string;
  summary: string;
  knowledge_type: KnowledgeType;
  primary_category_id: number;
  secondary_category_id?: number;
  operation_tags?: string[];
  content?: string;                     // For OTHER type
  emergency_content?: EmergencyContent; // For EMERGENCY type
}

/**
 * Request type for updating knowledge
 * Requirements: 17.6
 */
export interface KnowledgeUpdateRequest {
  title?: string;
  summary?: string;
  knowledge_type?: KnowledgeType;
  primary_category_id?: number;
  secondary_category_id?: number | null;
  operation_tags?: string[];
  content?: string;
  emergency_content?: EmergencyContent;
}
