import {
  AlertCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutGrid,
  Plus,
} from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';

import { TASK_FORM_PANEL_CLASSNAME, TASK_FORM_PANEL_HEADER_CLASSNAME } from './task-form.constants';
import type { ResourceItem, ResourceType } from './task-form.types';

interface TaskResourceLibraryPanelProps {
  availableResources: ResourceItem[];
  isLoading: boolean;
  resourceSearch: string;
  onResourceSearchChange: (value: string) => void;
  resourceType: 'ALL' | ResourceType;
  onResourceTypeChange: (value: 'ALL' | ResourceType) => void;
  onResourceAdd: (resource: ResourceItem) => void;
  resourcesDisabled: boolean;
  totalPages: number;
  safeCurrentPage: number;
  onPageChange: (page: number) => void;
}

export function TaskResourceLibraryPanel({
  availableResources,
  isLoading,
  resourceSearch,
  onResourceSearchChange,
  resourceType,
  onResourceTypeChange,
  onResourceAdd,
  resourcesDisabled,
  totalPages,
  safeCurrentPage,
  onPageChange,
}: TaskResourceLibraryPanelProps) {
  return (
    <div className={TASK_FORM_PANEL_CLASSNAME}>
      <div className={TASK_FORM_PANEL_HEADER_CLASSNAME}>
        <LayoutGrid className="h-4 w-4 text-primary-500" />
        <span>资源库</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="space-y-4 px-5 py-4">
          <SearchInput
            placeholder="搜索文档/测验..."
            value={resourceSearch}
            onChange={onResourceSearchChange}
            inputClassName="border-transparent bg-muted"
          />

          <SegmentedControl
            value={resourceType}
            onChange={(value) => onResourceTypeChange(value as 'ALL' | ResourceType)}
            options={[
              { label: '全部', value: 'ALL' },
              { label: '文档', value: 'DOCUMENT' },
              { label: '试卷', value: 'QUIZ' },
            ]}
            size="sm"
            activeColor="white"
            className="w-full [&>div]:grid [&>div]:h-9 [&>div]:w-full [&>div]:grid-cols-3 [&_button]:h-full [&_button]:px-0"
          />

          {resourcesDisabled ? (
            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                任务已有学员开始学习，无法修改资源
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 px-5 pb-4">
          <div className="scrollbar-subtle h-full overflow-y-auto pr-1">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex h-[72px] items-center gap-3 rounded-xl border border-border bg-muted/70 px-4 animate-pulse"
                  >
                    <div className="h-10 w-10 rounded-xl bg-background" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 rounded bg-background" />
                      <div className="h-2 w-1/2 rounded bg-background" />
                    </div>
                  </div>
                ))}
              </div>
            ) : availableResources.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-text-muted">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">暂无匹配资源</span>
              </div>
            ) : (
              <div className="space-y-3">
                {availableResources.map((resource) => (
                  <button
                    key={`${resource.resourceType}-${resource.id}-${resource.title}`}
                    type="button"
                    className={cn(
                      'group flex h-[72px] w-full items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition-all',
                      resourcesDisabled
                        ? 'cursor-not-allowed opacity-50'
                        : 'cursor-pointer hover:-translate-y-0.5 hover:border-primary-300',
                    )}
                    onClick={() => {
                      if (!resourcesDisabled) {
                        onResourceAdd(resource);
                      }
                    }}
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105',
                        resource.resourceType === 'DOCUMENT'
                          ? 'bg-secondary-50 text-secondary'
                          : resource.quizType === 'EXAM'
                            ? 'bg-destructive-50 text-destructive'
                            : 'bg-primary-50 text-primary',
                      )}
                    >
                      {resource.resourceType === 'DOCUMENT' ? (
                        <BookOpen className="h-5 w-5" />
                      ) : (
                        <ClipboardList className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 truncate text-sm font-bold text-foreground">{resource.title}</div>
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-text-muted">
                        <span
                          className={
                            resource.resourceType === 'DOCUMENT'
                              ? 'text-secondary-600'
                              : resource.quizType === 'EXAM'
                                ? 'text-destructive-500'
                                : 'text-primary-500'
                          }
                        >
                          {resource.resourceType === 'DOCUMENT' ? '文档' : resource.quizType === 'EXAM' ? '考试' : '练习'}
                        </span>
                        <span className="h-0.5 w-0.5 rounded-full bg-border" />
                        <span className="truncate">{resource.category}</span>
                      </div>
                    </div>

                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-text-muted opacity-0 transition-all group-hover:opacity-100 hover:bg-primary-500 hover:text-white">
                      <Plus className="h-4 w-4" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          <div className="text-[11px] font-bold tracking-tight text-text-muted">
            第 {safeCurrentPage} 页 <span className="mx-1 text-border">/</span> 共 {totalPages} 页
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-muted"
              disabled={safeCurrentPage === 1}
              onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-muted"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, safeCurrentPage + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
