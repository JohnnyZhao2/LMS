import { useState, useEffect, useMemo } from 'react';
import {
  Form,
  Input,
  DatePicker,
  Button,
  message,
  Spin,
  Empty,
  Tooltip,
  Modal,
  Checkbox,
  List,
  Avatar,
  Tag,
  Segmented,
} from 'antd';
import {
  ArrowLeftOutlined,
  SearchOutlined,
  PlusOutlined,
  BookOutlined,
  FileTextOutlined,
  DeleteOutlined,
  UpOutlined,
  DownOutlined,
  SendOutlined,
  LoadingOutlined,
  AppstoreOutlined,
  UserAddOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCreateTask, type TaskCreateRequest } from '../api/create-task';
import { useUpdateTask } from '../api/update-task';
import { useTaskDetail } from '../api/get-task-detail';
import { useAssignableUsers } from '../api/get-assignable-users';
import { useTaskKnowledgeOptions, useTaskQuizOptions } from '../api/get-task-resources';
import { useQuizDetail } from '@/features/quizzes/api/get-quizzes';
import type {
  KnowledgeListItem,
  PaginatedResponse,
  QuizListItem,
} from '@/types/api';
import { showApiError } from '@/utils/error-handler';
import dayjs from '@/lib/dayjs';
import type { Dayjs } from 'dayjs';

const { TextArea } = Input;

type ResourceType = 'DOCUMENT' | 'QUIZ';

interface SelectedResource {
  uid: number;
  id: number;
  title: string;
  resourceType: ResourceType;
  category?: string;
}

interface FormValues {
  title: string;
  description?: string;
  deadline: Dayjs;
  assignee_ids: number[];
}

/**
 * TaskForm - Task creation/editing form
 * Uses predefined CSS classes from index.css
 */
