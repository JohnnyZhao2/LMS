import React from 'react';
import { ArrowLeft, FilePenLine } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EditorPageShell, PageFillShell } from '@/components/ui/page-shell';
import { useCreateQuestion, useDeleteQuestion, useUpdateQuestion } from '@/features/questions/api/create-question';
import { useQuestionDetail } from '@/features/questions/api/get-questions';
import { QuestionBatchEditor } from '@/features/questions/components/question-batch-editor';
import { createBlankEditableQuestion, questionToEditableItem } from '@/features/questions/components/question-editor-helpers';
import { useSpaceTypeTags } from '@/features/knowledge/api/get-tags';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import type { QuestionCreateRequest } from '@/types/api';

export const QuestionFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const questionId = id ? Number(id) : null;
  const isEdit = Boolean(questionId);
  const { roleNavigate } = useRoleNavigate();
  const { data: spaceTypes } = useSpaceTypeTags();
  const { data: questionDetail, isLoading } = useQuestionDetail(questionId ?? 0);
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();

  const handleBack = React.useCallback(() => {
    roleNavigate('/questions');
  }, [roleNavigate]);

  const handleCreateQuestion = React.useCallback(async (data: QuestionCreateRequest) => {
    const created = await createQuestion.mutateAsync(data);
    toast.success('题目创建成功');
    return created;
  }, [createQuestion]);

  const handleUpdateQuestion = React.useCallback(async (targetId: number, data: Partial<QuestionCreateRequest>) => {
    const updated = await updateQuestion.mutateAsync({ id: targetId, data });
    toast.success('题目保存成功');
    return updated;
  }, [updateQuestion]);

  const handleDeleteQuestion = React.useCallback(async (targetId: number) => {
    await deleteQuestion.mutateAsync(targetId);
    toast.success('题目已删除');
  }, [deleteQuestion]);

  const initialItems = React.useMemo(() => {
    if (isEdit) {
      return questionDetail ? [questionToEditableItem(questionDetail)] : [];
    }
    return [createBlankEditableQuestion()];
  }, [isEdit, questionDetail]);

  return (
    <PageFillShell>
      <PageHeader
        title={isEdit ? '编辑题目' : '新建题目'}
        icon={<FilePenLine />}
        extra={(
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </Button>
        )}
      />

      <EditorPageShell>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {isEdit && isLoading ? null : (
            <QuestionBatchEditor
              key={isEdit ? `question-edit-${questionId}` : 'question-create-page'}
              initialItems={initialItems}
              spaceTypes={spaceTypes}
              allowAdd={!isEdit}
              onCreateQuestion={handleCreateQuestion}
              onUpdateQuestion={handleUpdateQuestion}
              onDeleteQuestion={handleDeleteQuestion}
              onEmpty={handleBack}
            />
          )}
        </div>
      </EditorPageShell>
    </PageFillShell>
  );
};

export default QuestionFormPage;
