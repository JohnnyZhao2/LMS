import React from 'react';
import { Eye, FileText, LayoutGrid, Loader2, Plus, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getQuestionTypeLabel, getQuestionTypeStyle, QUESTION_TYPE_LABELS } from '@/features/quiz-center/questions/constants';
import type { PaginatedResponse, Question, QuestionType, Tag } from '@/types/api';

interface QuestionBankPanelProps {
  resourceSearch: string;
  onResourceSearchChange: (value: string) => void;
  filterLineTypeId: string;
  onFilterLineTypeIdChange: (value: string) => void;
  filterQuestionType: string;
  onFilterQuestionTypeChange: (value: string) => void;
  lineTypes?: Tag[];
  questionsData?: PaginatedResponse<Question>;
  questionsLoading: boolean;
  onCreateNew: () => void;
  onPreview: (question: Question) => void;
  onAddQuestion: (question: Question) => void;
}

export const QuestionBankPanel: React.FC<QuestionBankPanelProps> = ({
  resourceSearch,
  onResourceSearchChange,
  filterLineTypeId,
  onFilterLineTypeIdChange,
  filterQuestionType,
  onFilterQuestionTypeChange,
  lineTypes,
  questionsData,
  questionsLoading,
  onCreateNew,
  onPreview,
  onAddQuestion,
}) => {
  return (
    <div className="w-72 flex flex-col bg-background rounded-xl shadow-sm border border-border shrink-0 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <LayoutGrid className="w-4 h-4 text-primary-500" />
          公共题库
        </div>
        <Button variant="ghost" size="sm" onClick={onCreateNew} className="text-primary-500 hover:text-primary-600 hover:bg-primary-50 h-7">
          + 新建题目
        </Button>
      </div>

      <div className="px-5 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            placeholder="检索题目内容..."
            className="pl-9"
            value={resourceSearch}
            onChange={e => onResourceSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2 px-5 mb-4">
        <Select value={filterLineTypeId} onValueChange={onFilterLineTypeIdChange}>
          <SelectTrigger className="flex-1 text-xs"><SelectValue placeholder="全部条线" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部条线</SelectItem>
            {lineTypes?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterQuestionType} onValueChange={onFilterQuestionTypeChange}>
          <SelectTrigger className="flex-1 text-xs"><SelectValue placeholder="全部题型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部题型</SelectItem>
            {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {questionsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
          </div>
        ) : questionsData?.results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-text-muted">
            <FileText className="w-8 h-8 mb-2" />
            <span className="text-sm">暂无资源</span>
          </div>
        ) : (
          <div className="space-y-2">
            {questionsData?.results.map(q => (
              <div
                key={q.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted transition-all hover:bg-background  border border-transparent hover:border-border group"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-primary-500 text-white">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onPreview(q)}>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      className={cn("text-[10px] px-1.5 h-5", getQuestionTypeStyle(q.question_type).bg, getQuestionTypeStyle(q.question_type).color)}
                    >
                      {getQuestionTypeLabel(q.question_type as QuestionType)}
                    </Badge>
                    <span className="text-xs text-text-muted">#{q.id}</span>
                  </div>
                  <div className="text-sm text-foreground line-clamp-2 group-hover:text-primary-600 flex items-center gap-1">
                    <span className="truncate">{q.content}</span>
                    <Eye className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100" />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-500 hover:bg-primary-50 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddQuestion(q);
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};