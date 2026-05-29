import { ScrollContainer } from '@/components/ui/scroll-container';
import type { KnowledgeOutlineItem } from './knowledge-detail-outline-utils';

interface KnowledgeDetailOutlineProps {
  items: KnowledgeOutlineItem[];
  activeId?: string;
  onSelect: (item: KnowledgeOutlineItem) => void;
  className?: string;
}

export const KnowledgeDetailOutline: React.FC<KnowledgeDetailOutlineProps> = ({
  items,
  activeId,
  onSelect,
  className,
}) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <aside className={['kd-outline', className].filter(Boolean).join(' ')} aria-label="知识目录">
      <div className="kd-outline-header">
        <p className="kd-label">目录</p>
      </div>
      <ScrollContainer as="nav" className="kd-outline-list">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`kd-outline-item kd-outline-level-${item.level}${activeId === item.id ? ' kd-outline-item-active' : ''}`}
            onClick={() => onSelect(item)}
            title={item.title}
          >
            <span className="kd-outline-title">{item.title}</span>
          </button>
        ))}
      </ScrollContainer>
    </aside>
  );
};
