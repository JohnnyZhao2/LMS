/**
 * 知识中心路由：app 层注入 tags 能力契约。
 */
import { knowledgeTagDeps } from '@/app/tag-deps';
import { KnowledgeCenter } from '@/features/knowledge/components/knowledge-center';

export const KnowledgeCenterRoutePage = () => (
  <KnowledgeCenter tagDeps={knowledgeTagDeps} />
);
