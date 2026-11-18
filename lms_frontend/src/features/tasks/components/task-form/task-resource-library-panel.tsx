import {
  BookOpen,
  FileCheck,
  Layers,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  QUIET_OUTLINE_FIELD_CLASSNAME,
  SUBTLE_SURFACE_HOVER_CLASSNAME,
} from '@/components/ui/interactive-styles';
import { SearchInput } from '@/components/ui/search-input';
import { cn } from '@/lib/utils';

import { TASK_FORM_SEGMENTED_CONTROL_CLASSNAME } from './task-form.constants';
import type { ResourceFilterType, ResourceItem, SelectedResource } from './task-form.types';

interface TaskResourceLibraryPanelProps {
  resourceTypeFilter: ResourceFilterType;
  onResourceTypeFilterChange: (value: ResourceFilterType) => void;
  availableResources: ResourceItem[];
  selectedResources: SelectedResource[];
  isLoading: boolean;
  resourceSearch: string;
  onResourceSearchChange: (value: string) => void;
  onResourceAdd: (resource: ResourceItem) => void;
  onResourceRemove: (uid: number) => void;
  onDone?: () => void;
  totalResourceCount: number;
  pageSize: number;
  safeCurrentPage: number;
  showPagination: boolean;
  onPageChange: (page: number) => void;
}

const FILTER_OPTIONS: Array<{ label: string; value: ResourceFilterType }> = [
  { label: '全部', value: 'ALL' },
  { label: '学习资料', value: 'DOCUMENT' },
  { label: '试卷', value: 'QUIZ' },
];

const EMPTY_COPY: Record<ResourceFilterType, string> = {
  ALL: '暂无匹配资源',
  DOCUMENT: '暂无匹配文档',
  QUIZ: '暂无匹配试卷',
};

interface ResourceOptionRowProps {
  resource: ResourceItem;
  onClick?: () => void;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

function ResourceOptionRow({
  resource,
  onClick,
  action,
  badge,
  className,
}: ResourceOptionRowProps) {
  const content = (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
            resource.resourceType === 'DOCUMENT'
              ? 'bg-secondary-50 text-secondary'
              : 'bg-primary-50 text-primary',
          )}
        >
          {resource.resourceType === 'DOCUMENT' ? (
            <BookOpen className="h-5 w-5" />
          ) : (
            <FileCheck className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold text-foreground">{resource.title}</span>
            {badge}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-medium text-text-muted">
            <span className="text-text-muted">
              {resource.resourceType === 'DOCUMENT' ? '文档' : '试卷'}
            </span>
            <span className="h-0.5 w-0.5 rounded-full bg-border" />
            <span className="truncate text-text-muted">{resource.category}</span>
          </div>
        </div>
      </div>

      {action ? <div className="flex shrink-0 items-center gap-1">{action}</div> : null}
    </>
  );

  const rowClassName = cn(
    'group flex h-[64px] w-full items-center gap-2.5 rounded-lg border border-border bg-background p-2.5 text-left',
    SUBTLE_SURFACE_HOVER_CLASSNAME,
    onClick && 'cursor-pointer transition-colors hover:border-primary/40 active:scale-[0.995]',
    className,
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`加入${resource.title}`}
        className={rowClassName}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={rowClassName}>
      {content}
    </div>
  );
}

