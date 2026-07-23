import React, { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { getQuestion } from '@/features/assessment/api/questions-api';
import { useQuestions } from '@/features/assessment/api/questions-queries';
import { QuestionBankPanel } from '@/features/assessment/components/questions/question-bank-panel';
import { QuestionDetailDialog } from '@/features/assessment/components/questions/question-detail-dialog';
import type { AssessmentTagDeps } from '@/features/assessment/types/tag-deps';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { showApiError } from '@/lib/api-error-handler';
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
      <QuestionBankPanel
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        resourceSearch={resourceSearch}
        onResourceSearchChange={setResourceSearch}
        filterSpaceTagId={filterSpaceTagId}
        onFilterSpaceTagIdChange={handleSpaceFilterChange}
        filterQuestionType={filterQuestionType}
        onFilterQuestionTypeChange={setFilterQuestionType}
        spaceTags={spaceTags}
        questionsData={filteredQuestionsData}
        questionsLoading={questionsLoading}
        onPreview={handlePreview}
        onAddQuestion={onAdd}
      />

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
