import { useState } from 'react';
import { Form, Input, Select, DatePicker, InputNumber, Button, Card, Transfer, message, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useCreateTask } from '../api/create-task';
import { useAssignableUsers } from '../api/get-assignable-users';
import type { TaskType, TaskCreateRequest } from '@/types/api';
import { showApiError } from '@/utils/error-handler';
import dayjs from '@/lib/dayjs';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

/**
 * 任务创建表单组件
 */
export const TaskForm: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const createTask = useCreateTask();
  const { data: users, isLoading: usersLoading } = useAssignableUsers();

  const [taskType, setTaskType] = useState<TaskType>('LEARNING');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  const handleSubmit = async (values: Omit<TaskCreateRequest, 'assignee_ids'>) => {
    if (selectedUserIds.length === 0) {
      message.error('请选择学员');
      return;
    }

    try {
      await createTask.mutateAsync({
        ...values,
        deadline: dayjs(values.deadline).toISOString(),
        start_time: values.start_time ? dayjs(values.start_time).toISOString() : undefined,
        assignee_ids: selectedUserIds,
      });
      message.success('任务创建成功');
      navigate('/tasks');
    } catch (error) {
      showApiError(error, '创建失败');
    }
  };

  const transferData = (users || []).map((user) => ({
    key: String(user.id),
    title: user.username,
    description: user.employee_id,
  }));

  return (
    <div>
      <Title level={2}>新建任务</Title>
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ task_type: 'LEARNING' }}
        >
          <Form.Item
            name="task_type"
            label="任务类型"
            rules={[{ required: true, message: '请选择任务类型' }]}
          >
            <Select onChange={(value) => setTaskType(value)}>
              <Option value="LEARNING">学习任务</Option>
              <Option value="PRACTICE">练习任务</Option>
              <Option value="EXAM">考试任务</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="title"
            label="任务标题"
            rules={[{ required: true, message: '请输入任务标题' }]}
          >
            <Input placeholder="请输入任务标题" />
          </Form.Item>

          <Form.Item name="description" label="任务描述">
            <TextArea rows={4} placeholder="请输入任务描述" />
          </Form.Item>

          <Form.Item
            name="deadline"
            label="截止时间"
            rules={[{ required: true, message: '请选择截止时间' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>

          {taskType === 'EXAM' && (
            <>
              <Form.Item name="start_time" label="考试开始时间">
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="duration" label="考试时长（分钟）">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="pass_score" label="及格分数">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </>
          )}

          <Form.Item label="选择学员" required>
            <Transfer
              dataSource={transferData}
              targetKeys={selectedUserIds.map(String)}
              onChange={(keys) => setSelectedUserIds(keys.map(Number))}
              render={(item) => `${item.title} (${item.description})`}
              showSearch
              listStyle={{ width: 300, height: 300 }}
              disabled={usersLoading}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={createTask.isPending}>
              创建任务
            </Button>
            <Button style={{ marginLeft: 8 }} onClick={() => navigate('/tasks')}>
              取消
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

