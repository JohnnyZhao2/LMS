import { Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import type { StudentKnowledgeList } from '@/types/api';
import dayjs from '@/lib/dayjs';
import styles from './admin-knowledge-list.module.css';
import { EyeOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface KnowledgeCardProps {
  knowledge: StudentKnowledgeList;
}

/**
 * 知识卡片组件
 */
export const KnowledgeCard: React.FC<KnowledgeCardProps> = ({ knowledge }) => {
  const navigate = useNavigate();
  const isEmergency = knowledge.knowledge_type === 'EMERGENCY';

  return (
    <div
      className={styles.card}
      onClick={() => navigate(`/knowledge/${knowledge.id}`)}
    >
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderLeft}>
          <span className={`${styles.typeTag} ${isEmergency ? styles.emergencyTag : styles.normalTag}`}>
            {knowledge.knowledge_type_display}
          </span>
          {knowledge.primary_category_name && (
            <span className={styles.unpublishedTag}>
              {knowledge.primary_category_name}
            </span>
          )}
        </div>
        <div className={styles.footerRight} style={{ color: 'var(--color-gray-300)' }}>
          <EyeOutlined />
          <span>{knowledge.view_count || 0}</span>
        </div>
      </div>

      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>{knowledge.title}</h3>
        <div className={styles.cardPreview} title={knowledge.summary || ''}>
          {knowledge.summary || '暂无简介'}
        </div>
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.footerLeft}>
          <div className={styles.footerItem}>
            <div className={styles.userAvatar}>
              {(knowledge.updated_by_name || knowledge.created_by_name || '?').charAt(0)}
            </div>
            <span>{knowledge.updated_by_name || knowledge.created_by_name || '-'}</span>
          </div>
        </div>
        <div className={styles.footerItem}>
          <ClockCircleOutlined />
          <span>{knowledge.updated_at ? dayjs(knowledge.updated_at).format('YYYY-MM-DD') : '-'}</span>
        </div>
      </div>
    </div>
  );
};

