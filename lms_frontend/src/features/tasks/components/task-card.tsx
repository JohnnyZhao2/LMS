import { Typography, Progress, Tag, Dropdown, Button, Modal, message, Card } from 'antd';
import {
  ClockCircleOutlined,
  UserOutlined,
  BookOutlined,
  FileTextOutlined,

  CheckCircleOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
  DeploymentUnitOutlined,
  FieldTimeOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { StatusBadge } from '@/components/ui';
import type { StudentTaskCenterItem, TaskListItem } from '@/types/api';
import { useDeleteTask } from '../api/delete-task';
import { useCloseTask } from '../api/close-task';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { showApiError } from '@/utils/error-handler';
import dayjs from '@/lib/dayjs';

const { Text, Paragraph } = Typography;

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
  const { user, currentRole } = useAuth();
  const deleteTask = useDeleteTask();
  const closeTask = useCloseTask();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);

  const isStudentView = variant === 'student';
  const studentTask = isStudentView ? (task as StudentTaskCenterItem) : null;
  const managerTask = !isStudentView ? (task as TaskListItem) : null;

  // Determine style based on content
  const hasQuiz = managerTask ? (managerTask.quiz_count > 0) : (studentTask?.has_quiz ?? false);

  const typeConfig = hasQuiz ? {
    icon: <FileTextOutlined />,
    color: 'var(--color-primary-500)',
    bg: 'var(--color-primary-50)',
    gradient: 'linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-purple-500) 100%)',
  } : {
    icon: <BookOutlined />,
    color: 'var(--color-success-500)',
    bg: 'var(--color-success-50)',
    gradient: 'linear-gradient(135deg, var(--color-success-500) 0%, var(--color-cyan-500) 100%)',
  };
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

  // 检查是否有权限操作任务（管理员或创建者）
  // 对于 manager 视图，显示操作按钮；对于学生视图，不显示
  const isAdmin = currentRole === 'ADMIN';
  const isCreator = managerTask?.created_by === user?.id;
  const canEditTask = !isStudentView && (isAdmin || isCreator);

  /**
   * 处理编辑
   */
  const handleEdit = () => {
    navigate(`/tasks/${targetTaskId}/edit`);
  };

  /**
   * 处理关闭任务
   */
  const handleCloseClick = () => {
    setCloseModalOpen(true);
  };

  /**
   * 确认关闭任务
   */
  const handleClose = async () => {
    try {
      await closeTask.mutateAsync(targetTaskId);
      message.success('任务已关闭');
      setCloseModalOpen(false);
    } catch (error) {
      showApiError(error, '关闭任务失败');
    }
  };

  /**
   * 处理删除
   */
  const handleDeleteClick = () => {
    setDeleteModalOpen(true);
  };

  /**
   * 确认删除任务
   */
  const handleDelete = async () => {
    try {
      await deleteTask.mutateAsync(targetTaskId);
      message.success('任务已删除');
      setDeleteModalOpen(false);
    } catch (error) {
      showApiError(error, '删除失败');
    }
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'edit',
      label: '修改',
      icon: <EditOutlined />,
      onClick: handleEdit,
      disabled: managerClosed, // 已关闭的任务无法修改
    },
    ...(isAdmin && !managerClosed
      ? [
        {
          key: 'close',
          label: '关闭任务',
          icon: <StopOutlined />,
          onClick: handleCloseClick,
        },
      ]
      : []),
    {
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: handleDeleteClick,
    },
  ];

  return (
    <>
      <Card
        hoverable
        onClick={() => navigate(`/tasks/${targetTaskId}`)}
        style={{ height: '100%', cursor: 'pointer', position: 'relative' }}
      >
        {/* 操作按钮 - 仅在管理员/导师视图且有权限时显示 */}
        {canEditTask && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 100,
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Dropdown
              menu={{ items: menuItems }}
              trigger={['click']}
              placement="bottomRight"
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
            >
              <Button
                type="text"
                icon={<MoreOutlined />}
                size="small"
                style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  background: 'white',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  color: 'var(--color-gray-700)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-gray-50)';
                  e.currentTarget.style.color = 'var(--color-gray-900)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.color = 'var(--color-gray-700)';
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              />
            </Dropdown>
          </div>
        )}

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
          <Paragraph
            type="secondary"
            ellipsis={{ rows: 2, tooltip: description }}
            style={{
              display: 'block',
              marginBottom: 'var(--spacing-4)',
              fontSize: 'var(--font-size-sm)',
              lineHeight: 1.5,
            }}
          >
            {description}
          </Paragraph>
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

      {/* 关闭任务确认弹窗 */}
      <Modal
        open={closeModalOpen}
        title="确认关闭任务"
        onOk={handleClose}
        onCancel={() => setCloseModalOpen(false)}
        okText="关闭任务"
        cancelText="取消"
        okButtonProps={{ loading: closeTask.isPending }}
      >
        <p>确定要关闭任务「{title}」吗？关闭后未完成的分配记录将标记为已逾期。</p>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        open={deleteModalOpen}
        title="确认删除"
        onOk={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: deleteTask.isPending }}
      >
        <p>确定要删除任务「{title}」吗？此操作不可恢复。</p>
      </Modal>
    </>
  );
};