export function TaskResourceLibraryPanel({
  resourceTypeFilter,
  onResourceTypeFilterChange,
  availableResources,
  selectedResources,
  isLoading,
  resourceSearch,
  onResourceSearchChange,
  onResourceAdd,
  onResourceRemove,
  onDone,
  totalResourceCount,
  pageSize,
  safeCurrentPage,
  showPagination,
  onPageChange,
}: TaskResourceLibraryPanelProps) {
  const selectedDocumentCount = selectedResources.filter((item) => item.resourceType === 'DOCUMENT').length;
  const selectedQuizCount = selectedResources.length - selectedDocumentCount;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 pr-11">
        <span className="text-[13px] font-semibold text-foreground">添加任务资源</span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
        {/* 左栏：可选资源库 */}
        <div className="flex min-h-0 flex-col">
          <div className="space-y-2.5 px-4 py-3">
            <SegmentedControl
              options={FILTER_OPTIONS}
              value={resourceTypeFilter}
              onChange={(value) => onResourceTypeFilterChange(value as ResourceFilterType)}
              size="sm"
              className={`${TASK_FORM_SEGMENTED_CONTROL_CLASSNAME} [&>div]:grid-cols-3`}
            />
            <SearchInput
              placeholder="搜索资料或试卷..."
              value={resourceSearch}
              onChange={onResourceSearchChange}
              inputClassName={cn(
                'h-9 rounded-lg text-[11px] placeholder:text-text-muted/50',
                QUIET_OUTLINE_FIELD_CLASSNAME,
              )}
            />
          </div>

          <div className="min-h-0 flex-1 pl-4 pr-0 pb-3">
            <ScrollContainer className="h-full overflow-y-auto pr-4">
              {isLoading ? (
                <div className="space-y-2.5">
                  {Array.from({ length: pageSize }).map((_, index) => (
                    <div
                      key={index}
                      className="flex h-[64px] items-center gap-3 rounded-lg border border-border bg-muted/70 px-3 animate-pulse"
                    >
                      <div className="h-9 w-9 rounded-md bg-background" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-3/4 rounded bg-background" />
                        <div className="h-2 w-1/2 rounded bg-background" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : availableResources.length === 0 ? (
                <div className="flex h-full min-h-[160px] flex-col items-center justify-center text-text-muted">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">{EMPTY_COPY[resourceTypeFilter]}</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {availableResources.map((resource) => (
                    <ResourceOptionRow
                      key={`${resource.resourceType}-${resource.id}-${resource.title}`}
                      resource={resource}
                      onClick={() => onResourceAdd(resource)}
                    />
                  ))}
                </div>
              )}
            </ScrollContainer>
          </div>

          {showPagination && totalResourceCount > pageSize ? (
            <div className="border-t border-border px-4 py-2.5">
              <Pagination
                current={safeCurrentPage}
                total={totalResourceCount}
                pageSize={pageSize}
                onChange={(page) => onPageChange(page)}
                variant="compact"
                className="text-[11px]"
              />
            </div>
          ) : null}
        </div>

        {/* 右栏：已选资源面板 */}
        <div className="flex min-h-0 flex-col bg-muted/20">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-foreground">已选资源</span>
              <Badge
                variant="secondary"
                className="h-5 border-none bg-background px-2 text-[11px] font-bold text-text-muted shadow-2xs"
              >
                {selectedResources.length}
              </Badge>
            </div>
            {selectedResources.length > 0 ? (
              <span className="text-[11px] font-medium text-text-muted">
                {selectedDocumentCount} 份资料 · {selectedQuizCount} 份试卷
              </span>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 pl-4 pr-0 py-3">
            <ScrollContainer className="h-full overflow-y-auto pr-4">
              {selectedResources.length === 0 ? (
                <div className="flex h-full min-h-[160px] flex-col items-center justify-center px-4 text-center text-text-muted">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-background shadow-2xs">
                    <Layers className="h-5 w-5 text-text-muted/70" />
                  </div>
                  <span className="text-sm font-medium text-foreground/80">暂无已选资源</span>
                  <span className="mt-1 text-[11px] text-text-muted">
                    点击左侧学习资料或试卷即可加入
                  </span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedResources.map((resource) => (
                    <ResourceOptionRow
                      key={resource.uid}
                      resource={resource}
                      badge={resource.resourceType === 'QUIZ' ? (
                        <Badge
                          variant="secondary"
                          className="h-4 shrink-0 border-none bg-muted px-1.5 text-[10px] font-medium text-text-muted"
                        >
                          {resource.quizType === 'EXAM' ? '考试' : '练习'}
                        </Badge>
                      ) : null}
                      action={(
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full text-text-muted hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`移除${resource.title}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            onResourceRemove(resource.uid);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    />
                  ))}
                </div>
              )}
            </ScrollContainer>
          </div>
        </div>
      </div>

      {onDone ? (
        <div className="flex items-center justify-end border-t border-border bg-background px-4 py-2.5">
          <Button size="sm" onClick={onDone}>
            完成
          </Button>
        </div>
      ) : null}
    </div>
  );
}
