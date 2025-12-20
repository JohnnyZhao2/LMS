import { useState, useEffect } from 'react';
import { Form, Input, Select, DatePicker, InputNumber, Button, Card, Transfer, message, Typography, Alert } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
 * 
 * 支持从 URL 参数预设：
 * - quiz_id: 单个试卷 ID
 * - quiz_ids: 多个试卷 ID（逗号分隔）
 * - task_type: 任务类型（PRACTICE/EXAM）
 */
export const TaskForm: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const createTask = useCreateTask();
  const { data: users, isLoading: usersLoading } = useAssignableUsers();

  // 从 URL 参数获取预设值
  const presetQuizId = searchParams.get('quiz_id');
  const presetQuizIds = searchParams.get('quiz_ids');
  const presetTaskType = searchParams.get('task_type') as TaskType | null;
  
  // 解析试卷 IDs
  const quizIds: number[] = presetQuizId 
    ? [Number(presetQuizId)]
    : presetQuizIds 
      ? presetQuizIds.split(',').map(Number)
      : [];

  // 是否从测试中心跳转过来
  const isFromTestCenter = quizIds.length > 0;

  const [taskType, setTaskType] = useState<TaskType>(presetTaskType || 'LEARNING');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  // 初始化表单
  useEffect(() => {
    if (presetTaskType) {
      form.setFieldValue('task_type', presetTaskType);
      setTaskType(presetTaskType);
    }
  }, [presetTaskType, form]);

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
        quiz_ids: isFromTestCenter ? quizIds : values.quiz_ids,
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
        {isFromTestCenter && (
          <Alert
            message={`已选择 ${quizIds.length} 份试卷`}
            description={`任务类型：${presetTaskType === 'PRACTICE' ? '练习任务' : presetTaskType === 'EXAM' ? '考试任务' : '未知'}`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ task_type: presetTaskType || 'LEARNING' }}
        >
          <Form.Item
            name="task_type"
            label="任务类型"
            rules={[{ required: true, message: '请选择任务类型' }]}
          >
            <Select 
              onChange={(value) => setTaskType(value)}
              disabled={isFromTestCenter}
            >
              <Option value="LEARNING" disabled={isFromTestCenter}>学习任务</Option>
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

