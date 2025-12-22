import { Typography, Progress, Tag } from 'antd';
import {
  ClockCircleOutlined,
  UserOutlined,
  BookOutlined,
  FileTextOutlined,
  FireOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
  DeploymentUnitOutlined,
  FieldTimeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Card, StatusBadge } from '@/components/ui';
import type { StudentTaskCenterItem, TaskListItem } from '@/types/api';
import dayjs from '@/lib/dayjs';

const { Text } = Typography;

type TaskCardProps =
  | {
      variant: 'student';
      task: StudentTaskCenterItem;
    }
  | {
    variant: 'manager';
    task: TaskListItem;
  };

/**
 * 任务类型配置
 */
const taskTypeConfig = {
  LEARNING: {
    icon: <BookOutlined />,
    color: 'var(--color-success-500)',
    bg: 'var(--color-success-50)',
    gradient: 'linear-gradient(135deg, var(--color-success-500) 0%, var(--color-cyan-500) 100%)',
  },
  PRACTICE: {
    icon: <FileTextOutlined />,
    color: 'var(--color-primary-500)',
    bg: 'var(--color-primary-50)',
    gradient: 'linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-purple-500) 100%)',
  },
  EXAM: {
    icon: <FireOutlined />,
    color: 'var(--color-error-500)',
    bg: 'var(--color-error-50)',
    gradient: 'linear-gradient(135deg, var(--color-error-500) 0%, var(--color-pink-500) 100%)',
  },
};

/**
 * 状态配置
 */
const statusConfig = {
  IN_PROGRESS: {
    status: 'processing' as const,
    icon: <ClockCircleOutlined />,
  },
  PENDING_EXAM: {
    status: 'warning' as const,
    icon: <FieldTimeOutlined />,
  },
  COMPLETED: {
    status: 'success' as const,
    icon: <CheckCircleOutlined />,
  },
  OVERDUE: {
    status: 'error' as const,
    icon: <ExclamationCircleOutlined />,
  },
  ACTIVE: {
    status: 'processing' as const,
    icon: <ClockCircleOutlined />,
  },
  CLOSED: {
    status: 'default' as const,
    icon: <CheckCircleOutlined />,
  },
};

/**
 * 任务卡片组件
 */
export const TaskCard: React.FC<TaskCardProps> = ({ task, variant }) => {
  const navigate = useNavigate();
  const isStudentView = variant === 'student';
  const studentTask = isStudentView ? (task as StudentTaskCenterItem) : null;
  const managerTask = !isStudentView ? (task as TaskListItem) : null;
  const taskType = task.task_type;
  const typeConfig = taskTypeConfig[taskType as keyof typeof taskTypeConfig] || taskTypeConfig.LEARNING;
  const managerClosed = managerTask?.is_closed ?? false;
  const targetTaskId = isStudentView ? studentTask!.task_id : managerTask!.id;
  const statusKey = isStudentView
    ? studentTask!.status
    : managerClosed
      ? 'CLOSED'
      : 'ACTIVE';
  const stConfig = statusConfig[statusKey as keyof typeof statusConfig] || statusConfig.IN_PROGRESS;

  const title = isStudentView ? studentTask!.task_title : managerTask!.title;
  const description = isStudentView ? studentTask!.task_description : managerTask!.description;
  const statusLabel = isStudentView
    ? studentTask!.status_display
    : managerClosed
      ? '已结束'
      : '进行中';
  const progress = studentTask?.progress;
  const isTaskClosed = isStudentView ? studentTask!.status === 'COMPLETED' : managerClosed;
  const isUrgent = !isTaskClosed && dayjs(task.deadline).diff(dayjs(), 'day') <= 1;

  return (
    <Card
      hoverable
      onClick={() => navigate(`/tasks/${targetTaskId}`)}
      style={{ height: '100%', cursor: 'pointer' }}
    >
      {/* 顶部类型标识 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-4)' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-lg)',
            background: typeConfig.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 20,
            boxShadow: `0 4px 12px ${typeConfig.color}40`,
          }}
        >
          {typeConfig.icon}
        </div>
        <StatusBadge status={stConfig.status} text={statusLabel} size="small" />
      </div>

      {/* 标题和描述 */}
      <Text
        strong
        ellipsis={{ tooltip: title }}
        style={{
          display: 'block',
          fontSize: 'var(--font-size-lg)',
          marginBottom: 'var(--spacing-2)',
          color: 'var(--color-gray-900)',
        }}
      >
        {title}
      </Text>
      
        {description && (
        <Text
          type="secondary"
          ellipsis={{ rows: 2 }}
          style={{
            display: 'block',
            marginBottom: 'var(--spacing-4)',
            fontSize: 'var(--font-size-sm)',
            lineHeight: 1.5,
          }}
        >
          {description}
        </Text>
      )}

      {/* 进度条 */}
      {isStudentView ? (
        <div style={{ marginBottom: 'var(--spacing-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-1)' }}>
            <Text type="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
              完成进度
            </Text>
            <Text strong style={{ fontSize: 'var(--font-size-sm)', color: typeConfig.color }}>
              {progress?.percentage ?? 0}%
            </Text>
          </div>
          <Progress
            percent={progress?.percentage ?? 0}
            showInfo={false}
            strokeColor={typeConfig.gradient}
            trailColor="var(--color-gray-100)"
            size="small"
          />
          <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
            {progress?.completed ?? 0}/{progress?.total ?? 0} 项已完成
          </Text>
        </div>
      ) : (
        <div
          style={{
            marginBottom: 'var(--spacing-4)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 'var(--spacing-3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
            <TeamOutlined style={{ color: typeConfig.color }} />
            <div>
              <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
                指派学员
              </Text>
              <div style={{ fontWeight: 600 }}>{managerTask?.assignee_count ?? 0}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
            <BookOutlined style={{ color: typeConfig.color }} />
            <div>
              <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
                知识文档
              </Text>
              <div style={{ fontWeight: 600 }}>{managerTask?.knowledge_count ?? 0}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
            <FileTextOutlined style={{ color: typeConfig.color }} />
            <div>
              <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
                试卷
              </Text>
              <div style={{ fontWeight: 600 }}>{managerTask?.quiz_count ?? 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* 底部信息 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 'var(--spacing-3)',
          borderTop: '1px solid var(--color-gray-100)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
          <UserOutlined style={{ fontSize: 12, color: 'var(--color-gray-400)' }} />
          <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
            {task.created_by_name}
          </Text>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-1)',
            color: isUrgent ? 'var(--color-error-500)' : 'var(--color-gray-400)',
          }}
        >
          <ClockCircleOutlined style={{ fontSize: 12 }} />
          <Text
            style={{
              fontSize: 'var(--font-size-xs)',
              color: isUrgent ? 'var(--color-error-500)' : 'var(--color-gray-500)',
              fontWeight: isUrgent ? 600 : 400,
            }}
          >
            {dayjs(task.deadline).format('MM-DD HH:mm')}
          </Text>
        </div>
      </div>

      {!isStudentView && managerClosed && managerTask?.closed_at && (
        <div style={{ marginTop: 'var(--spacing-3)' }}>
          <Tag color="default" icon={<DeploymentUnitOutlined />}>
            已于 {dayjs(managerTask.closed_at).format('MM-DD HH:mm')} 结束
          </Tag>
        </div>
      )}
    </Card>
  );
};
