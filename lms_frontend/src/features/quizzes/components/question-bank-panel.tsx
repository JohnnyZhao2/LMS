import React from 'react';
import { Check, ChevronLeft, ChevronRight, FileText, LayoutGrid, Loader2, Plus, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { QUIET_OUTLINE_FIELD_CLASSNAME } from '@/components/ui/interactive-styles';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { richTextToPreviewText } from '@/lib/rich-text';
import { QUESTION_TYPE_PICKER_OPTIONS, getQuestionTypeLabel, getQuestionTypeStyle } from '@/config/questions';
import type { PaginatedResponse, Tag } from '@/types/common';
import type { Question } from '@/types/question';

interface QuestionBankPanelProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  resourceSearch: string;
  onResourceSearchChange: (value: string) => void;
  filterSpaceTagId: string;
  onFilterSpaceTagIdChange: (value: string) => void;
  filterQuestionType: string;
  onFilterQuestionTypeChange: (value: string) => void;
  spaceTags?: Tag[];
  questionsData?: PaginatedResponse<Question>;
  selectedQuestionIds: ReadonlySet<number>;
  questionsLoading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPreview: (question: Question) => void;
  onAddQuestion: (question: Question) => void;
}

export const QuestionBankPanel: React.FC<QuestionBankPanelProps> = ({
  collapsed = false,
  onToggleCollapse,
  resourceSearch,
  onResourceSearchChange,
  filterSpaceTagId,
  onFilterSpaceTagIdChange,
  filterQuestionType,
  onFilterQuestionTypeChange,
  spaceTags,
  questionsData,
  selectedQuestionIds,
  questionsLoading,
  page,
  pageSize,
  onPageChange,
  onPreview,
  onAddQuestion,
}) => {
  if (collapsed) {
    return (
      <div className="flex h-12 items-center justify-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg border border-border bg-background text-foreground shadow-sm hover:bg-background hover:text-foreground"
          onClick={onToggleCollapse}
          aria-label="展开公共题库"
          title="展开公共题库"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full min-w-0 flex-col bg-background">
      <div className="flex h-12 items-center justify-between border-b border-border px-5">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          <LayoutGrid className="h-4 w-4 text-text-muted" />
          公共题库
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-text-muted hover:bg-muted hover:text-foreground"
          onClick={onToggleCollapse}
          aria-label="收起公共题库"
          title="收起公共题库"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3 bg-background px-5 pb-2 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder="检索题目内容..."
              className={cn(
                'h-10 rounded-lg pl-9 text-[12px] placeholder:text-text-muted/50',
                QUIET_OUTLINE_FIELD_CLASSNAME,
              )}
              value={resourceSearch}
              onChange={e => onResourceSearchChange(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <Select value={filterSpaceTagId} onValueChange={onFilterSpaceTagIdChange}>
              <SelectTrigger><SelectValue placeholder="全部" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                {spaceTags?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select value={filterQuestionType} onValueChange={onFilterQuestionTypeChange}>
              <SelectTrigger><SelectValue placeholder="全部题型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部题型</SelectItem>
                {QUESTION_TYPE_PICKER_OPTIONS.map(({ value, fullLabel }) => (
                  <SelectItem key={value} value={value}>{fullLabel}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-background px-5 pb-4 pt-2">
        {questionsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
          </div>
        ) : questionsData?.results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-text-muted">
            <FileText className="w-8 h-8 mb-2" />
            <span className="text-[13px]">暂无资源</span>
          </div>
        ) : (
          <div className="space-y-3">
            {questionsData?.results.map((q) => {
              const typeStyle = getQuestionTypeStyle(q.question_type);
              const isSelected = selectedQuestionIds.has(q.id);

              return (
                <div
                  key={q.id}
                  className={cn(
                    'group relative flex items-start gap-3 overflow-hidden rounded-xl border p-4 transition-[border-color,background-color,color,box-shadow] duration-150',
                    isSelected
                      ? 'border-border/70 bg-muted/30'
                      : 'border-border bg-background hover:border-primary-300',
                  )}
                >
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onPreview(q)}>
                    <div className="mb-1 flex items-center gap-2">
                      <Badge className={cn('h-5 px-1.5 text-[10px] font-semibold', typeStyle.bg, typeStyle.color)}>
                        {getQuestionTypeLabel(q.question_type)}
                      </Badge>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-secondary-50 px-1.5 py-0.5 text-[10px] font-semibold text-secondary-700">
                          <Check className="h-3 w-3" />
                          已加入
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-[13px] font-medium leading-relaxed text-foreground">
                      {richTextToPreviewText(q.content)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isSelected}
                    aria-label={isSelected ? '已加入试卷' : '添加到试卷'}
                    title={isSelected ? '已加入试卷' : '添加到试卷'}
                    className={cn(
                      'h-7 w-7 shrink-0 p-0 transition-all',
                      isSelected
                        ? 'text-secondary-600 opacity-100 disabled:opacity-70'
                        : 'text-text-muted opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground',
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddQuestion(q);
                    }}
                  >
                    {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {questionsData && questionsData.count > pageSize && (
        <div className="border-t border-border px-4 py-2.5">
          <Pagination
            variant="compact"
            current={page}
            total={questionsData.count}
            pageSize={pageSize}
            onChange={(nextPage) => onPageChange(nextPage)}
            className="justify-center"
          />
        </div>
      )}
    </div>
  );
};
