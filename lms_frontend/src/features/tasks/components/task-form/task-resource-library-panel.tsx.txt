import {
  BookOpen,
  FileCheck,
  LayoutGrid,
  Plus,
} from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { ScrollContainer } from '@/components/ui/scroll-container';
import {
  GHOST_ACCENT_HOVER_CLASSNAME,
  QUIET_OUTLINE_FIELD_CLASSNAME,
  SUBTLE_SURFACE_HOVER_CLASSNAME,
} from '@/components/ui/interactive-styles';
import { SearchInput } from '@/components/ui/search-input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';

import {
  TASK_FORM_PANEL_CLASSNAME,
  TASK_FORM_PANEL_HEADER_CLASSNAME,
  TASK_FORM_SEGMENTED_CONTROL_CLASSNAME,
  TASK_FORM_WARNING_ALERT_CLASSNAME,
  TASK_FORM_WARNING_ALERT_DESCRIPTION_CLASSNAME,
} from './task-form.constants';
import type { ResourceItem, ResourceType } from './task-form.types';

interface TaskResourceLibraryPanelProps {
  availableResources: ResourceItem[];
  isLoading: boolean;
  resourceSearch: string;
  onResourceSearchChange: (value: string) => void;
  resourceType: 'ALL' | ResourceType;
  onResourceTypeChange: (value: 'ALL' | ResourceType) => void;
  onResourceAdd: (resource: ResourceItem) => void;
  onDocumentPreview: (documentId: number) => void;
  onQuizPreview: (quizId: number) => void;
  resourcesDisabled: boolean;
  totalResourceCount: number;
  pageSize: number;
  safeCurrentPage: number;
  showPagination: boolean;
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
  onDocumentPreview,
  onQuizPreview,
  resourcesDisabled,
  totalResourceCount,
  pageSize,
  safeCurrentPage,
  showPagination,
  onPageChange,
}: TaskResourceLibraryPanelProps) {
  return (
    <div className={TASK_FORM_PANEL_CLASSNAME}>
      <div className={TASK_FORM_PANEL_HEADER_CLASSNAME}>
        <LayoutGrid className="h-4 w-4 text-primary-500" />
        <span>资源库</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="space-y-3 px-4 py-3">
          <SearchInput
            placeholder="搜索文档/测验..."
            value={resourceSearch}
            onChange={onResourceSearchChange}
            inputClassName={cn(
              'h-9 rounded-lg text-[11px] placeholder:text-text-muted/50',
              QUIET_OUTLINE_FIELD_CLASSNAME,
            )}
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
            className={`${TASK_FORM_SEGMENTED_CONTROL_CLASSNAME} [&>div]:grid-cols-3`}
          />

          {resourcesDisabled ? (
            <Alert variant="warning" className={TASK_FORM_WARNING_ALERT_CLASSNAME}>
              <AlertDescription className={TASK_FORM_WARNING_ALERT_DESCRIPTION_CLASSNAME}>
                任务已有学员开始学习，无法修改资源
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 pl-4 pr-0 pb-3">
          <ScrollContainer className="h-full overflow-y-auto pr-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: pageSize }).map((_, index) => (
                  <div
                    key={index}
                    className="flex h-[72px] items-center gap-3 rounded-xl border border-border bg-muted/70 px-4 animate-pulse"
                  >
                    <div className="h-10 w-10 rounded-lg bg-background" />
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
                  <FileCheck className="h-5 w-5" />
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
                      'group flex h-[64px] w-full items-center gap-2.5 rounded-lg border border-border bg-background p-2.5 text-left',
                      SUBTLE_SURFACE_HOVER_CLASSNAME,
                      'cursor-pointer',
                      resourcesDisabled && 'bg-muted/15',
                    )}
                    onClick={() => {
                      if (resource.resourceType === 'DOCUMENT') {
                        onDocumentPreview(resource.id);
                        return;
                      }

                      onQuizPreview(resource.id);
                    }}
                  >
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-transform group-hover:scale-105',
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
                        <FileCheck className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 truncate text-[13px] font-semibold text-foreground">{resource.title}</div>
                      <div className="flex items-center gap-2 text-[10px] font-medium text-text-muted">
                        <span className="text-text-muted">
                          {resource.resourceType === 'DOCUMENT' ? '文档' : resource.quizType === 'EXAM' ? '考试' : '测验'}
                        </span>
                        <span className="h-0.5 w-0.5 rounded-full bg-border" />
                        <span className="truncate text-text-muted">{resource.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-7 w-7 rounded-full !opacity-0 group-hover:!opacity-100 disabled:!opacity-0 group-hover:disabled:!opacity-100',
                          GHOST_ACCENT_HOVER_CLASSNAME,
                        )}
                        disabled={resourcesDisabled}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!resourcesDisabled) {
                            onResourceAdd(resource);
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </button>
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
    </div>
  );
}
