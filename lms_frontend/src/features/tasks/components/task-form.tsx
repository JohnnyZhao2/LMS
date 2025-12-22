import { useState, useEffect, useMemo } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  Card,
  Transfer,
  message,
  Typography,
  Alert,
  Tag,
  Space,
} from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCreateTask } from '../api/create-task';
import { useAssignableUsers } from '../api/get-assignable-users';
import { useTaskKnowledgeOptions, useTaskQuizOptions } from '../api/get-task-resources';
import type {
  ExamTaskCreateRequest,
  LearningTaskCreateRequest,
  PracticeTaskCreateRequest,
  TaskType,
} from '@/types/api';
import { showApiError } from '@/utils/error-handler';
import dayjs from '@/lib/dayjs';
import type { Dayjs } from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface TaskFormValues {
  task_type: TaskType;
  title: string;
  description?: string;
  deadline: Dayjs;
  start_time?: Dayjs;
  duration?: number;
  pass_score?: number;
  knowledge_ids?: number[];
  quiz_ids?: number[];
  quiz_id?: number;
}

/**
 * 任务创建表单组件
 * 
 * 支持从 URL 参数预设：
 * - quiz_id: 单个试卷 ID
 * - quiz_ids: 多个试卷 ID（逗号分隔）
 * - task_type: 任务类型（PRACTICE/EXAM）
 */
export const TaskForm: React.FC = () => {
  const [form] = Form.useForm<TaskFormValues>();
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
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [quizSearch, setQuizSearch] = useState('');

  const knowledgeQuery = useTaskKnowledgeOptions({
    search: knowledgeSearch,
    enabled: taskType !== 'EXAM',
  });
  const quizQuery = useTaskQuizOptions({
    search: quizSearch,
    enabled: !isFromTestCenter && taskType !== 'LEARNING',
  });

  const knowledgeOptions = useMemo(
    () =>
      (knowledgeQuery.data ?? []).map((item) => ({
        label: item.title,
        value: item.id,
      })),
    [knowledgeQuery.data]
  );

  const quizOptions = useMemo(
    () =>
      (quizQuery.data?.results ?? []).map((quiz) => ({
        label: `${quiz.title}（${quiz.question_count}题）`,
        value: quiz.id,
      })),
    [quizQuery.data]
  );

  // 初始化表单
  useEffect(() => {
    if (presetTaskType) {
      form.setFieldValue('task_type', presetTaskType);
      setTaskType(presetTaskType);
    }
  }, [presetTaskType, form]);

  // 清理不同任务类型下的动态字段，避免数据串联
  useEffect(() => {
    form.setFieldsValue({
      knowledge_ids: [],
      quiz_ids: [],
      quiz_id: undefined,
      start_time: undefined,
      duration: undefined,
      pass_score: undefined,
    });
  }, [taskType, form]);

  const handleSubmit = async (values: TaskFormValues) => {
    if (selectedUserIds.length === 0) {
      message.error('请选择学员');
      return;
    }

    try {
      const deadline = dayjs(values.deadline).toISOString();

      if (taskType === 'LEARNING') {
        const knowledgeIds = values.knowledge_ids ?? [];
        if (knowledgeIds.length === 0) {
          message.error('请选择知识文档');
          return;
        }
        const payload: LearningTaskCreateRequest = {
          title: values.title,
          description: values.description,
          deadline,
          knowledge_ids: knowledgeIds,
          assignee_ids: selectedUserIds,
        };
        await createTask.mutateAsync({ type: 'LEARNING', data: payload });
      } else if (taskType === 'PRACTICE') {
        const quizIdsPayload = isFromTestCenter ? quizIds : values.quiz_ids;
        if (!quizIdsPayload || quizIdsPayload.length === 0) {
          message.error('请选择试卷');
          return;
        }
        const payload: PracticeTaskCreateRequest = {
          title: values.title,
          description: values.description,
          deadline,
          quiz_ids: quizIdsPayload,
          knowledge_ids: values.knowledge_ids ?? [],
          assignee_ids: selectedUserIds,
        };
        await createTask.mutateAsync({ type: 'PRACTICE', data: payload });
      } else {
        const quizId = isFromTestCenter ? quizIds[0] : values.quiz_id;
        if (!quizId) {
          message.error('请选择试卷');
          return;
        }
        if (!values.start_time || !values.duration || values.pass_score === undefined) {
          message.error('请完整填写考试信息');
          return;
        }
        const payload: ExamTaskCreateRequest = {
          title: values.title,
          description: values.description,
          deadline,
          start_time: dayjs(values.start_time).toISOString(),
          duration: values.duration,
          pass_score: values.pass_score,
          quiz_id: quizId,
          assignee_ids: selectedUserIds,
        };
        await createTask.mutateAsync({ type: 'EXAM', data: payload });
      }

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
            description={
              <Space size={[4, 4]} wrap>
                {quizIds.map((qid) => (
                  <Tag key={qid} color="blue">
                    试卷 #{qid}
                  </Tag>
                ))}
              </Space>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            task_type: presetTaskType || 'LEARNING',
            knowledge_ids: [],
            quiz_ids: [],
          }}
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

          {taskType !== 'EXAM' && (
            <Form.Item
              name="knowledge_ids"
              label={taskType === 'LEARNING' ? '知识文档' : '关联知识文档（可选）'}
              rules={
                taskType === 'LEARNING'
                  ? [{ required: true, message: '请选择知识文档' }]
                  : undefined
              }
            >
              <Select
                mode="multiple"
                placeholder="搜索并选择知识文档"
                options={knowledgeOptions}
                loading={knowledgeQuery.isLoading}
                showSearch
                filterOption={false}
                onSearch={setKnowledgeSearch}
                allowClear
              />
            </Form.Item>
          )}

          {taskType === 'PRACTICE' && !isFromTestCenter && (
            <Form.Item
              name="quiz_ids"
              label="选择试卷"
              rules={[{ required: true, message: '请选择试卷' }]}
            >
              <Select
                mode="multiple"
                placeholder="请选择试卷"
                options={quizOptions}
                loading={quizQuery.isLoading}
                showSearch
                filterOption={false}
                onSearch={setQuizSearch}
                allowClear
              />
            </Form.Item>
          )}

          {taskType === 'EXAM' && !isFromTestCenter && (
            <Form.Item
              name="quiz_id"
              label="选择试卷"
              rules={[{ required: true, message: '请选择试卷' }]}
            >
              <Select
                placeholder="请选择试卷"
                options={quizOptions}
                loading={quizQuery.isLoading}
                showSearch
                filterOption={false}
                onSearch={setQuizSearch}
                allowClear
              />
            </Form.Item>
          )}

          {taskType === 'EXAM' && (
            <>
              <Form.Item
                name="start_time"
                label="考试开始时间"
                rules={[{ required: true, message: '请选择考试开始时间' }]}
              >
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name="duration"
                label="考试时长（分钟）"
                rules={[{ required: true, message: '请输入考试时长' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name="pass_score"
                label="及格分数"
                rules={[{ required: true, message: '请输入及格分数' }]}
              >
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

