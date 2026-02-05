import {
  ArrowLeft,
  Search,
  Plus,
  BookOpen,
  FileText,
  Trash2,
  Send,
  Loader2,
  LayoutGrid,
  UserPlus,
  ClipboardList,
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
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MicroLabel } from '@/components/common/micro-label';
import { DatePicker } from '@/components/ui/date-picker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

import { useTaskForm } from './use-task-form';
import { SortableResourceItem } from './sortable-resource-item';
import { UserSelectionModal } from './user-selection-modal';
import type { ResourceItem } from './task-form.types';

export const TaskForm: React.FC = () => {
  const {
    isEdit,
    task,
    taskError,
    title,
    setTitle,
    description,
    setDescription,
    deadline,
    setDeadline,
    selectedResources,
    resourceSearch,
    setResourceSearch,
    resourceType,
    setResourceType,
    selectedUserIds,
    isUserModalOpen,
    setIsUserModalOpen,
    userModalSearch,
    setUserModalSearch,
    setCurrentPage,
    availableResources,
    totalPages,
    safeCurrentPage,
    modalFilteredUsers,
    selectedUserDetails,
    isLoading,
    isSubmitting,
    canSubmit,
    resourcesDisabled,
    canRemoveAssignee,
    addResource,
    moveResource,
    removeResource,
    upgradeResource,
    toggleUser,
    toggleAllUsers,
    clearUsers,
    handleDragEnd,
    handleSubmit,
    roleNavigate,
  } = useTaskForm();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
            className="text-lg font-semibold h-10 border border-border bg-background rounded-lg px-4 hover:border-border focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all duration-200"
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

      {/* Body - Three columns */}
      <div className="flex bg-background h-[828px] border-b border-border overflow-hidden shrink-0">
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
                  {availableResources.map((res: ResourceItem) => (
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
                <div className="w-24 h-24 rounded-[2rem] bg-background flex items-center justify-center mb-8 animate-fadeInUp">
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
                        <SortableResourceItem
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
      <UserSelectionModal
        open={isUserModalOpen}
        onOpenChange={setIsUserModalOpen}
        users={modalFilteredUsers}
        selectedUserIds={selectedUserIds}
        searchValue={userModalSearch}
        onSearchChange={setUserModalSearch}
        onToggleUser={toggleUser}
        onToggleAll={toggleAllUsers}
        onClear={clearUsers}
        canRemoveAssignee={canRemoveAssignee}
      />
    </div>
  );
};

export default TaskForm;