export const TaskForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();

  const isEdit = !!id;
  const taskId = isEdit ? Number(id) : 0;
  const paramQuizId = Number(searchParams.get('quiz_id'));

  // State
  const [selectedResources, setSelectedResources] = useState<SelectedResource[]>([]);
  const [resourceSearch, setResourceSearch] = useState('');
  const [resourceType, setResourceType] = useState<'ALL' | ResourceType>('ALL');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userModalSearch, setUserModalSearch] = useState('');

  // API hooks
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { data: task, isLoading: taskLoading, isError: taskError } = useTaskDetail(taskId, {
    enabled: isEdit && Number.isFinite(taskId) && taskId > 0,
  });
  const { data: quizDetail } = useQuizDetail(paramQuizId);
  const knowledgeQuery = useTaskKnowledgeOptions({ search: resourceSearch, enabled: true });
  const quizQuery = useTaskQuizOptions({ search: resourceSearch, enabled: true });
  const { data: users } = useAssignableUsers();

  // Pre-select quiz from URL param
  useEffect(() => {
    if (quizDetail && paramQuizId && !isEdit) {
      const alreadyExists = selectedResources.some(r => r.resourceType === 'QUIZ' && r.id === paramQuizId);
      if (!alreadyExists) {
        setSelectedResources(prev => [...prev, {
          uid: Date.now(),
          id: quizDetail.id,
          title: quizDetail.title,
          resourceType: 'QUIZ',
          category: `${quizDetail.question_count || 0} questions`,
        }]);
      }
    }
  }, [quizDetail, paramQuizId, isEdit]);

  // Load existing task data for edit mode
  useEffect(() => {
    if (isEdit && task) {
      const knowledgeResources: SelectedResource[] = (task.knowledge_items || []).map((item, idx) => ({
        uid: Date.now() + Math.random() + idx,
        id: item.knowledge,
        title: item.knowledge_title || `Document ${item.knowledge}`,
        resourceType: 'DOCUMENT' as ResourceType,
        category: (item as any).knowledge_type_display || 'Document',
      }));

      const quizResources: SelectedResource[] = (task.quizzes || []).map((item, idx) => ({
        uid: Date.now() + Math.random() + idx + 1000,
        id: item.quiz,
        title: item.quiz_title || `Quiz ${item.quiz}`,
        resourceType: 'QUIZ' as ResourceType,
        category: `${(item as any).question_count || 0} questions`,
      }));

      setSelectedResources([...knowledgeResources, ...quizResources]);
      const assigneeIds = task.assignments?.map((item) => item.assignee) || [];
      setSelectedUserIds(assigneeIds);

      form.setFieldsValue({
        title: task.title,
        description: task.description || '',
        deadline: task.deadline ? dayjs(task.deadline) : undefined,
        assignee_ids: assigneeIds,
      });
    }
  }, [isEdit, task, form]);

  // Memoized data
  const knowledgeList = useMemo(() => {
    const data = knowledgeQuery.data;
    if (!data) return [];
    const items = (typeof data === 'object' && 'results' in data)
      ? (data as PaginatedResponse<KnowledgeListItem>).results
      : (Array.isArray(data) ? data : []);
    return (items || []).map((item: KnowledgeListItem) => ({
      id: item.id,
      title: item.title,
      category: item.line_type?.name || '未分类',
      resourceType: 'DOCUMENT' as ResourceType,
    }));
  }, [knowledgeQuery.data]);

  const quizList = useMemo(() => {
    const data = quizQuery.data;
    const paginatedData = data as PaginatedResponse<QuizListItem> | undefined;
    return (paginatedData?.results ?? []).map((quiz: QuizListItem) => ({
      id: quiz.id,
      title: quiz.title,
      category: `${quiz.question_count} questions`,
      resourceType: 'QUIZ' as ResourceType,
    }));
  }, [quizQuery.data]);

  const availableResources = useMemo(() => {
    const selectedIds = selectedResources.map(s => `${s.resourceType}-${s.id}`);
    const allResources = [...knowledgeList, ...quizList];
    return allResources.filter(r => {
      const isNotSelected = !selectedIds.includes(`${r.resourceType}-${r.id}`);
      const matchesSearch = r.title.toLowerCase().includes(resourceSearch.toLowerCase());
      const matchesType = resourceType === 'ALL' || r.resourceType === resourceType;
      return isNotSelected && matchesSearch && matchesType;
    });
  }, [resourceSearch, selectedResources, resourceType, knowledgeList, quizList]);

  const modalFilteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u =>
      u.username.toLowerCase().includes(userModalSearch.toLowerCase()) ||
      (u.employee_id && u.employee_id.toLowerCase().includes(userModalSearch.toLowerCase()))
    );
  }, [users, userModalSearch]);

  const selectedUserDetails = useMemo(() => {
    if (!users) return [];
    return users.filter(u => selectedUserIds.includes(u.id));
  }, [users, selectedUserIds]);

  // Handlers
  const addResource = (res: { id: number; title: string; resourceType: ResourceType; category?: string }) => {
    setSelectedResources([...selectedResources, { ...res, uid: Date.now() + Math.random() }]);
  };

  const moveResource = (idx: number, direction: 'up' | 'down') => {
    const newResources = [...selectedResources];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newResources.length) return;
    [newResources[idx], newResources[targetIdx]] = [newResources[targetIdx], newResources[idx]];
    setSelectedResources(newResources);
  };

  const removeResource = (idx: number) => {
    setSelectedResources(selectedResources.filter((_, i) => i !== idx));
  };

  const toggleUser = (userId: number) => {
    setSelectedUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const toggleAllUsers = (checked: boolean) => {
    if (checked) {
      const allIds = modalFilteredUsers.map(u => u.id);
      setSelectedUserIds(prev => Array.from(new Set([...prev, ...allIds])));
    } else {
      const currentIds = modalFilteredUsers.map(u => u.id);
      setSelectedUserIds(prev => prev.filter(id => !currentIds.includes(id)));
    }
  };

  const handleSubmit = async (values: FormValues) => {
    if (selectedResources.length === 0 || selectedUserIds.length === 0) {
      message.error('请选择资源和指派人员');
      return;
    }
    try {
      const payload: TaskCreateRequest = {
        title: values.title,
        description: values.description || undefined,
        deadline: values.deadline.toISOString(),
        knowledge_ids: selectedResources.filter(s => s.resourceType === 'DOCUMENT').map(s => s.id),
        quiz_ids: selectedResources.filter(s => s.resourceType === 'QUIZ').map(s => s.id),
        assignee_ids: selectedUserIds,
      };
      if (isEdit) {
        await updateTask.mutateAsync({ taskId, data: payload });
        message.success('任务更新成功');
      } else {
        await createTask.mutateAsync(payload);
        message.success('任务发布成功');
      }
      navigate('/tasks');
    } catch (error) {
      showApiError(error, 'Operation failed');
    }
  };

  // Computed values
  const isLoading = knowledgeQuery.isLoading || quizQuery.isLoading || taskLoading;
  const isSubmitting = createTask.isPending || updateTask.isPending;
  const canSubmit = selectedResources.length > 0 && selectedUserIds.length > 0;
  const isAllSelected = modalFilteredUsers.length > 0 && modalFilteredUsers.every(u => selectedUserIds.includes(u.id));
  const isIndeterminate = modalFilteredUsers.some(u => selectedUserIds.includes(u.id)) && !isAllSelected;

  if (taskError) {
    return (
      <div className="task-form-error">
        <Empty description="加载任务失败">
          <Button onClick={() => navigate('/tasks')}>返回</Button>
        </Empty>
      </div>
    );
  }

  return (
    <div className="task-form-container">
      {/* Header */}
      <div className="task-form-header">
        <div className="task-form-header-left">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/tasks')}
            className="task-form-back-btn"
          />
          <div className="task-form-header-divider" />
          <h1 className="task-form-title">
            {isEdit ? '编辑任务' : '创建任务'}
          </h1>
        </div>
        <Button
          type="primary"
          icon={isSubmitting ? <LoadingOutlined /> : <SendOutlined />}
          loading={isSubmitting}
          disabled={!canSubmit}
          onClick={() => form.submit()}
          size="large"
        >
          {isEdit ? '保存' : '发布任务'}
        </Button>
      </div>

      {/* Body - Three columns */}
      <Form form={form} layout="vertical" onFinish={handleSubmit} className="task-form-body">
        {/* Left Sidebar - Resource Library */}
        <div className="task-form-sidebar task-form-sidebar-left">
          <div className="task-form-section-header">
            <AppstoreOutlined />
            资源库
          </div>

          <div className="task-form-search-box">
            <Input
              placeholder="搜索文档/测验..."
              prefix={<SearchOutlined />}
              value={resourceSearch}
              onChange={e => setResourceSearch(e.target.value)}
              allowClear
            />
          </div>

          <Segmented
            block
            value={resourceType}
            onChange={(val) => setResourceType(val as 'ALL' | ResourceType)}
            options={[
              { label: '全部', value: 'ALL' },
              { label: '文档', value: 'DOCUMENT' },
              { label: '测验', value: 'QUIZ' },
            ]}
            style={{ marginBottom: 'var(--spacing-4)' }}
          />

          <div className="task-form-resource-list">
            {isLoading ? (
              <div className="task-form-loading"><Spin /></div>
            ) : availableResources.length === 0 ? (
              <Empty description="暂无资源" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              availableResources.map(res => (
                <div
                  key={`${res.resourceType}-${res.id}`}
                  className="task-form-resource-item"
                  onClick={() => addResource(res)}
                >
                  <div
                    className="task-form-resource-icon"
                    style={{
                      background: res.resourceType === 'DOCUMENT' ? 'var(--color-success-50)' : 'var(--color-primary-50)',
                      color: res.resourceType === 'DOCUMENT' ? 'var(--color-success-500)' : 'var(--color-primary-500)',
                    }}
                  >
                    {res.resourceType === 'DOCUMENT' ? <BookOutlined /> : <FileTextOutlined />}
                  </div>
                  <div className="task-form-resource-info">
                    <div className="task-form-resource-title">{res.title}</div>
                    <div className="task-form-resource-category">{res.category}</div>
                  </div>
                  <PlusOutlined style={{ color: 'var(--color-gray-400)' }} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center - Task Pipeline */}
        <div className="task-form-main">
          <div className="task-form-section-header">
            <BookOutlined />
            任务流程
          </div>

          <div className="task-form-pipeline">
            {selectedResources.length === 0 ? (
              <div className="task-form-pipeline-empty">
                <Empty
                  image={<AppstoreOutlined style={{ fontSize: 64, color: 'var(--color-gray-300)' }} />}
                  description="从左侧资源库点击添加到任务流程"
                />
              </div>
            ) : (
              <div className="task-form-pipeline-list">
                {selectedResources.length > 1 && <div className="task-form-pipeline-line" />}
                {selectedResources.map((item, idx) => (
                  <div key={item.uid} className="task-form-pipeline-item animate-fadeInUp">
                    <div className="task-form-pipeline-node">
                      <div
                        className="task-form-pipeline-node-circle"
                        style={{
                          background: item.resourceType === 'DOCUMENT'
                            ? 'var(--color-success-500)'
                            : 'var(--color-primary-500)',
                        }}
                      >
                        {item.resourceType === 'DOCUMENT' ? <BookOutlined /> : <FileTextOutlined />}
                      </div>
                    </div>
                    <div className="task-form-pipeline-card">
                      <div className="task-form-pipeline-card-content">
                        <Tag color={item.resourceType === 'DOCUMENT' ? 'green' : 'blue'}>
                          步骤 {idx + 1}
                        </Tag>
                        <div className="task-form-pipeline-card-title">{item.title}</div>
                      </div>
                      <div className="task-form-pipeline-card-actions">
                        <Button
                          type="text"
                          size="small"
                          icon={<UpOutlined />}
                          disabled={idx === 0}
                          onClick={() => moveResource(idx, 'up')}
                        />
                        <Button
                          type="text"
                          size="small"
                          icon={<DownOutlined />}
                          disabled={idx === selectedResources.length - 1}
                          onClick={() => moveResource(idx, 'down')}
                        />
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeResource(idx)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Configuration */}
        <div className="task-form-sidebar task-form-sidebar-right">
          <div className="task-form-section-header">
            <FileTextOutlined />
            配置
          </div>

          <div className="task-form-meta-section">
            <Form.Item
              label="任务标题"
              name="title"
              rules={[{ required: true, message: '必填' }]}
            >
              <Input placeholder="输入任务标题" />
            </Form.Item>

            <Form.Item
              label="截止时间"
              name="deadline"
              rules={[{ required: true, message: '必填' }]}
            >
              <DatePicker
                showTime
                placeholder="选择截止时间"
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item label="任务描述（可选）" name="description">
              <TextArea placeholder="添加任务描述..." rows={3} />
            </Form.Item>
          </div>

          <div className="task-form-section-header">
            <UserAddOutlined />
            指派人员
            <Tag style={{ marginLeft: 'auto' }}>已选 {selectedUserIds.length} 人</Tag>
          </div>

          <Button
            block
            icon={<PlusOutlined />}
            onClick={() => setIsUserModalOpen(true)}
            style={{ marginBottom: 'var(--spacing-4)' }}
          >
            选择人员
          </Button>

          <div className="task-form-selected-users">
            {selectedUserDetails.length === 0 ? (
              <div className="task-form-no-users">
                暂未选择人员
              </div>
            ) : (
              selectedUserDetails.slice(0, 8).map(u => (
                <div key={u.id} className="task-form-selected-user">
                  <Avatar size="small" style={{ background: 'var(--color-primary-500)' }}>
                    {u.username[0]}
                  </Avatar>
                  <div className="task-form-user-info">
                    <div className="task-form-user-name">{u.username}</div>
                    <div className="task-form-user-id">{u.employee_id}</div>
                  </div>
                </div>
              ))
            )}
            {selectedUserDetails.length > 8 && (
              <div className="task-form-no-users">
                还有 {selectedUserDetails.length - 8} 人
              </div>
            )}
          </div>
        </div>
      </Form>

      {/* User Selection Modal */}
      <Modal
        title="选择指派人员"
        open={isUserModalOpen}
        onCancel={() => setIsUserModalOpen(false)}
        footer={[
          <div key="footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-gray-500)' }}>
              已选择 {selectedUserIds.length} 人
            </span>
            <Button type="primary" onClick={() => setIsUserModalOpen(false)}>
              完成
            </Button>
          </div>
        ]}
        width={560}
        centered
      >
        <div style={{ marginBottom: 'var(--spacing-4)' }}>
          <Input
            placeholder="搜索姓名或工号..."
            prefix={<SearchOutlined />}
            value={userModalSearch}
            onChange={e => setUserModalSearch(e.target.value)}
            allowClear
          />
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 'var(--spacing-3)',
          paddingBottom: 'var(--spacing-3)',
          borderBottom: '1px solid var(--color-gray-200)'
        }}>
          <Checkbox
            checked={isAllSelected}
            indeterminate={isIndeterminate}
            onChange={e => toggleAllUsers(e.target.checked)}
          >
            全选
          </Checkbox>
          <Button type="link" size="small" onClick={() => setSelectedUserIds([])} danger>
            清空
          </Button>
        </div>

        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          <List
            dataSource={modalFilteredUsers}
            renderItem={user => {
              const checked = selectedUserIds.includes(user.id);
              return (
                <List.Item
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  style={{
                    cursor: 'pointer',
                    background: checked ? 'var(--color-primary-50)' : 'transparent',
                    padding: 'var(--spacing-3)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--spacing-1)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', width: '100%' }}>
                    <Checkbox checked={checked} />
                    <Avatar style={{ background: checked ? 'var(--color-primary-500)' : 'var(--color-gray-300)' }}>
                      {user.username[0]}
                    </Avatar>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, color: 'var(--color-gray-800)' }}>{user.username}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)' }}>
                        {user.employee_id} | {user.department?.name || '无部门'}
                      </div>
                    </div>
                    {checked && <CheckOutlined style={{ color: 'var(--color-primary-500)' }} />}
                  </div>
                </List.Item>
              );
            }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default TaskForm;
