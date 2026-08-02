import { useEffect, useState, type ReactNode } from 'react';
import { BookOpen, FileCheck, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  GHOST_ACCENT_HOVER_CLASSNAME,
  QUIET_OUTLINE_FIELD_CLASSNAME,
  SUBTLE_SURFACE_HOVER_CLASSNAME,
} from '@/components/ui/interactive-styles';
import { Pagination } from '@/components/ui/pagination';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { SearchInput } from '@/components/ui/search-input';
import { KnowledgeDetailModal } from '@/entities/knowledge/components/knowledge-detail-modal';
import { QuizPreviewDialog } from '@/entities/quiz/components/quiz-preview-dialog';
import { cn } from '@/lib/utils';
import type { PaginatedResponse } from '@/types/common';
import type { TaskResourceOption } from '@/types/task';

import { useTaskResourceOptions } from '../../api/get-task-resources';
import { getTaskResourceGroupQuery } from './use-task-form.helpers';
import { mapTaskResourceOptionToResource, type ResourceGroup, type ResourceItem } from './task-form.types';

const PAGE_SIZE = 8;

const GROUP_TITLE: Record<ResourceGroup, string> = {
  DOCUMENT: '学习资料',
  PRACTICE: '测验',
  EXAM: '考试',
};

interface TaskResourcePickerPopoverProps {
  group: ResourceGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  excludeDocumentIds: number[];
  excludeQuizIds: number[];
  onAdd: (resource: ResourceItem) => void;
  disabled?: boolean;
  /** 触发器，通常是「添加」按钮 */
  children: ReactNode;
}

const getPaginatedResults = <T,>(data?: PaginatedResponse<T> | T[]): T[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.results;
};

/**
 * 贴着分组「添加」按钮的资源选择 Popover。
 */
export function TaskResourcePickerPopover({
  group,
  open,
  onOpenChange,
  excludeDocumentIds,
  excludeQuizIds,
  onAdd,
  disabled = false,
  children,
}: TaskResourcePickerPopoverProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [previewDocumentId, setPreviewDocumentId] = useState<number | null>(null);
  const [previewQuizId, setPreviewQuizId] = useState<number | null>(null);
  const title = GROUP_TITLE[group];
  const queryParams = getTaskResourceGroupQuery(group);

  useEffect(() => {
    if (!open) {
      return;
    }
    setSearch('');
    setPage(1);
    setPreviewDocumentId(null);
    setPreviewQuizId(null);
  }, [open, group]);

  const resourceQuery = useTaskResourceOptions({
    search,
    page,
    page_size: PAGE_SIZE,
    resource_type: queryParams.resource_type,
    quiz_type: 'quiz_type' in queryParams ? queryParams.quiz_type : undefined,
    exclude_document_ids: excludeDocumentIds,
    exclude_quiz_ids: excludeQuizIds,
    enabled: open,
  });

  const resources = getPaginatedResults<TaskResourceOption>(resourceQuery.data)
    .map(mapTaskResourceOptionToResource);
  const totalCount = resourceQuery.data && !Array.isArray(resourceQuery.data)
    ? resourceQuery.data.count
    : resources.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safeCurrentPage = Math.min(page, totalPages);

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          if (disabled) {
            return;
          }
          onOpenChange(nextOpen);
        }}
      >
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          align="end"
          side="bottom"
          sideOffset={8}
          className="flex w-[360px] flex-col gap-0 overflow-hidden p-0"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="border-b border-border px-3 py-2.5">
            <div className="mb-2 text-[12px] font-semibold text-foreground">添加{title}</div>
            <SearchInput
              placeholder={`搜索${title}...`}
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              inputClassName={cn(
                'h-8 rounded-md text-[11px] placeholder:text-text-muted/50',
                QUIET_OUTLINE_FIELD_CLASSNAME,
              )}
            />
          </div>

          <ScrollContainer className="max-h-[280px] overflow-x-hidden overflow-y-auto px-2 py-2">
            {resourceQuery.isLoading ? (
              <div className="space-y-1.5">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex h-12 items-center gap-2.5 rounded-md border border-border bg-muted/70 px-2.5 animate-pulse"
                  >
                    <div className="h-8 w-8 rounded-md bg-background" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 w-3/4 rounded bg-background" />
                      <div className="h-2 w-1/2 rounded bg-background" />
                    </div>
                  </div>
                ))}
              </div>
            ) : resources.length === 0 ? (
              <div className="flex h-[160px] flex-col items-center justify-center text-text-muted">
                <FileCheck className="mb-1.5 h-4 w-4" />
                <span className="text-[11px] font-medium">暂无匹配资源</span>
              </div>
            ) : (
              <div className="space-y-1">
                {resources.map((resource) => (
                  <button
                    key={`${resource.resourceType}-${resource.id}`}
                    type="button"
                    className={cn(
                      'group flex h-12 w-full items-center gap-2 rounded-md border border-transparent px-2 text-left',
                      SUBTLE_SURFACE_HOVER_CLASSNAME,
                      'cursor-pointer hover:border-border',
                    )}
                    onClick={() => {
                      if (resource.resourceType === 'DOCUMENT') {
                        setPreviewDocumentId(resource.id);
                        return;
                      }
                      setPreviewQuizId(resource.id);
                    }}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                        resource.resourceType === 'DOCUMENT'
                          ? 'bg-secondary-50 text-secondary'
                          : resource.quizType === 'EXAM'
                            ? 'bg-destructive-50 text-destructive'
                            : 'bg-primary-50 text-primary',
                      )}
                    >
                      {resource.resourceType === 'DOCUMENT' ? (
                        <BookOpen className="h-3.5 w-3.5" />
                      ) : (
                        <FileCheck className="h-3.5 w-3.5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-semibold text-foreground">
                        {resource.title}
                      </div>
                      <div className="truncate text-[10px] text-text-muted">
                        {resource.category}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-7 w-7 shrink-0 rounded-full opacity-0 group-hover:opacity-100',
                        GHOST_ACCENT_HOVER_CLASSNAME,
                      )}
                      onClick={(event) => {
                        event.stopPropagation();
                        onAdd(resource);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </button>
                ))}
              </div>
            )}
          </ScrollContainer>

          {totalPages > 1 ? (
            <div className="border-t border-border px-3 py-2">
              <Pagination
                current={safeCurrentPage}
                total={totalCount}
                pageSize={PAGE_SIZE}
                onChange={setPage}
                variant="compact"
                className="text-[11px]"
              />
            </div>
          ) : null}
        </PopoverContent>
      </Popover>

      <QuizPreviewDialog
        open={previewQuizId !== null}
        quizId={previewQuizId}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPreviewQuizId(null);
          }
        }}
        onPrimaryAction={(quizId) => {
          const target = resources.find(
            (resource) => resource.resourceType === 'QUIZ' && resource.id === quizId,
          );
          if (target) {
            onAdd(target);
          }
          setPreviewQuizId(null);
        }}
      />

      {previewDocumentId !== null ? (
        <KnowledgeDetailModal
          knowledgeId={previewDocumentId}
          previewOnly
          onClose={() => setPreviewDocumentId(null)}
        />
      ) : null}
    </>
  );
}
