import React, { useCallback, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, LayoutGrid, Loader2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { getQuestion } from '@/features/assessment/api/questions-api';
import { useQuestions } from '@/features/assessment/api/questions-queries';
import { QuestionDetailDialog } from '@/features/assessment/questions/components/question-detail-dialog';
import {
  QUESTION_TYPE_PICKER_OPTIONS,
  getQuestionTypeLabel,
  getQuestionTypeStyle,
} from '@/features/assessment/questions/config';
import type { AssessmentTagDeps } from '@/features/assessment/types/tag-deps';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QUIET_OUTLINE_FIELD_CLASSNAME } from '@/components/ui/interactive-styles';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { showApiError } from '@/lib/api-error-handler';
import { richTextToPreviewText } from '@/lib/rich-text';
import { cn } from '@/lib/utils';
import type { QuestionType } from '@/types/common';
import type { Question } from '@/types/question';

export interface QuestionBankPickerProps {
  excludedQuestionIds: ReadonlySet<number>;
  onAdd: (question: Question) => void;
  tagDeps: AssessmentTagDeps;
  /** 折叠状态变化时通知父级（用于 workbench 列宽） */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Space 筛选变化时通知父级（用于新建空白题默认 Space） */
  onSpaceFilterChange?: (spaceTagId: number | null) => void;
}

/**
 * 自管题库选择器：内部负责搜索、筛选、拉取题目、排除已选、预览与展开收起。
 */
export const QuestionBankPicker: React.FC<QuestionBankPickerProps> = ({
  excludedQuestionIds,
  onAdd,
  tagDeps,
  onCollapsedChange,
  onSpaceFilterChange,
}) => {
  const { useTags } = tagDeps;
  const { roleNavigate } = useRoleNavigate();

  const [resourceSearch, setResourceSearch] = useState('');
  const [filterSpaceTagId, setFilterSpaceTagId] = useState<string>('all');
  const [filterQuestionType, setFilterQuestionType] = useState<string>('all');
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [collapsed, setCollapsed] = useState(
    () => (typeof window !== 'undefined' ? window.innerWidth < 1500 : false),
  );

  const { data: spaceTags } = useTags({ tag_type: 'SPACE' });
  const { data: questionsData, isLoading: questionsLoading } = useQuestions({
    pageSize: 1000,
    search: resourceSearch || undefined,
    spaceTagId: filterSpaceTagId === 'all' ? undefined : Number(filterSpaceTagId),
    questionType: filterQuestionType === 'all' ? undefined : filterQuestionType as QuestionType,
  });

  const filteredQuestionsData = useMemo(() => {
    if (!questionsData) return undefined;
    return {
      ...questionsData,
      results: questionsData.results.filter((question) => !excludedQuestionIds.has(question.id)),
    };
  }, [excludedQuestionIds, questionsData]);

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      onCollapsedChange?.(next);
      return next;
    });
  }, [onCollapsedChange]);

  const handleSpaceFilterChange = useCallback((value: string) => {
    setFilterSpaceTagId(value);
    onSpaceFilterChange?.(value === 'all' ? null : Number(value));
  }, [onSpaceFilterChange]);

  const handlePreview = useCallback(async (question: Question) => {
    try {
      const full = await getQuestion(question.id);
      setPreviewQuestion(full);
    } catch (error) {
      showApiError(error);
    }
  }, []);

  return (
    <>
      {collapsed ? (
        <div className="flex h-12 items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg border border-border bg-background text-foreground shadow-sm hover:bg-background hover:text-foreground"
            onClick={handleToggleCollapse}
            aria-label="展开公共题库"
            title="展开公共题库"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      ) : (
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
              onClick={handleToggleCollapse}
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
                onChange={(e) => setResourceSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select value={filterSpaceTagId} onValueChange={handleSpaceFilterChange}>
                  <SelectTrigger><SelectValue placeholder="全部" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    {spaceTags?.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Select value={filterQuestionType} onValueChange={setFilterQuestionType}>
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
            ) : filteredQuestionsData?.results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-text-muted">
                <FileText className="w-8 h-8 mb-2" />
                <span className="text-[13px]">暂无资源</span>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredQuestionsData?.results.map((q) => {
                  const typeStyle = getQuestionTypeStyle(q.question_type);

                  return (
                    <div
                      key={q.id}
                      className="group relative flex items-start gap-3 overflow-hidden rounded-xl border border-border bg-background p-4 transition-[border-color,background-color,color,box-shadow] duration-150 hover:border-primary-300"
                    >
                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => { void handlePreview(q); }}>
                        <div className="mb-1 flex items-center gap-2">
                          <Badge className={cn('h-5 px-1.5 text-[10px] font-semibold', typeStyle.bg, typeStyle.color)}>
                            {getQuestionTypeLabel(q.question_type)}
                          </Badge>
                        </div>
                        <p className="line-clamp-2 text-[13px] font-medium leading-relaxed text-foreground">
                          {richTextToPreviewText(q.content)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 shrink-0 p-0 text-text-muted opacity-0 transition-all group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAdd(q);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <QuestionDetailDialog
        question={previewQuestion}
        open={!!previewQuestion}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewQuestion(null);
          }
        }}
        onEdit={(question) => {
          setPreviewQuestion(null);
          roleNavigate(`/questions/${question.id}/edit`);
        }}
        onDelete={() => {
          setPreviewQuestion(null);
          toast.info('请在题库管理页删除题目');
        }}
        tagDeps={tagDeps}
      />
    </>
  );
};
