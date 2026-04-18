import type React from 'react';
import { KnowledgeDetailModal as FeatureKnowledgeDetailModal } from '@/features/knowledge/components/modals/knowledge-detail-modal';

type KnowledgeDetailModalProps = React.ComponentProps<typeof FeatureKnowledgeDetailModal>;

export const KnowledgeDetailModal: React.FC<KnowledgeDetailModalProps> = (props) => (
  <FeatureKnowledgeDetailModal {...props} />
);
