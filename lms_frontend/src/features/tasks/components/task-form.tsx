import { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  Plus,
  BookOpen,
  FileText,
  Trash2,
  ChevronUp,
  ChevronDown,
  Send,
  Loader2,
  LayoutGrid,
  UserPlus,
  Check,
} from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui/date-picker';

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

type ResourceType = 'DOCUMENT' | 'QUIZ';

interface SelectedResource {
  uid: number;
  id: number;
  title: string;
  resourceType: ResourceType;
  category?: string;
}

/**
 * TaskForm - Task creation/editing form using ShadCN UI
 */
export const TaskForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isEdit = !!id;
  const taskId = isEdit ? Number(id) : 0;
  const paramQuizId = Number(searchParams.get('quiz_id'));

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState<Date | undefined>();
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
  }, [quizDetail, paramQuizId, isEdit, selectedResources]);

  // Load existing task data for edit mode
  useEffect(() => {
    if (isEdit && task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setDeadline(task.deadline ? new Date(task.deadline) : undefined);

      const knowledgeResources: SelectedResource[] = (task.knowledge_items || []).map((item, idx) => ({
        uid: Date.now() + Math.random() + idx,
        id: item.knowledge,
        title: item.knowledge_title || `Document ${item.knowledge}`,
        resourceType: 'DOCUMENT' as ResourceType,
        category: (item as { knowledge_type_display?: string }).knowledge_type_display || 'Document',
      }));

      const quizResources: SelectedResource[] = (task.quizzes || []).map((item, idx) => ({
        uid: Date.now() + Math.random() + idx + 1000,
        id: item.quiz,
        title: item.quiz_title || `Quiz ${item.quiz}`,
        resourceType: 'QUIZ' as ResourceType,
        category: `${(item as { question_count?: number }).question_count || 0} questions`,
      }));

      setSelectedResources([...knowledgeResources, ...quizResources]);
      const assigneeIds = task.assignments?.map((item) => item.assignee) || [];
      setSelectedUserIds(assigneeIds);
    }
  }, [isEdit, task]);

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
    setSelectedResources(prev => [...prev, { ...res, uid: prev.length + Date.now() }]);
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

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('请输入任务标题');
      return;
    }
    if (!deadline) {
      toast.error('请选择截止时间');
      return;
    }
    if (selectedResources.length === 0 || selectedUserIds.length === 0) {
      toast.error('请选择资源和指派人员');
      return;
    }
    try {
      const payload: TaskCreateRequest = {
        title,
        description: description || undefined,
        deadline: deadline.toISOString(),
        knowledge_ids: selectedResources.filter(s => s.resourceType === 'DOCUMENT').map(s => s.id),
        quiz_ids: selectedResources.filter(s => s.resourceType === 'QUIZ').map(s => s.id),
        assignee_ids: selectedUserIds,
      };
      if (isEdit) {
        await updateTask.mutateAsync({ taskId, data: payload });
        toast.success('任务更新成功');
      } else {
        await createTask.mutateAsync(payload);
        toast.success('任务发布成功');
      }
      navigate('/tasks');
    } catch (error) {
      showApiError(error, 'Operation failed');
    }
  };

  // Computed values
  const isLoading = knowledgeQuery.isLoading || quizQuery.isLoading || taskLoading;
  const isSubmitting = createTask.isPending || updateTask.isPending;
  const canSubmit = title.trim() && deadline && selectedResources.length > 0 && selectedUserIds.length > 0;
  const isAllSelected = modalFilteredUsers.length > 0 && modalFilteredUsers.every(u => selectedUserIds.includes(u.id));

  if (taskError) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <FileText className="w-12 h-12 text-gray-300 mb-4" />
        <span className="text-gray-500 mb-4">加载任务失败</span>
        <Button onClick={() => navigate('/tasks')}>返回</Button>
      </div>
    );
  }


  return (
    <div className="flex flex-col min-h-[calc(100vh-var(--header-height))]">
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/tasks')}
            className="text-gray-600 hover:text-primary-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-px h-5 bg-gray-200" />
          <h1 className="text-lg font-semibold text-gray-900">
            {isEdit ? '编辑任务' : '创建任务'}
          </h1>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="h-10 px-5"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          {isEdit ? '保存' : '发布任务'}
        </Button>
      </div>

      {/* Body - Three columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Resource Library */}
        <div className="w-80 flex flex-col bg-white border-r border-gray-200 shrink-0">
          <div className="flex items-center gap-2 px-5 py-4 text-sm font-semibold text-gray-900">
            <LayoutGrid className="w-4 h-4 text-primary-500" />
            资源库
          </div>

          <div className="px-5 mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索文档/测验..."
                className="pl-9"
                value={resourceSearch}
                onChange={e => setResourceSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-1 px-5 mb-4">
            {(['ALL', 'DOCUMENT', 'QUIZ'] as const).map((type) => (
              <Button
                key={type}
                variant={resourceType === type ? 'default' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setResourceType(type)}
              >
                {type === 'ALL' ? '全部' : type === 'DOCUMENT' ? '文档' : '试卷'}
              </Button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-5">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : availableResources.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <FileText className="w-8 h-8 mb-2" />
                <span className="text-sm">暂无资源</span>
              </div>
            ) : (
              <div className="space-y-2">
                {availableResources.map(res => (
                  <div
                    key={`${res.resourceType}-${res.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 cursor-pointer transition-all hover:bg-white hover:shadow-sm"
                    onClick={() => addResource(res)}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: res.resourceType === 'DOCUMENT' ? '#D1FAE5' : 'var(--color-primary-50)',
                        color: res.resourceType === 'DOCUMENT' ? '#10B981' : 'var(--color-primary-500)',
                      }}
                    >
                      {res.resourceType === 'DOCUMENT' ? <BookOpen className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{res.title}</div>
                      <div className="text-xs text-gray-500">{res.category}</div>
                    </div>
                    <Plus className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center - Task Pipeline */}
        <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
          <div className="flex items-center gap-2 px-6 py-4 text-sm font-semibold text-gray-900 bg-white border-b border-gray-200">
            <BookOpen className="w-4 h-4 text-primary-500" />
            任务流程
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {selectedResources.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <LayoutGrid className="w-16 h-16 mb-4 text-gray-300" />
                <span className="text-base">从左侧资源库点击添加到任务流程</span>
              </div>
            ) : (
              <div className="relative w-full max-w-[480px] mx-auto pl-12">
                {selectedResources.length > 1 && (
                  <div
                    className="absolute left-[17px] top-[18px] w-0.5 bg-gray-200"
                    style={{ height: `calc(100% - 36px)` }}
                  />
                )}
                <div className="space-y-4">
                  {selectedResources.map((item, idx) => (
                    <div key={item.uid} className="relative flex gap-4 animate-fadeInUp">
                      <div className="absolute -left-12 top-0 flex flex-col items-center">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-md"
                          style={{
                            background: item.resourceType === 'DOCUMENT'
                              ? '#10B981'
                              : 'var(--color-primary-500)',
                          }}
                        >
                          {item.resourceType === 'DOCUMENT' ? <BookOpen className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>
                      </div>
                      <div className="flex-1 flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl transition-all hover:border-primary-300 hover:shadow-md">
                        <div className="flex-1 min-w-0">
                          <Badge
                            variant={item.resourceType === 'DOCUMENT' ? 'default' : 'secondary'}
                            className={`mb-2 ${item.resourceType === 'DOCUMENT' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-blue-100 text-blue-700 hover:bg-blue-100'}`}
                          >
                            步骤 {idx + 1}
                          </Badge>
                          <div className="text-base font-medium text-gray-900 truncate">{item.title}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={idx === 0}
                            onClick={() => moveResource(idx, 'up')}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={idx === selectedResources.length - 1}
                            onClick={() => moveResource(idx, 'down')}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => removeResource(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Configuration */}
        <div className="w-[400px] flex flex-col bg-white border-l border-gray-200 shrink-0 overflow-y-auto">
          <div className="flex items-center gap-2 px-5 py-4 text-sm font-semibold text-gray-900 border-b border-gray-200">
            <FileText className="w-4 h-4 text-primary-500" />
            配置
          </div>

          <div className="p-5 space-y-4 bg-white rounded-lg mx-5 mt-5 border border-gray-100">
            <div className="space-y-2">
              <Label>任务标题</Label>
              <Input
                placeholder="输入任务标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>截止时间</Label>
              <DatePicker
                date={deadline}
                onDateChange={setDeadline}
                placeholder="选择截止时间"
              />
            </div>

            <div className="space-y-2">
              <Label>任务描述（可选）</Label>
              <textarea
                className="w-full p-3 border border-gray-200 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                placeholder="添加任务描述..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 px-5 py-4 text-sm font-semibold text-gray-900 mt-4">
            <UserPlus className="w-4 h-4 text-primary-500" />
            指派人员
            <Badge variant="secondary" className="ml-auto">已选 {selectedUserIds.length} 人</Badge>
          </div>

          <div className="px-5 mb-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsUserModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              选择人员
            </Button>
          </div>

          <div className="px-5 pb-5 max-h-[200px] overflow-y-auto">
            {selectedUserDetails.length === 0 ? (
              <div className="text-gray-400 text-sm text-center py-4">
                暂未选择人员
              </div>
            ) : (
              <div className="space-y-2">
                {selectedUserDetails.slice(0, 8).map(u => (
                  <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary-500 text-white text-xs">
                        {u.username[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{u.username}</div>
                      <div className="text-xs text-gray-500">{u.employee_id}</div>
                    </div>
                  </div>
                ))}
                {selectedUserDetails.length > 8 && (
                  <div className="text-gray-400 text-sm text-center py-2">
                    还有 {selectedUserDetails.length - 8} 人
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Selection Modal */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>选择指派人员</DialogTitle>
          </DialogHeader>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索姓名或工号..."
                className="pl-9"
                value={userModalSearch}
                onChange={e => setUserModalSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={(checked: boolean) => toggleAllUsers(checked)}
              />
              <span className="text-sm">全选</span>
            </div>
            <Button
              variant="link"
              size="sm"
              className="text-red-500 hover:text-red-600"
              onClick={() => setSelectedUserIds([])}
            >
              清空
            </Button>
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-1">
            {modalFilteredUsers.map(user => {
              const checked = selectedUserIds.includes(user.id);
              return (
                <div
                  key={user.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-primary-50' : 'hover:bg-gray-50'
                    }`}
                  onClick={() => toggleUser(user.id)}
                >
                  <Checkbox checked={checked} />
                  <Avatar className={checked ? 'bg-primary-500' : 'bg-gray-300'}>
                    <AvatarFallback className="text-white">
                      {user.username[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">{user.username}</div>
                    <div className="text-xs text-gray-500">
                      {user.employee_id} | {user.department?.name || '无部门'}
                    </div>
                  </div>
                  {checked && <Check className="w-4 h-4 text-primary-500" />}
                </div>
              );
            })}
          </div>

          <DialogFooter className="flex items-center justify-between mt-4">
            <span className="text-sm text-gray-500">
              已选择 {selectedUserIds.length} 人
            </span>
            <Button onClick={() => setIsUserModalOpen(false)}>
              完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskForm;
