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
  Divider,
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
  CalendarOutlined,
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
 * TaskForm - Premium Floating Concept (Refined)
 */
export const TaskForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();

  const isEdit = !!id;
  const taskId = isEdit ? Number(id) : 0;
  const paramQuizId = Number(searchParams.get('quiz_id'));

  const [selectedResources, setSelectedResources] = useState<SelectedResource[]>([]);
  const [resourceSearch, setResourceSearch] = useState('');
  const [resourceType, setResourceType] = useState<'ALL' | ResourceType>('ALL');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userModalSearch, setUserModalSearch] = useState('');

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { data: task, isLoading: taskLoading, isError: taskError } = useTaskDetail(taskId, {
    enabled: isEdit && Number.isFinite(taskId) && taskId > 0,
  });

  const { data: quizDetail } = useQuizDetail(paramQuizId);
  const knowledgeQuery = useTaskKnowledgeOptions({ search: resourceSearch, enabled: true });
  const quizQuery = useTaskQuizOptions({ search: resourceSearch, enabled: true });
  const { data: users } = useAssignableUsers();

  useEffect(() => {
    if (quizDetail && paramQuizId && !isEdit) {
      const alreadyExists = selectedResources.some(r => r.resourceType === 'QUIZ' && r.id === paramQuizId);
      if (!alreadyExists) {
        setSelectedResources(prev => [...prev, {
          uid: Date.now(),
          id: quizDetail.id,
          title: quizDetail.title,
          resourceType: 'QUIZ',
          category: `${quizDetail.question_count || 0}题`,
        }]);
      }
    }
  }, [quizDetail, paramQuizId, isEdit]);

  useEffect(() => {
    if (isEdit && task) {
      const knowledgeResources: SelectedResource[] = (task.knowledge_items || []).map((item, idx) => ({
        uid: Date.now() + Math.random() + idx,
        id: item.knowledge,
        title: item.knowledge_title || `知识文档 ${item.knowledge}`,
        resourceType: 'DOCUMENT' as ResourceType,
        category: (item as any).knowledge_type_display || '知识文档',
      }));

      const quizResources: SelectedResource[] = (task.quizzes || []).map((item, idx) => ({
        uid: Date.now() + Math.random() + idx + 1000,
        id: item.quiz,
        title: item.quiz_title || `试卷 ${item.quiz}`,
        resourceType: 'QUIZ' as ResourceType,
        category: `${(item as any).question_count || 0}题`,
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
      category: `${quiz.question_count}题`,
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
      const currentIdsAsString = modalFilteredUsers.map(u => u.id);
      setSelectedUserIds(prev => prev.filter(id => !currentIdsAsString.includes(id)));
    }
  };

  const handleSubmit = async (values: FormValues) => {
    if (selectedResources.length === 0 || selectedUserIds.length === 0) {
      message.error('请选择资源和学员');
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
        message.success('更新成功');
      } else {
        await createTask.mutateAsync(payload);
        message.success('创建成功');
      }
      navigate('/tasks');
    } catch (error) {
      showApiError(error, '操作失败');
    }
  };

  const isLoading = knowledgeQuery.isLoading || quizQuery.isLoading || taskLoading;
  const isSubmitting = createTask.isPending || updateTask.isPending;
  const canSubmit = selectedResources.length > 0 && selectedUserIds.length > 0;

  if (taskError) return <div style={{ padding: 100, textAlign: 'center' }}><Empty description="加载失败" /><Button onClick={() => navigate('/tasks')}>重试</Button></div>;

  const isAllSelected = modalFilteredUsers.length > 0 && modalFilteredUsers.every(u => selectedUserIds.includes(u.id));
  const isIndeterminate = modalFilteredUsers.some(u => selectedUserIds.includes(u.id)) && !isAllSelected;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 64px)',
      background: 'var(--color-gray-100)',
      overflow: 'hidden',
    }}>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* 
        =======================================================================
        FIXED TOP CONTROL BAR
        =======================================================================
      */}
      <div style={{
        height: 72,
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(243, 244, 246, 0.8)',
        backdropFilter: 'blur(20px)',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined style={{ fontSize: 20 }} />}
            onClick={() => navigate('/tasks')}
            style={{ width: 44, height: 44, borderRadius: 14, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          />
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--color-gray-800)' }}>
            {isEdit ? '编辑任务计划' : '创建新计划'}
          </div>
        </div>

        <Button
          type="primary"
          icon={isSubmitting ? <LoadingOutlined /> : <SendOutlined />}
          loading={isSubmitting}
          disabled={!canSubmit}
          onClick={() => form.submit()}
          size="large"
          style={{
            height: 48,
            padding: '0 32px',
            borderRadius: 16,
            fontWeight: 800,
            fontSize: 15,
            boxShadow: canSubmit ? '0 12px 24px rgba(99, 102, 241, 0.2)' : 'none',
            border: 'none',
            background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600))'
          }}
        >
          {isEdit ? '保存更改' : '立即发布任务'}
        </Button>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{
          flex: 1,
          display: 'flex',
          gap: 24,
          padding: '24px 32px 32px',
          overflow: 'hidden',
          alignItems: 'stretch'
        }}
      >
        {/* 
          =======================================================================
          LEFT SECTION: RESOURCES
          =======================================================================
        */}
        <div style={{
          width: 320,
          background: '#fff',
          borderRadius: 32,
          boxShadow: '0 20px 50px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.8)'
        }}>
          <div style={{ padding: '28px 24px' }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--color-gray-800)', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 4, height: 18, borderRadius: 2, background: 'var(--color-primary-500)' }} />
              资源库
            </div>
            <Input
              placeholder="搜索文档/试卷..."
              prefix={<SearchOutlined style={{ color: 'var(--color-gray-400)' }} />}
              value={resourceSearch}
              onChange={e => setResourceSearch(e.target.value)}
              variant="filled"
              style={{ borderRadius: 14, height: 44, border: 'none', background: 'var(--color-gray-50)' }}
            />
            <div style={{
              margin: '20px 0 0',
              padding: 4,
              background: 'var(--color-gray-50)',
              borderRadius: 14,
              display: 'flex'
            }}>
              {['ALL', 'DOCUMENT', 'QUIZ'].map((type) => (
                <div
                  key={type}
                  onClick={() => setResourceType(type as 'ALL' | ResourceType)}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '8px 0',
                    cursor: 'pointer',
                    borderRadius: 11,
                    fontSize: 13,
                    fontWeight: resourceType === type ? 800 : 500,
                    color: resourceType === type ? '#fff' : 'var(--color-gray-400)',
                    background: resourceType === type ? 'var(--color-primary-500)' : 'transparent',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  {type === 'ALL' ? '全部' : type === 'DOCUMENT' ? '文档' : '试卷'}
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 28px' }} className="hide-scrollbar">
            {isLoading ? <div style={{ padding: 40, textAlign: 'center' }}><Spin size="small" /></div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {availableResources.map(res => (
                  <div
                    key={`${res.resourceType}-${res.id}`}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 18,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                    className="hover:bg-gray-50 group"
                    onClick={() => addResource(res)}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: res.resourceType === 'DOCUMENT' ? 'var(--color-success-50)' : 'var(--color-primary-50)',
                      color: res.resourceType === 'DOCUMENT' ? 'var(--color-success-500)' : 'var(--color-primary-500)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
                    }}>
                      {res.resourceType === 'DOCUMENT' ? <BookOutlined /> : <FileTextOutlined />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-gray-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{res.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-gray-400)' }}>{res.category}</div>
                    </div>
                    <PlusOutlined style={{ color: 'var(--color-primary-500)', opacity: 0 }} className="group-hover:opacity-100" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 
          =======================================================================
          CENTER SECTION: PIPELINE (Matched Header)
          =======================================================================
        */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
          borderRadius: 32,
          boxShadow: '0 20px 50px rgba(0,0,0,0.03)',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.8)'
        }}>
          <div style={{ padding: '28px 32px' }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--color-gray-800)', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 4, height: 18, borderRadius: 2, background: 'var(--color-primary-500)' }} />
              任务流程
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px 32px', position: 'relative' }} className="hide-scrollbar">
            {selectedResources.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.1 }}>
                <AppstoreOutlined style={{ fontSize: 72, marginBottom: 20 }} />
                <div style={{ fontWeight: 900, fontSize: 18 }}>从左侧点击资源编排流程</div>
              </div>
            ) : (
              <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: 24, top: 0, bottom: 0, width: 2,
                  background: 'var(--color-gray-100)',
                  zIndex: 0
                }} />

                {selectedResources.map((item, idx) => (
                  <div key={item.uid} className="animate-fadeInUp" style={{
                    display: 'flex', gap: 24, marginBottom: 20, position: 'relative', zIndex: 1,
                  }}>
                    <div style={{
                      width: 50, height: 50, flexShrink: 0, borderRadius: '50%', background: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 900, color: 'var(--color-primary-500)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--color-gray-50)'
                    }}>{idx + 1}</div>

                    <div style={{
                      flex: 1, background: 'var(--color-gray-50)', borderRadius: 24, padding: '12px 20px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      border: '1px solid var(--color-gray-100)',
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    }} className="hover:border-primary-200 hover:bg-white hover:shadow-lg">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                          width: 42, height: 42, borderRadius: 12, fontSize: 20,
                          background: item.resourceType === 'DOCUMENT' ? 'var(--color-success-50)' : 'var(--color-primary-50)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: item.resourceType === 'DOCUMENT' ? 'var(--color-success-500)' : 'var(--color-primary-500)'
                        }}>{item.resourceType === 'DOCUMENT' ? <BookOutlined /> : <FileTextOutlined />}</div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-gray-800)' }}>{item.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-gray-400)', marginTop: 2 }}>{item.category}</div>
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        padding: '1px',
                        background: 'rgba(0,0,0,0.03)',
                        borderRadius: 8
                      }}>
                        <Button type="text" size="small" shape="circle" icon={<UpOutlined style={{ fontSize: 9 }} />} disabled={idx === 0} onClick={() => moveResource(idx, 'up')} style={{ color: 'var(--color-gray-400)', width: 22, height: 22 }} />
                        <Button type="text" size="small" shape="circle" icon={<DownOutlined style={{ fontSize: 9 }} />} disabled={idx === selectedResources.length - 1} onClick={() => moveResource(idx, 'down')} style={{ color: 'var(--color-gray-400)', width: 22, height: 22 }} />
                        <Divider type="vertical" style={{ margin: '0 2px', height: 12, borderColor: 'rgba(0,0,0,0.06)' }} />
                        <Button type="text" size="small" danger shape="circle" icon={<DeleteOutlined style={{ fontSize: 11 }} />} onClick={() => removeResource(idx)} style={{ width: 22, height: 22 }} />
                      </div>
                    </div>
                  </div>
                ))}

                <div style={{ marginLeft: 74, marginTop: 4 }}>
                  <div
                    style={{
                      height: 44,
                      borderRadius: 16,
                      background: 'rgba(0,0,0,0.02)',
                      border: '1.5px dashed var(--color-gray-200)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      color: 'var(--color-gray-300)',
                      fontSize: 14,
                      fontWeight: 700
                    }}
                  >
                    <PlusOutlined style={{ fontSize: 16 }} /> 点击左侧添加环节
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 
          =======================================================================
          RIGHT SECTION: CONFIGURATION
          =======================================================================
        */}
        <div style={{
          width: 360,
          background: '#fff',
          borderRadius: 32,
          boxShadow: '0 20px 50px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.8)'
        }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 32px' }} className="hide-scrollbar">
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--color-gray-800)', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 4, height: 18, borderRadius: 2, background: 'var(--color-primary-500)' }} />
              计划配置
            </div>

            <Form.Item label={<span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-gray-500)' }}>任务标题</span>} name="title" rules={[{ required: true, message: '必填' }]}>
              <Input
                placeholder="键入计划名称"
                style={{ borderRadius: 14, height: 46, border: 'none', background: 'var(--color-gray-50)', fontWeight: 650, padding: '0 16px' }}
              />
            </Form.Item>

            <Form.Item label={<span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-gray-500)' }}>截止日期</span>} name="deadline" rules={[{ required: true, message: '必填' }]}>
              <DatePicker
                showTime
                placeholder="设置完成时限"
                style={{ width: '100%', borderRadius: 14, height: 46, border: 'none', background: 'var(--color-gray-50)' }}
                suffixIcon={<CalendarOutlined style={{ color: 'var(--color-primary-400)' }} />}
              />
            </Form.Item>

            <Form.Item label={<span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-gray-500)' }}>说明 (选填)</span>} name="description">
              <TextArea
                placeholder="补充执行细节..."
                rows={3}
                style={{ borderRadius: 18, resize: 'none', border: 'none', background: 'var(--color-gray-50)', padding: '12px 16px' }}
              />
            </Form.Item>

            <div style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid var(--color-gray-50)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{ fontWeight: 900, fontSize: 15, color: 'var(--color-gray-800)' }}>目标学员</span>
                <Button
                  type="link"
                  size="small"
                  onClick={() => setIsUserModalOpen(true)}
                  style={{ fontWeight: 800, fontSize: 13 }}
                >
                  管理名单 ({selectedUserIds.length})
                </Button>
              </div>

              <div
                style={{
                  background: 'var(--color-gray-50)',
                  borderRadius: 24,
                  padding: '32px 20px',
                  border: '1px dashed var(--color-gray-200)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  minHeight: 140,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: '0.3s'
                }}
                onClick={() => setIsUserModalOpen(true)}
                className="hover:bg-white hover:border-primary-400"
              >
                {selectedUserDetails.length === 0 ? (
                  <div style={{ color: 'var(--color-gray-400)' }}>
                    <UserAddOutlined style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }} />
                    <div style={{ fontSize: 14, fontWeight: 700 }}>点此指派参与学员</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                    {selectedUserDetails.slice(0, 18).map(u => (
                      <Tooltip key={u.id} title={u.username}>
                        <Avatar size={34} style={{ backgroundColor: 'var(--color-primary-500)', border: '2px solid #fff' }}>{u.username[0]}</Avatar>
                      </Tooltip>
                    ))}
                    {selectedUserDetails.length > 18 && (
                      <Avatar size={34} style={{ background: 'var(--color-gray-200)', color: 'var(--color-gray-500)', fontSize: 11, fontWeight: 800 }}>
                        +{selectedUserDetails.length - 18}
                      </Avatar>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Form>

      <Modal
        title={<div style={{ fontWeight: 800, fontSize: 20 }}>选择参与学员</div>}
        open={isUserModalOpen}
        onCancel={() => setIsUserModalOpen(false)}
        footer={[
          <div key="f" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-gray-500)', fontWeight: 600 }}>已选 {selectedUserIds.length} 人</span>
            <Button type="primary" onClick={() => setIsUserModalOpen(false)} style={{ borderRadius: 12, height: 40, padding: '0 24px', fontWeight: 600 }}>完成选择</Button>
          </div>
        ]}
        width={620}
        centered
        styles={{ body: { padding: 0, height: 500, display: 'flex', flexDirection: 'column' } }}
        modalRender={(modal) => <div style={{ borderRadius: 32, overflow: 'hidden' }}>{modal}</div>}
      >
        <div style={{ padding: 20, background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-100)' }}>
          <Input placeholder="检索姓名、工号或部门..." prefix={<SearchOutlined />} value={userModalSearch} onChange={e => setUserModalSearch(e.target.value)} size="large" style={{ borderRadius: 16, border: 'none', boxShadow: 'var(--shadow-sm)' }} />
        </div>
        <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-gray-100)', background: '#fff' }}>
          <Checkbox checked={isAllSelected} indeterminate={isIndeterminate} onChange={e => toggleAllUsers(e.target.checked)}>全选当前结果</Checkbox>
          <Button type="link" size="small" onClick={() => setSelectedUserIds([])} danger style={{ fontWeight: 600 }}>一键清空</Button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
          <List
            dataSource={modalFilteredUsers}
            renderItem={user => {
              const checked = selectedUserIds.includes(user.id);
              return (
                <List.Item key={user.id} onClick={() => toggleUser(user.id)} style={{ padding: '14px 20px', cursor: 'pointer', background: checked ? 'var(--color-primary-50)' : 'transparent', transition: '0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>
                    <Checkbox checked={checked} />
                    <Avatar size={40} style={{ backgroundColor: checked ? 'var(--color-primary-500)' : 'var(--color-gray-200)', transition: '0.2s' }}>{user.username[0]}</Avatar>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, color: checked ? 'var(--color-primary-700)' : 'var(--color-gray-800)', fontSize: 15 }}>{user.username}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-gray-400)', marginTop: 2 }}>{user.employee_id} | {user.department?.name || '未划定部门'}</div>
                    </div>
                    {checked && <CheckOutlined style={{ color: 'var(--color-primary-500)', fontSize: 16 }} />}
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
