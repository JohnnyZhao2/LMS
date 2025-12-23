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
  Spin,
  Descriptions,
} from 'antd';
import {
  ArrowLeftOutlined,
  ExclamationCircleOutlined,
  BookOutlined,
  FileTextOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCreateTask } from '../api/create-task';
import { useUpdateTask } from '../api/update-task';
import { useTaskDetail } from '../api/get-task-detail';
import { useAssignableUsers } from '../api/get-assignable-users';
import { useTaskKnowledgeOptions, useTaskQuizOptions } from '../api/get-task-resources';
import type {
  ExamTaskCreateRequest,
  LearningTaskCreateRequest,
  PracticeTaskCreateRequest,
  TaskType,
  KnowledgeListItem,
  PaginatedResponse,
  QuizListItem,
} from '@/types/api';
import { showApiError } from '@/utils/error-handler';
import dayjs from '@/lib/dayjs';
import type { Dayjs } from 'dayjs';
import { PageHeader } from '@/components/ui';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface TaskFormValues {
  task_type?: TaskType;
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
 * 任务表单组件
 * 
 * 支持创建和编辑两种模式：
 * - 新建模式：从 /tasks/create 访问，支持任务类型选择
 * - 编辑模式：从 /tasks/:id/edit 访问，任务类型不可修改
 * 
 * 新建模式支持从 URL 参数预设：
 * - quiz_id: 单个试卷 ID
 * - quiz_ids: 多个试卷 ID（逗号分隔）
 * - task_type: 任务类型（PRACTICE/EXAM）
 */
export const TaskForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [form] = Form.useForm<TaskFormValues>();
  
  const isEdit = !!id;
  const taskId = isEdit ? Number(id) : 0;

  // API Hooks
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { data: task, isLoading: taskLoading, isError: taskError } = useTaskDetail(taskId, {
    enabled: isEdit && Number.isFinite(taskId) && taskId > 0,
  });
  const { data: users, isLoading: usersLoading } = useAssignableUsers();

  // 从 URL 参数获取预设值（仅新建模式）
  const presetQuizId = !isEdit ? searchParams.get('quiz_id') : null;
  const presetQuizIds = !isEdit ? searchParams.get('quiz_ids') : null;
  const presetTaskType = !isEdit ? (searchParams.get('task_type') as TaskType | null) : null;

  // 解析试卷 IDs
  const quizIds: number[] = presetQuizId
    ? [Number(presetQuizId)]
    : presetQuizIds
      ? presetQuizIds.split(',').map(Number)
      : [];

  // 是否从测试中心跳转过来（仅新建模式）
  const isFromTestCenter = !isEdit && quizIds.length > 0;

  // 状态管理
  const [taskType, setTaskType] = useState<TaskType>(
    isEdit && task ? task.task_type : presetTaskType || 'LEARNING'
  );
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [quizSearch, setQuizSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 根据任务类型和模式决定是否启用查询
  const knowledgeQuery = useTaskKnowledgeOptions({
    search: knowledgeSearch,
    enabled: isEdit ? task?.task_type !== 'EXAM' : taskType !== 'EXAM',
  });
  const quizQuery = useTaskQuizOptions({
    search: quizSearch,
    enabled: isEdit
      ? task?.task_type !== 'LEARNING'
      : !isFromTestCenter && taskType !== 'LEARNING',
  });

  const knowledgeOptions = useMemo(() => {
    const data = knowledgeQuery.data;
    if (!data) return [];
    
    // 处理分页响应格式：{ results: [...], count: ... }
    if (typeof data === 'object' && 'results' in data) {
      const paginatedData = data as PaginatedResponse<KnowledgeListItem>;
      return (paginatedData.results || []).map((item: KnowledgeListItem) => ({
        label: item.title,
        value: item.id,
      }));
    }
    
    // 处理数组格式
    const items: KnowledgeListItem[] = Array.isArray(data) ? data : [];
    return items.map((item: KnowledgeListItem) => ({
      label: item.title,
      value: item.id,
    }));
  }, [knowledgeQuery.data]);

  const quizOptions = useMemo(() => {
    const data = quizQuery.data;
    // useTaskQuizOptions 返回 PaginatedResponse<QuizListItem>
    const paginatedData = data as PaginatedResponse<QuizListItem> | undefined;
    return (paginatedData?.results ?? []).map((quiz: QuizListItem) => ({
      label: `${quiz.title}（${quiz.question_count}题）`,
      value: quiz.id,
    }));
  }, [quizQuery.data]);

  // 编辑模式下加载任务数据到表单
  useEffect(() => {
    if (isEdit && task) {
      const knowledgeIds = task.knowledge_items?.map((item) => item.knowledge) || [];
      const quizIds = task.quizzes?.map((item) => item.quiz) || [];
      const assigneeIds = task.assignments?.map((item) => item.assignee) || [];

      form.setFieldsValue({
        title: task.title,
        description: task.description || undefined,
        deadline: dayjs(task.deadline),
        start_time: task.start_time ? dayjs(task.start_time) : undefined,
        duration: task.duration || undefined,
        pass_score: task.pass_score ? parseFloat(task.pass_score) : undefined,
        knowledge_ids: knowledgeIds,
        quiz_ids: task.task_type === 'PRACTICE' ? quizIds : undefined,
        quiz_id: task.task_type === 'EXAM' ? (quizIds[0] || undefined) : undefined,
      });

      setSelectedUserIds(assigneeIds);
      setTaskType(task.task_type);
    }
  }, [isEdit, task, form]);

  // 新建模式下初始化表单
  useEffect(() => {
    if (!isEdit) {
      if (presetTaskType) {
        form.setFieldValue('task_type', presetTaskType);
        setTaskType(presetTaskType);
      }
    }
  }, [isEdit, presetTaskType, form]);

  // 清理不同任务类型下的动态字段，避免数据串联（仅新建模式）
  useEffect(() => {
    if (!isEdit) {
      form.setFieldsValue({
        knowledge_ids: [],
        quiz_ids: [],
        quiz_id: undefined,
        start_time: undefined,
        duration: undefined,
        pass_score: undefined,
      });
    }
  }, [taskType, isEdit, form]);

  /**
   * 处理表单提交
   */
  const handleSubmit = async (values: TaskFormValues) => {
    if (selectedUserIds.length === 0) {
      message.error('请选择学员');
      return;
    }

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const deadline = dayjs(values.deadline).toISOString();

      if (isEdit) {
        // 编辑模式：更新任务
        const currentTaskType = task?.task_type;
        const updateData: {
          title?: string;
          description?: string;
          deadline?: string;
          start_time?: string;
          duration?: number;
          pass_score?: number;
          knowledge_ids?: number[];
          quiz_ids?: number[];
          quiz_id?: number;
          assignee_ids?: number[];
        } = {
          title: values.title,
          description: values.description,
          deadline,
          assignee_ids: selectedUserIds,
        };

        // 考试任务的额外字段
        if (currentTaskType === 'EXAM') {
          if (values.start_time) {
            updateData.start_time = dayjs(values.start_time).toISOString();
          }
          if (values.duration !== undefined) {
            updateData.duration = values.duration;
          }
          if (values.pass_score !== undefined) {
            updateData.pass_score = values.pass_score;
          }
          if (values.quiz_id) {
            updateData.quiz_id = values.quiz_id;
          }
        } else {
          // 学习任务和练习任务
          if (values.knowledge_ids !== undefined) {
            updateData.knowledge_ids = values.knowledge_ids;
          }
          if (currentTaskType === 'PRACTICE' && values.quiz_ids !== undefined) {
            updateData.quiz_ids = values.quiz_ids;
          }
        }

        await updateTask.mutateAsync({ taskId, data: updateData });
        message.success('任务更新成功');
      } else {
        // 新建模式：创建任务
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
      }

      navigate('/tasks');
    } catch (error) {
      showApiError(error, isEdit ? '更新失败' : '创建失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 加载状态
  if (isEdit && taskLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  // 错误状态
  if (isEdit && (taskError || !task)) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-12)' }}>
        <ExclamationCircleOutlined style={{ fontSize: 48, color: 'var(--color-error-500)', marginBottom: 16 }} />
        <Title level={4}>任务不存在</Title>
        <Button type="primary" onClick={() => navigate('/tasks')} style={{ marginTop: 16 }}>
          返回任务列表
        </Button>
      </div>
    );
  }

  // 检查任务是否已关闭（仅编辑模式）
  if (isEdit && task?.is_closed) {
    return (
      <div>
        <div style={{ marginBottom: 'var(--spacing-4)' }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/tasks')}
            style={{ color: 'var(--color-gray-600)', fontWeight: 500 }}
          >
            返回列表
          </Button>
        </div>
        <Alert
          message="任务已关闭"
          description="任务已关闭，无法进行修改。如需修改，请联系管理员。"
          type="warning"
          showIcon
          action={
            <Button size="small" onClick={() => navigate('/tasks')}>
              返回列表
            </Button>
          }
        />
      </div>
    );
  }

  const currentTaskType = isEdit ? task?.task_type : taskType;
  const isExamTask = currentTaskType === 'EXAM';

  /**
   * 任务类型配置
   */
  const taskTypeConfig = {
    LEARNING: {
      icon: <BookOutlined />,
      color: 'var(--color-success-500)',
      label: '学习任务',
    },
    PRACTICE: {
      icon: <FileTextOutlined />,
      color: 'var(--color-primary-500)',
      label: '练习任务',
    },
    EXAM: {
      icon: <FileTextOutlined />,
      color: 'var(--color-error-500)',
      label: '考试任务',
    },
  };

  const typeConfig = currentTaskType
    ? taskTypeConfig[currentTaskType as keyof typeof taskTypeConfig] || taskTypeConfig.LEARNING
    : taskTypeConfig.LEARNING;

  const transferData = (users || []).map((user) => ({
    key: String(user.id),
    title: user.username,
    description: user.employee_id,
  }));

  return (
    <div className={isEdit ? 'animate-fadeIn' : ''}>
      {/* 返回按钮（编辑模式） */}
      {isEdit && (
        <div style={{ marginBottom: 'var(--spacing-4)' }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/tasks')}
            style={{ color: 'var(--color-gray-600)', fontWeight: 500 }}
          >
            返回列表
          </Button>
        </div>
      )}

      {/* 页面标题 */}
      {isEdit ? (
        <PageHeader
          title="编辑任务"
          subtitle="修改任务的基本信息"
          icon={typeConfig.icon}
        />
      ) : (
        <Title level={2}>新建任务</Title>
      )}

      <div style={{ display: isEdit ? 'grid' : 'block', gridTemplateColumns: isEdit ? '1fr 400px' : 'none', gap: isEdit ? 'var(--spacing-6)' : 0 }}>
        {/* 表单 */}
        <Card>
          {!isEdit && isFromTestCenter && (
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
            disabled={isSubmitting}
            initialValues={{
              task_type: presetTaskType || 'LEARNING',
              knowledge_ids: [],
              quiz_ids: [],
            }}
          >
            {/* 任务类型选择（仅新建模式） */}
            {!isEdit && (
              <Form.Item
                name="task_type"
                label="任务类型"
                rules={[{ required: true, message: '请选择任务类型' }]}
              >
                <Select onChange={(value) => setTaskType(value)} disabled={isFromTestCenter}>
                  <Option value="LEARNING" disabled={isFromTestCenter}>
                    学习任务
                  </Option>
                  <Option value="PRACTICE">练习任务</Option>
                  <Option value="EXAM">考试任务</Option>
                </Select>
              </Form.Item>
            )}

            <Form.Item
              name="title"
              label="任务标题"
              rules={[
                { required: true, message: '请输入任务标题' },
                { max: 200, message: '标题长度不能超过200个字符' },
              ]}
            >
              <Input placeholder="请输入任务标题" maxLength={200} showCount />
            </Form.Item>

            <Form.Item
              name="description"
              label="任务描述"
              rules={[{ max: 1000, message: '描述长度不能超过1000个字符' }]}
            >
              <TextArea
                rows={4}
                placeholder="请输入任务描述（可选）"
                maxLength={1000}
                showCount
              />
            </Form.Item>

            <Form.Item
              name="deadline"
              label="截止时间"
              rules={[
                { required: true, message: '请选择截止时间' },
                ...(isEdit
                  ? [
                      {
                        validator: (_: unknown, value: Dayjs) => {
                          if (!value) return Promise.resolve();
                          const deadline = dayjs(value);
                          const now = dayjs();
                          if (deadline.isBefore(now)) {
                            return Promise.reject(new Error('截止时间不能早于当前时间'));
                          }
                          return Promise.resolve();
                        },
                      },
                    ]
                  : []),
              ]}
            >
              <DatePicker
                showTime
                style={{ width: '100%' }}
                format="YYYY-MM-DD HH:mm"
                placeholder="请选择截止时间"
                disabledDate={isEdit ? (current) => current && current < dayjs().startOf('day') : undefined}
              />
            </Form.Item>

            {/* 考试任务字段 */}
            {isExamTask && (
              <>
                <Form.Item
                  name="start_time"
                  label="考试开始时间"
                  rules={[
                    { required: true, message: '请选择考试开始时间' },
                    ...(isEdit
                      ? [
                          {
                            validator: (_: unknown, value: Dayjs) => {
                              if (!value) return Promise.resolve();
                              const startTime = dayjs(value);
                              const deadline = form.getFieldValue('deadline');
                              if (deadline && startTime.isAfter(dayjs(deadline))) {
                                return Promise.reject(new Error('开始时间必须早于截止时间'));
                              }
                              return Promise.resolve();
                            },
                          },
                        ]
                      : []),
                  ]}
                  dependencies={isEdit ? ['deadline'] : undefined}
                >
                  <DatePicker
                    showTime
                    style={{ width: '100%' }}
                    format="YYYY-MM-DD HH:mm"
                    placeholder="请选择考试开始时间"
                  />
                </Form.Item>

                <Form.Item
                  name="duration"
                  label="考试时长（分钟）"
                  rules={[
                    { required: true, message: '请输入考试时长' },
                    { type: 'number', min: 1, message: '考试时长至少为1分钟' },
                    { type: 'number', max: 1440, message: '考试时长不能超过1440分钟（24小时）' },
                  ]}
                >
                  <InputNumber
                    min={1}
                    max={1440}
                    style={{ width: '100%' }}
                    placeholder="请输入考试时长"
                    addonAfter={isEdit ? '分钟' : undefined}
                  />
                </Form.Item>

                <Form.Item
                  name="pass_score"
                  label="及格分数"
                  rules={[
                    { required: true, message: '请输入及格分数' },
                    { type: 'number', min: 0, message: '及格分数不能小于0' },
                  ]}
                >
                  <InputNumber
                    min={0}
                    style={{ width: '100%' }}
                    placeholder="请输入及格分数"
                    precision={2}
                    step={0.1}
                  />
                </Form.Item>
              </>
            )}

            {/* 知识文档选择 */}
            {currentTaskType !== 'EXAM' && (
              <Form.Item
                name="knowledge_ids"
                label={currentTaskType === 'LEARNING' ? '知识文档' : '关联知识文档（可选）'}
                rules={
                  currentTaskType === 'LEARNING'
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

            {/* 试卷选择 - 练习任务 */}
            {currentTaskType === 'PRACTICE' && !isFromTestCenter && (
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

            {/* 试卷选择 - 考试任务 */}
            {currentTaskType === 'EXAM' && !isFromTestCenter && (
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

            {/* 学员选择 */}
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
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isSubmitting || createTask.isPending || updateTask.isPending}
                  size={isEdit ? 'large' : 'middle'}
                >
                  {isEdit ? '保存修改' : '创建任务'}
                </Button>
                <Button
                  onClick={() => (isEdit ? navigate(`/tasks/${taskId}`) : navigate('/tasks'))}
                  disabled={isSubmitting || createTask.isPending || updateTask.isPending}
                  size={isEdit ? 'large' : 'middle'}
                >
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {/* 任务信息侧边栏（仅编辑模式） */}
        {isEdit && task && (
          <div>
            <Card title="任务信息" style={{ position: 'sticky', top: 20 }}>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="任务类型">
                  <Tag color={typeConfig.color} icon={typeConfig.icon}>
                    {task.task_type_display}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="创建人">{task.created_by_name}</Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {dayjs(task.created_at).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label="最后更新">
                  {dayjs(task.updated_at).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label="关联知识">
                  <Space>
                    <BookOutlined style={{ color: 'var(--color-gray-400)' }} />
                    <Text>{task.knowledge_items?.length || 0} 个</Text>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="关联试卷">
                  <Space>
                    <FileTextOutlined style={{ color: 'var(--color-gray-400)' }} />
                    <Text>{task.quizzes?.length || 0} 个</Text>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="分配学员">
                  <Space>
                    <TeamOutlined style={{ color: 'var(--color-gray-400)' }} />
                    <Text>{task.assignments?.length || 0} 人</Text>
                  </Space>
                </Descriptions.Item>
              </Descriptions>

              <Alert
                message="提示"
                description="修改任务信息后，已分配的学员将收到通知。考试任务的开始时间和时长修改后，可能影响正在进行或待开始的考试。"
                type="info"
                showIcon
                style={{ marginTop: 'var(--spacing-4)' }}
              />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
