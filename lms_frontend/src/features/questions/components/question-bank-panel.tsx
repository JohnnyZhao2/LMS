import React from 'react';
import { FileText, LayoutGrid, Loader2, Plus, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getQuestionTypeLabel, getQuestionTypeStyle, QUESTION_TYPE_LABELS } from '@/features/questions/constants';
import type { PaginatedResponse, Question, QuestionType, Tag } from '@/types/api';

interface QuestionBankPanelProps {
  resourceSearch: string;
  onResourceSearchChange: (value: string) => void;
  filterSpaceTypeId: string;
  onFilterSpaceTypeIdChange: (value: string) => void;
  filterQuestionType: string;
  onFilterQuestionTypeChange: (value: string) => void;
  spaceTypes?: Tag[];
  questionsData?: PaginatedResponse<Question>;
  questionsLoading: boolean;
  onPreview: (question: Question) => void;
  onAddQuestion: (question: Question) => void;
}

export const QuestionBankPanel: React.FC<QuestionBankPanelProps> = ({
  resourceSearch,
  onResourceSearchChange,
  filterSpaceTypeId,
  onFilterSpaceTypeIdChange,
  filterQuestionType,
  onFilterQuestionTypeChange,
  spaceTypes,
  questionsData,
  questionsLoading,
  onPreview,
  onAddQuestion,
}) => {
  return (
    <div className="flex w-72 shrink-0 flex-col border-l border-border bg-background xl:w-80">
      <div className="flex h-14 items-center border-b border-border px-5">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          <LayoutGrid className="h-4 w-4 text-text-muted" />
          公共题库
        </div>
      </div>

      <div className="space-y-3 bg-background px-4 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            placeholder="检索题目内容..."
            className="h-9 rounded-lg border-border bg-background pl-9 text-[12px]"
            value={resourceSearch}
            onChange={e => onResourceSearchChange(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterSpaceTypeId} onValueChange={onFilterSpaceTypeIdChange}>
            <SelectTrigger className="h-8 flex-1 rounded-md border-border bg-background text-[12px]"><SelectValue placeholder="全部 space" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部 space</SelectItem>
              {spaceTypes?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterQuestionType} onValueChange={onFilterQuestionTypeChange}>
            <SelectTrigger className="h-8 flex-1 rounded-md border-border bg-background text-[12px]"><SelectValue placeholder="全部题型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部题型</SelectItem>
              {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-background px-4 py-4">
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
            {questionsData?.results.map(q => (
              <div
                key={q.id}
                className="group flex items-start gap-3 rounded-xl border border-border bg-background p-4 transition-all hover:border-border/80 hover:shadow-sm"
              >
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onPreview(q)}>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      className={cn('h-5 px-1.5 text-[10px] font-semibold', getQuestionTypeStyle(q.question_type).bg, getQuestionTypeStyle(q.question_type).color)}
                    >
                      {getQuestionTypeLabel(q.question_type as QuestionType)}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-[13px] font-medium leading-relaxed text-foreground">{q.content}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 shrink-0 p-0 text-text-muted opacity-0 transition-all group-hover:opacity-100 hover:bg-primary-50 hover:text-primary-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddQuestion(q);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
