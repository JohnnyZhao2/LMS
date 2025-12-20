import { Card, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import type { StudentKnowledgeList } from '@/types/api';
import dayjs from '@/lib/dayjs';

const { Title, Text } = Typography;

interface KnowledgeCardProps {
  knowledge: StudentKnowledgeList;
}

/**
 * 知识卡片组件
 */
export const KnowledgeCard: React.FC<KnowledgeCardProps> = ({ knowledge }) => {
  const navigate = useNavigate();

  return (
    <Card
      hoverable
      onClick={() => navigate(`/knowledge/${knowledge.id}`)}
      style={{ height: '100%' }}
    >
      <div style={{ marginBottom: 8 }}>
        {knowledge.operation_tags &&
          Object.entries(knowledge.operation_tags).map(([key, value]) => (
            <Tag key={key} color="blue">
              {String(value)}
            </Tag>
          ))}
      </div>
      <Title level={5} ellipsis={{ rows: 2 }}>
        {knowledge.title}
      </Title>
      <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
        {knowledge.summary}
      </Text>
      <div style={{ marginTop: 16, fontSize: 12, color: '#999' }}>
        <Text type="secondary">
          {knowledge.updated_by_name || knowledge.created_by_name || '-'} · {dayjs(knowledge.updated_at).format('YYYY-MM-DD')}
        </Text>
      </div>
    </Card>
  );
};

