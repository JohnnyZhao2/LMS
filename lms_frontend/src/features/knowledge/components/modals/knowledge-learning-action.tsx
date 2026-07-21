import { CheckCircle } from 'lucide-react';

import { KnowledgeActionButton } from '@/features/knowledge/components/shared/knowledge-action-button';

interface KnowledgeLearningActionProps {
  visible: boolean;
  completed: boolean;
  pending: boolean;
  onComplete: () => void;
  docked?: boolean;
}

export const KnowledgeLearningAction: React.FC<KnowledgeLearningActionProps> = ({
  visible,
  completed,
  pending,
  onComplete,
  docked = false,
}) => {
  if (!visible) return null;

  if (completed) {
    return (
      <div className={`kd-complete-done${docked ? ' kd-complete-done-docked' : ''}`}>
        <CheckCircle style={{ width: 14, height: 14 }} />
        已学习
      </div>
    );
  }

  return (
    <KnowledgeActionButton
      onClick={onComplete}
      disabled={pending}
      className={docked ? 'kd-complete-btn-docked' : undefined}
    >
      {pending ? '处理中…' : '标记已学习'}
    </KnowledgeActionButton>
  );
};
