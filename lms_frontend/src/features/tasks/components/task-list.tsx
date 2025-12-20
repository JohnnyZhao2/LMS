import { useState } from 'react';
import { Select, Row, Col, Empty, Spin, Typography, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useStudentTasks } from '../api/get-tasks';
import { TaskCard } from './task-card';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import type { TaskType, TaskStatus } from '@/types/api';

const { Title } = Typography;
const { Option } = Select;

/**
 * 任务列表组件
 */
export const TaskList: React.FC = () => {
  const [taskType, setTaskType] = useState<TaskType | undefined>();
  const [status, setStatus] = useState<TaskStatus | undefined>();
  const { data, isLoading } = useStudentTasks({ taskType, status });
  const { currentRole } = useAuth();
  const navigate = useNavigate();

  const canCreateTask = currentRole && ['MENTOR', 'DEPT_MANAGER', 'ADMIN'].includes(currentRole);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>任务中心</Title>
        {canCreateTask && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tasks/create')}>
            新建任务
          </Button>
        )}
      </div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
        <Select
          style={{ width: 120 }}
          placeholder="任务类型"
          allowClear
          onChange={(value) => setTaskType(value)}
        >
          <Option value="LEARNING">学习任务</Option>
          <Option value="PRACTICE">练习任务</Option>
          <Option value="EXAM">考试任务</Option>
        </Select>
        <Select
          style={{ width: 120 }}
          placeholder="状态"
          allowClear
          onChange={(value) => setStatus(value)}
        >
          <Option value="IN_PROGRESS">进行中</Option>
          <Option value="COMPLETED">已完成</Option>
          <Option value="OVERDUE">已逾期</Option>
        </Select>
      </div>
      <Spin spinning={isLoading}>
        {data && data.length > 0 ? (
          <Row gutter={[16, 16]}>
            {data.map((task) => (
              <Col xs={24} sm={12} lg={8} key={task.id}>
                <TaskCard task={task} />
              </Col>
            ))}
          </Row>
        ) : (
          <Empty description="暂无任务" />
        )}
      </Spin>
    </div>
  );
};

