/**
 * Knowledge API exports
 * @module features/knowledge/api
 */

// Keys
export { knowledgeKeys } from './keys';

// Types
export type { KnowledgeCreateRequest, KnowledgeUpdateRequest } from './types';

// Student knowledge center APIs
export { fetchKnowledgeList, useKnowledgeList } from './get-knowledge-list';
export { fetchKnowledgeDetail, useKnowledgeDetail } from './get-knowledge-detail';
export { 
  fetchKnowledgeCategories, 
  fetchCategoryChildren, 
  useKnowledgeCategories, 
  useCategoryChildren 
} from './get-knowledge-categories';

// Admin knowledge management APIs
export { fetchAdminKnowledgeList, useAdminKnowledgeList } from './get-admin-knowledge-list';
export { fetchAdminKnowledgeDetail, useAdminKnowledgeDetail } from './get-admin-knowledge-detail';
export { createKnowledge, useCreateKnowledge } from './create-knowledge';
export { updateKnowledge, useUpdateKnowledge } from './update-knowledge';
export { deleteKnowledge, useDeleteKnowledge } from './delete-knowledge';
