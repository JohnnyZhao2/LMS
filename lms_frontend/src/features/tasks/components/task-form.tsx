import { useState, useEffect, useMemo, useRef } from 'react';
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
  ClipboardList,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { MicroLabel } from '@/components/common/micro-label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui/date-picker';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useQuizDetail } from '@/features/quiz-center/quizzes/api/get-quizzes';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { cn } from '@/lib/utils';
import { showApiError } from '@/utils/error-handler';
import type { KnowledgeListItem, PaginatedResponse, QuizListItem } from '@/types/api';
import { useCreateTask, type TaskCreateRequest } from '../api/create-task';
import { useAssignableUsers } from '../api/get-assignable-users';
import { useTaskDetail } from '../api/get-task-detail';
import { useTaskKnowledgeOptions, useTaskQuizOptions } from '../api/get-task-resources';
import { useUpdateTask } from '../api/update-task';

type ResourceType = 'DOCUMENT' | 'QUIZ';

interface ResourceItem {
  id: number;
  resource_uuid: string;
  is_current: boolean;
  title: string;
  resourceType: ResourceType;
  category?: string;
  quizType?: 'EXAM' | 'PRACTICE';
}

interface SelectedResource extends ResourceItem {
  uid: number;
}

const getPaginatedResults = <T,>(data?: PaginatedResponse<T> | T[]): T[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.results;
};

/**
 * TaskForm - Task creation/editing form using ShadCN UI
 */
