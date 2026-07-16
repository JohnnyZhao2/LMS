import { CheckCircle } from 'lucide-react';

import { KnowledgeActionButton } from '@/features/knowledge/components/shared/knowledge-action-button';

interface KnowledgeLearningActionProps {
  visible: boolean;
  completed: boolean;
  pending: boolean;
  onComplete: () => void;
  immersive?: boolean;
  docked?: boolean;
}

export const KnowledgeLearningAction: React.FC<KnowledgeLearningActionProps> = ({
  visible,
  completed,
  pending,
  onComplete,
  immersive = false,
  docked = false,
}) => {
  if (!visible) return null;

  if (completed) {
    return immersive ? (
      <div className="kab-chip kd-immersive-learning-state">
        <CheckCircle style={{ width: 14, height: 14 }} />
        已学习
      </div>
    ) : (
      <div className={`kd-complete-done${docked ? ' kd-complete-done-docked' : ''}`}>
        <CheckCircle style={{ width: 14, height: 14 }} />
        已学习
      </div>
    );
  }

  return (
    <KnowledgeActionButton
      variant={immersive ? undefined : 'solid'}
      onClick={onComplete}
      disabled={pending}
      className={immersive ? 'kd-immersive-save-btn' : docked ? 'kd-complete-btn-docked' : undefined}
    >
      {pending ? '处理中…' : '标记已学习'}
    </KnowledgeActionButton>
  );
};
