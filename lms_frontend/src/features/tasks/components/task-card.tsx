import { Card, Tag, Typography, Progress } from 'antd';
import { useNavigate } from 'react-router-dom';
import type { StudentTaskCenterList } from '@/types/api';
import dayjs from '@/lib/dayjs';

const { Title, Text } = Typography;

interface TaskCardProps {
  task: StudentTaskCenterList;
}

/**
 * 任务卡片组件
 */
export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const navigate = useNavigate();

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'LEARNING':
        return 'green';
      case 'PRACTICE':
        return 'blue';
      case 'EXAM':
        return 'red';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'processing';
      case 'COMPLETED':
        return 'success';
      case 'OVERDUE':
        return 'error';
      default:
        return 'default';
    }
  };

  const completionPercent = task.total_count > 0 ? Math.round((task.completed_count / task.total_count) * 100) : 0;

  return (
    <Card
      hoverable
      onClick={() => navigate(`/tasks/${task.id}`)}
      style={{ height: '100%' }}
    >
      <div style={{ marginBottom: 8 }}>
        <Tag color={getTypeColor(task.task_type)}>{task.task_type_display}</Tag>
        <Tag color={getStatusColor(task.status)}>{task.status_display}</Tag>
      </div>
      <Title level={5} ellipsis={{ rows: 2 }}>
        {task.title}
      </Title>
      <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
        {task.description}
      </Text>
      <div style={{ marginTop: 16 }}>
        <Progress percent={completionPercent} size="small" />
        <Text type="secondary" style={{ fontSize: 12 }}>
          {task.completed_count}/{task.total_count} 人已完成
        </Text>
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
        <Text type="secondary">
          {task.created_by_name} · 截止 {dayjs(task.deadline).format('MM-DD HH:mm')}
        </Text>
      </div>
    </Card>
  );
};

