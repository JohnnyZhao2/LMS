import { useMemo, useState } from 'react';
import { Select, Row, Col, Empty, Spin, Button, Typography } from 'antd';
import { PlusOutlined, FileTextOutlined, FilterOutlined } from '@ant-design/icons';
import { useStudentTasks, useTaskList } from '../api/get-tasks';
import { TaskCard } from './task-card';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui';
import type {
  StudentTaskCenterItem,
  TaskListItem,
  TaskType,
  TaskStatus,
} from '@/types/api';

const { Text } = Typography;

/**
 * 任务列表组件
 */
export const TaskList: React.FC = () => {
  const [taskType, setTaskType] = useState<TaskType | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const { currentRole } = useAuth();
  const navigate = useNavigate();
  const isStudentView = currentRole === 'STUDENT';

  const canCreateTask = currentRole && ['MENTOR', 'DEPT_MANAGER', 'ADMIN'].includes(currentRole);

  const studentStatus = isStudentView ? (status as TaskStatus | undefined) : undefined;
  const isClosed =
    !isStudentView && status
      ? status === 'CLOSED'
        ? true
        : status === 'ACTIVE'
          ? false
          : undefined
      : undefined;

  const studentQuery = useStudentTasks(
    { taskType, status: studentStatus },
    { enabled: isStudentView }
  );
  const managerQuery = useTaskList(
    { taskType, isClosed },
    { enabled: !isStudentView }
  );

  const isLoading = isStudentView ? studentQuery.isLoading : managerQuery.isLoading;
  const tasks: Array<StudentTaskCenterItem | TaskListItem> = useMemo(() => {
    if (isStudentView) {
      return studentQuery.data?.results ?? [];
    }
    return managerQuery.data ?? [];
  }, [isStudentView, managerQuery.data, studentQuery.data]);

  const totalLabel = isStudentView ? studentQuery.data?.count ?? 0 : tasks.length;

  const statusOptions = isStudentView
    ? [
        { value: 'IN_PROGRESS', label: '进行中' },
        { value: 'PENDING_EXAM', label: '待考试' },
        { value: 'COMPLETED', label: '已完成' },
        { value: 'OVERDUE', label: '已逾期' },
      ]
    : [
        { value: 'ACTIVE', label: '进行中' },
        { value: 'CLOSED', label: '已结束' },
      ];

  return (
    <div>
      <PageHeader
        title="任务中心"
        subtitle="查看和管理学习任务、练习任务和考试任务"
        icon={<FileTextOutlined />}
        extra={
          canCreateTask && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/tasks/create')}
              style={{
                height: 44,
                paddingLeft: 'var(--spacing-5)',
                paddingRight: 'var(--spacing-5)',
                fontWeight: 600,
                borderRadius: 'var(--radius-lg)',
              }}
            >
              新建任务
            </Button>
          )
        }
      />

      {/* 筛选区 */}
      <div
        className="animate-fadeInUp"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-4)',
          marginBottom: 'var(--spacing-6)',
          padding: 'var(--spacing-4)',
          background: 'var(--color-white)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', color: 'var(--color-gray-500)' }}>
          <FilterOutlined />
          <Text type="secondary">筛选</Text>
        </div>
        <Select
          style={{ width: 140 }}
          placeholder="任务类型"
          allowClear
          onChange={(value) => setTaskType(value)}
          options={[
            { value: 'LEARNING', label: '学习任务' },
            { value: 'PRACTICE', label: '练习任务' },
            { value: 'EXAM', label: '考试任务' },
          ]}
        />
        <Select
          style={{ width: 140 }}
          placeholder="状态"
          allowClear
          onChange={(value) => setStatus(value)}
          options={statusOptions}
        />
        {tasks && (
          <Text type="secondary" style={{ marginLeft: 'auto', fontSize: 'var(--font-size-sm)' }}>
            共 {totalLabel} 个任务
          </Text>
        )}
      </div>

      {/* 任务列表 */}
      <Spin spinning={isLoading}>
        {tasks && tasks.length > 0 ? (
          <Row gutter={[24, 24]}>
            {tasks.map((task, index) => (
              <Col xs={24} sm={12} lg={8} key={task.id}>
                <div
                  className="animate-fadeInUp"
                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                >
                  <TaskCard
                    task={task}
                    variant={isStudentView ? 'student' : 'manager'}
                  />
                </div>
              </Col>
            ))}
          </Row>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无任务"
            style={{ padding: 'var(--spacing-12) 0' }}
          />
        )}
      </Spin>
    </div>
  );
};