export const TaskForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { roleNavigate } = useRoleNavigate();

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
  const [originalAssigneeIds, setOriginalAssigneeIds] = useState<number[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userModalSearch, setUserModalSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 7;

  // API hooks
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { data: task, isLoading: taskLoading, isError: taskError } = useTaskDetail(taskId, {
    enabled: isEdit && Number.isFinite(taskId) && taskId > 0,
  });
  const { data: quizDetail } = useQuizDetail(paramQuizId);
  const knowledgeQuery = useTaskKnowledgeOptions({
    search: resourceSearch,
    page: 1, // 始终获取第一页的大量数据，由前端分页
    page_size: 100,
    enabled: resourceType === 'ALL' || resourceType === 'DOCUMENT'
  });
  const quizQuery = useTaskQuizOptions({
    search: resourceSearch,
    page: 1,
    page_size: 100,
    enabled: resourceType === 'ALL' || resourceType === 'QUIZ'
  });
  const { data: users } = useAssignableUsers();

  // Disabled state logic
  const hasProgress = task?.has_progress || false;
  const resourcesDisabled = isEdit && hasProgress;
  const canRemoveAssignee = !(isEdit && hasProgress);

  // Initialization logic for edit mode or URL params
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;

    const initData = async () => {
      if (isEdit && task) {
        setTitle(task.title);
        setDescription(task.description || '');
        setDeadline(task.deadline ? new Date(task.deadline) : undefined);

        const knowledgeResources: SelectedResource[] = (task.knowledge_items || []).map((item, idx) => ({
          uid: Date.now() + Math.random() + idx,
          id: item.knowledge,
          resource_uuid: item.resource_uuid,
          is_current: item.is_current,
          title: item.knowledge_title || `文档 ${item.knowledge}`,
          resourceType: 'DOCUMENT' as ResourceType,
          category: (item as { knowledge_type_display?: string }).knowledge_type_display || '文档',
        }));

        const quizResources: SelectedResource[] = (task.quizzes || []).map((item, idx) => ({
          uid: Date.now() + Math.random() + idx + 1000,
          id: item.quiz,
          resource_uuid: item.resource_uuid,
          is_current: item.is_current,
          title: item.quiz_title || `试卷 ${item.quiz}`,
          resourceType: 'QUIZ' as ResourceType,
          category: `${(item as { question_count?: number }).question_count || 0} 个题目`,
        }));

        setSelectedResources([...knowledgeResources, ...quizResources]);
        const assigneeIds = task.assignments?.map(item => item.assignee) || [];
        setSelectedUserIds(assigneeIds);
        setOriginalAssigneeIds(assigneeIds);
        isInitialized.current = true;
      } else if (!isEdit && quizDetail && paramQuizId) {
        setSelectedResources([{
          uid: Date.now(),
          id: quizDetail.id,
          resource_uuid: quizDetail.resource_uuid,
          is_current: quizDetail.is_current,
          title: quizDetail.title,
          resourceType: 'QUIZ',
          category: `${quizDetail.question_count || 0} 个题目`,
        }]);
        isInitialized.current = true;
      }
    };

    initData();
  }, [isEdit, task, quizDetail, paramQuizId]);

  const filteredResources = useMemo(() => {
    const kItems = getPaginatedResults<KnowledgeListItem>(knowledgeQuery.data);
    const qItems = getPaginatedResults<QuizListItem>(quizQuery.data);

    const mappedK: ResourceItem[] = kItems.map((item) => ({
      id: item.id,
      resource_uuid: item.resource_uuid,
      is_current: item.is_current,
      title: item.title,
      category: item.line_type?.name || '未分类',
      resourceType: 'DOCUMENT',
    }));

    const mappedQ: ResourceItem[] = qItems.map((quiz) => ({
      id: quiz.id,
      resource_uuid: quiz.resource_uuid,
      is_current: quiz.is_current,
      title: quiz.title,
      category: `${quiz.question_count} 个题目`,
      resourceType: 'QUIZ',
      quizType: quiz.quiz_type,
    }));

    const combined = resourceType === 'DOCUMENT'
      ? mappedK
      : resourceType === 'QUIZ'
        ? mappedQ
        : [...mappedK, ...mappedQ];

    const selectedUuids = selectedResources.map(s => `${s.resourceType}-${s.resource_uuid}`);
    return combined.filter(r => !selectedUuids.includes(`${r.resourceType}-${r.resource_uuid}`));
  }, [knowledgeQuery.data, quizQuery.data, resourceType, selectedResources]);

  const totalCount = filteredResources.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const availableResources = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredResources.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredResources, PAGE_SIZE, safeCurrentPage]);

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
  const addResource = (res: ResourceItem) => {
    if (resourcesDisabled) return;
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
    if (resourcesDisabled) return;
    setSelectedResources(selectedResources.filter((_, i) => i !== idx));
  };

  const upgradeResource = (idx: number) => {
    if (resourcesDisabled) return;
    const item = selectedResources[idx];
    if (!item) return;
    
    // 从资源列表中找到该 resource_uuid 的最新版本
    const kItems = getPaginatedResults<KnowledgeListItem>(knowledgeQuery.data);
    const qItems = getPaginatedResults<QuizListItem>(quizQuery.data);

    if (item.resourceType === 'DOCUMENT') {
      const latestResource = kItems.find((k) => k.resource_uuid === item.resource_uuid);
      if (!latestResource) {
        toast.error('未找到最新版本');
        return;
      }
      setSelectedResources(prev => prev.map((r, i) => {
        if (i !== idx) return r;
        return {
          ...r,
          id: latestResource.id,
          is_current: latestResource.is_current,
          title: latestResource.title,
          category: latestResource.line_type?.name || '未分类',
        };
      }));
    } else {
      const latestResource = qItems.find((q) => q.resource_uuid === item.resource_uuid);
      if (!latestResource) {
        toast.error('未找到最新版本');
        return;
      }
      setSelectedResources(prev => prev.map((r, i) => {
        if (i !== idx) return r;
        return {
          ...r,
          id: latestResource.id,
          is_current: latestResource.is_current,
          title: latestResource.title,
          category: `${latestResource.question_count} 个题目`,
          quizType: latestResource.quiz_type,
        };
      }));
    }
    toast.success('已升级到最新版本');
  };

  const toggleUser = (userId: number) => {
    const isRemoving = selectedUserIds.includes(userId);
    // Allow removing if: no restrictions OR user is newly added (not in original list)
    const canRemove = canRemoveAssignee || !originalAssigneeIds.includes(userId);
    if (isRemoving && !canRemove) return;
    setSelectedUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const toggleAllUsers = (checked: boolean) => {
    if (checked) {
      const allIds = modalFilteredUsers.map(u => u.id);
      setSelectedUserIds(prev => Array.from(new Set([...prev, ...allIds])));
    } else {
      const currentIds = modalFilteredUsers.map(u => u.id);
      if (canRemoveAssignee) {
        // No restrictions: remove all current modal users
        setSelectedUserIds(prev => prev.filter(id => !currentIds.includes(id)));
      } else {
        // Has restrictions: only remove newly added users (not in original list)
        setSelectedUserIds(prev => prev.filter(id => !currentIds.includes(id) || originalAssigneeIds.includes(id)));
      }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedResources((items) => {
        const oldIndex = items.findIndex((item) => item.uid === active.id);
        const newIndex = items.findIndex((item) => item.uid === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
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
        ...(resourcesDisabled ? {} : {
          knowledge_ids: selectedResources.filter(s => s.resourceType === 'DOCUMENT').map(s => s.id),
          quiz_ids: selectedResources.filter(s => s.resourceType === 'QUIZ').map(s => s.id),
        }),
        assignee_ids: selectedUserIds,
      };
      if (isEdit) {
        await updateTask.mutateAsync({ taskId, data: payload });
        toast.success('任务更新成功');
      } else {
        await createTask.mutateAsync(payload);
        toast.success('任务发布成功');
      }
      roleNavigate('tasks');
    } catch (error) {
      showApiError(error, '操作失败');
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
        <FileText className="w-12 h-12 text-text-muted mb-4" />
        <span className="text-text-muted mb-4">加载任务失败</span>
        <Button onClick={() => roleNavigate('tasks')}>返回</Button>
      </div>
    );
  }


  return (
    <div className="flex flex-col min-h-screen bg-muted/50">
      {/* Header */}
      <div className="flex items-center h-16 px-6 bg-background border-b border-border shrink-0 gap-4">
        <div className="flex items-center gap-4 shrink-0">
          <Button
            variant="ghost"
            onClick={() => roleNavigate('tasks')}
            className="flex items-center gap-2.5 px-3 h-10 text-text-muted hover:text-primary-500 hover:bg-primary-50 transition-all group rounded-lg soft-press"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm font-semibold">返回列表</span>
          </Button>
          <div className="w-px h-5 bg-muted" />
        </div>

        <div className="flex-1 min-w-0">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入任务标题..."
            className="text-lg font-semibold h-10 border border-border bg-background rounded-lg px-4  hover:border-border focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all duration-200"
          />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isEdit && task && (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span>{task.updated_by_name || task.created_by_name}</span>
              <span>·</span>
              <span>{new Date(task.updated_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="h-10 px-6 font-semibold soft-press"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {isEdit ? '保存修改' : '发布任务'}
          </Button>
        </div>
      </div>

      {/* Body - Three columns with fixed baseline height (Header:54 + Search:77 + Filter:52 + List:580 + Pagination:65 = 828px) */}
      <div className="flex bg-background h-[828px] border-b border-border  overflow-hidden shrink-0">
        {/* Left Sidebar - Resource Library */}
        <div className="w-80 flex flex-col bg-background border-r border-border shrink-0 h-full">
          <div className="flex items-center gap-2 px-6 py-4 text-sm font-bold text-foreground border-b border-border">
            <LayoutGrid className="w-4 h-4 text-primary-500" />
            资源库
          </div>

          <div className="px-6 py-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary-500 transition-colors" />
              <Input
                placeholder="搜索文档/测验..."
                className="pl-9 h-11 bg-muted border-transparent focus:bg-background focus:border-primary-100 transition-all rounded-xl"
                value={resourceSearch}
                onChange={e => {
                  setResourceSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          <div className="flex gap-1 px-6 mb-4">
            {(['ALL', 'DOCUMENT', 'QUIZ'] as const).map((type) => (
              <Button
                key={type}
                variant={resourceType === type ? 'default' : 'secondary'}
                size="sm"
                className={cn(
                  "flex-1 h-9 rounded-lg transition-all text-xs font-semibold",
                  resourceType === type
                    ? ""
                    : "bg-muted border-transparent hover:bg-muted text-text-muted"
                )}
                onClick={() => {
                  setResourceType(type);
                  setCurrentPage(1);
                }}
              >
                {type === 'ALL' ? '全部' : type === 'DOCUMENT' ? '文档' : '试卷'}
              </Button>
            ))}
          </div>

          {resourcesDisabled && (
            <div className="px-6 mb-4">
              <Alert variant="warning">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  任务已有学员开始学习，无法修改资源（知识文档和试卷）
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className="px-6 pb-2 shrink-0">
            <div className="space-y-3 h-[580px] overflow-hidden">
              {isLoading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="h-[72px] rounded-xl bg-muted/50 border border-border flex items-center px-4 gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-muted rounded w-3/4" />
                      <div className="h-2 bg-muted/50 rounded w-1/2" />
                    </div>
                  </div>
                ))
              ) : availableResources.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-text-muted">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Search className="w-6 h-6 text-text-muted" />
                  </div>
                  <span className="text-sm">暂无匹配资源</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableResources.map(res => (
                    <div
                      key={`${res.resourceType}-${res.id}-${res.title}`}
                      className={`group flex items-center gap-3 p-3 h-[72px] rounded-xl bg-background border border-border transition-all ${
                        resourcesDisabled
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-pointer hover:border-primary-300 hover:-translate-y-0.5 animate-fadeIn'
                      }`}
                      onClick={() => addResource(res)}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                          res.resourceType === 'DOCUMENT'
                            ? 'bg-secondary-50 text-secondary'
                            : res.quizType === 'EXAM'
                              ? 'bg-destructive-50 text-destructive'
                              : 'bg-primary-50 text-primary'
                        )}
                      >
                        {res.resourceType === 'DOCUMENT' ? <BookOpen className="w-5 h-5" /> : <ClipboardList className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-foreground truncate mb-1">{res.title}</div>
                        <div className="text-[11px] text-text-muted flex items-center gap-2 font-semibold">
                          <span className={res.resourceType === 'DOCUMENT' ? 'text-secondary-600' : res.quizType === 'EXAM' ? 'text-destructive-500' : 'text-primary-500'}>
                            {res.resourceType === 'DOCUMENT' ? '文档' : res.quizType === 'EXAM' ? '考试' : '练习'}
                          </span>
                          <span className="w-0.5 h-0.5 rounded-full bg-muted" />
                          <span className="truncate">{res.category}</span>
                        </div>
                      </div>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center bg-muted text-text-muted opacity-0 group-hover:opacity-100 transition-all hover:bg-primary-500 hover:text-white">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 bg-background border-t border-border flex items-center justify-between shrink-0">
            <div className="text-[11px] text-text-muted font-bold tracking-tight">
              第 {safeCurrentPage} 页 <span className="text-border mx-1">/</span> 共 {totalPages} 页
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-muted soft-press"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-muted soft-press"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Center - Task Pipeline */}
        <div className="flex-1 flex flex-col bg-muted/50 min-w-0">
          <div className="flex items-center gap-2 px-6 py-4 text-sm font-bold text-foreground bg-background border-b border-border">
            <Send className="w-4 h-4 text-primary-500 -rotate-45" />
            任务流程
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {selectedResources.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto text-center">
                <div className="w-24 h-24 rounded-[2rem] bg-background   flex items-center justify-center mb-8 animate-fadeInUp">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary-100 blur-xl opacity-50 scale-150" />
                    <Send className="w-10 h-10 text-primary-500 relative -rotate-45" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3 tracking-tight">开启你的学习任务</h3>
                <p className="text-sm text-text-muted leading-relaxed font-medium">
                  从左侧资源库中挑选精彩内容，通过拖动确定步骤先后，为学习者打造完美的知识闭环。
                </p>
                <div className="mt-10 flex flex-col items-center gap-2">
                  <div className="px-4 py-2 bg-primary-50 rounded-full border border-primary-100">
                    <span className="text-primary-600 text-xs font-bold">点击左侧资源开始</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative w-full max-w-[480px] mx-auto pl-12">
                {selectedResources.length > 1 && (
                  <div
                    className="absolute left-[17px] top-[18px] w-0.5 bg-muted"
                    style={{ height: `calc(100% - 36px)` }}
                  />
                )}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={selectedResources.map(r => r.uid)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {selectedResources.map((item, idx) => (
                        <SortableItem
                          key={item.uid}
                          item={item}
                          idx={idx}
                          moveResource={moveResource}
                          removeResource={removeResource}
                          upgradeResource={upgradeResource}
                          totalResources={selectedResources.length}
                          disabled={resourcesDisabled}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Configuration */}
        <div className="w-[400px] flex flex-col bg-background border-l border-border shrink-0 h-full overflow-hidden font-sans">
          <div className="flex items-center gap-2 px-6 py-4 text-sm font-bold text-foreground border-b border-border shrink-0">
            <FileText className="w-4 h-4 text-primary-500" />
            任务配置
          </div>

          <div className="p-6 space-y-6 shrink-0 border-b border-border/50">
            <div className="space-y-3">
              <MicroLabel icon={<FileText className="w-3.5 h-3.5" />} asLabel>
                任务标题
              </MicroLabel>
              <Input
                placeholder="请输入标题..."
                className="h-12 bg-muted/50 border-border/50 focus:bg-background focus:border-primary-500 focus:ring-0 transition-all text-sm px-4 rounded-xl"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <MicroLabel icon={<Plus className="w-3.5 h-3.5" />} asLabel>
                截止时间
              </MicroLabel>
              <DatePicker
                date={deadline}
                onDateChange={setDeadline}
                placeholder="选择截止日期"
                className="h-12 bg-muted/50 border-border/50 hover:bg-background hover:border-primary-500 transition-all rounded-xl text-sm"
              />
            </div>

            <div className="space-y-3">
              <MicroLabel icon={<BookOpen className="w-3.5 h-3.5" />} asLabel>
                任务描述
              </MicroLabel>
              <textarea
                className="w-full p-4 bg-muted/50 border border-border/50 rounded-2xl text-xs resize-none focus:outline-none focus:bg-background focus:border-primary-500 transition-all min-h-[120px] leading-relaxed"
                placeholder="输入任务指引..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col flex-1 min-h-0 border-t border-border">
            <div className="flex items-center gap-2 px-6 py-4 text-sm font-bold text-foreground border-b border-border">
              <UserPlus className="w-4 h-4 text-primary-500" />
              指派人员
              <Badge variant="secondary" className="ml-auto bg-muted text-text-muted font-bold px-2 h-5 border-none">已选 {selectedUserIds.length}</Badge>
            </div>

            <div className="px-6 py-4">
              <Button
                variant="outline"
                className="w-full h-11 border-dashed border-2 hover:border-primary-500 hover:text-primary-500 hover:bg-primary-50 transition-all rounded-xl"
                onClick={() => setIsUserModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                添加参与人员
              </Button>
            </div>

            {!canRemoveAssignee && (
              <div className="px-6 mb-4">
                <Alert variant="warning">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    任务已有学员开始学习，无法移除已分配的学员
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <div className="px-6 flex-1 overflow-y-auto pb-6">
              {selectedUserDetails.length === 0 ? (
                <div className="text-text-muted text-xs text-center py-10 font-medium">
                  暂未选择人员
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedUserDetails.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50 border border-border group hover:bg-background hover:border-primary-100 transition-all">
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className="bg-primary-500 text-white text-[10px] font-bold">
                          {u.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-foreground truncate">{u.username}</div>
                        <div className="text-[10px] text-text-muted">{u.employee_id}</div>
                      </div>
                      {canRemoveAssignee && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive-400 hover:text-destructive-500 hover:bg-destructive-50"
                          onClick={() => toggleUser(u.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <Input
                placeholder="搜索姓名或工号..."
                className="pl-9"
                value={userModalSearch}
                onChange={e => setUserModalSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
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
              className="text-destructive-500 hover:text-destructive-600"
              onClick={() => setSelectedUserIds(canRemoveAssignee ? [] : originalAssigneeIds)}
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
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-primary-50' : 'hover:bg-muted'
                    }`}
                  onClick={() => toggleUser(user.id)}
                >
                  <Checkbox checked={checked} />
                  <Avatar className={checked ? 'bg-primary-500' : 'bg-muted'}>
                    <AvatarFallback className="text-white">
                      {user.username[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{user.username}</div>
                    <div className="text-xs text-text-muted">
                      {user.employee_id} | {user.department?.name || '无部门'}
                    </div>
                  </div>
                  {checked && <Check className="w-4 h-4 text-primary-500" />}
                </div>
              );
            })}
          </div>

          <DialogFooter className="flex items-center justify-between mt-4">
            <span className="text-sm text-text-muted">
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

interface SortableItemProps {
  item: SelectedResource;
  idx: number;
  moveResource: (idx: number, direction: 'up' | 'down') => void;
  removeResource: (idx: number) => void;
  upgradeResource?: (idx: number) => void;
  totalResources: number;
  disabled?: boolean;
}

const SortableItem: React.FC<SortableItemProps> = ({
  item,
  idx,
  moveResource,
  removeResource,
  upgradeResource,
  totalResources,
  disabled = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.uid });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex gap-4 animate-fadeInUp ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="absolute -left-12 top-0 flex flex-col items-center">
        <div
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110",
            item.resourceType === 'DOCUMENT'
              ? 'bg-secondary'
              : item.quizType === 'EXAM'
                ? 'bg-destructive'
                : 'bg-primary'
          )}
        >
          {item.resourceType === 'DOCUMENT' ? (
            <BookOpen className="w-4 h-4" />
          ) : (
            <ClipboardList className="w-4 h-4" />
          )}
        </div>
      </div>
      <div
        className={`flex-1 flex flex-col gap-2 p-4 bg-background border rounded-xl transition-all ${
          item.is_current === false
            ? 'border-warning-300 bg-warning-50/30'
            : item.quizType === 'EXAM'
              ? 'border-destructive-100 hover:border-destructive-200'
              : 'border-border hover:border-primary-300'
        }`}
      >
        {item.is_current === false && (
          <div className="flex items-center gap-2 text-xs text-warning-600">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>资源有新版本</span>
            {upgradeResource && !disabled && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-2 text-xs text-warning-700 hover:text-warning-800 hover:bg-warning-100"
                onClick={() => upgradeResource(idx)}
              >
                升级
              </Button>
            )}
          </div>
        )}
        <div className="flex items-center gap-3">
          <div
            {...(disabled ? {} : attributes)}
            {...(disabled ? {} : listeners)}
            className={disabled ? 'p-1 -ml-2 text-text-muted cursor-not-allowed' : 'cursor-grab active:cursor-grabbing p-1 -ml-2 text-text-muted hover:text-text-muted'}
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <Badge
              variant={item.resourceType === 'DOCUMENT' ? 'default' : 'secondary'}
              className={`mb-2 font-bold ${item.resourceType === 'DOCUMENT'
                ? 'bg-secondary-100 text-secondary-700 hover:bg-secondary-100'
                : item.quizType === 'EXAM'
                  ? 'bg-destructive-500 text-white hover:bg-destructive-500'
                  : 'bg-primary-100 text-primary-700 hover:bg-primary-100'
                }`}
            >
              步骤 {idx + 1} {item.quizType === 'EXAM' && '• 考试'}
            </Badge>
            <div className="text-base font-bold text-foreground truncate">{item.title}</div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={disabled || idx === 0}
              onClick={() => moveResource(idx, 'up')}
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={disabled || idx === totalResources - 1}
              onClick={() => moveResource(idx, 'down')}
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive-500 hover:text-destructive-600 hover:bg-destructive-50"
              disabled={disabled}
              onClick={() => removeResource(idx)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskForm;
