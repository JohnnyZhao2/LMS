import React from 'react';
import { useParams } from 'react-router-dom';

import { EditorPageShell, PageWorkbench } from '@/components/ui/page-shell';
import { useTags } from '@/hooks/api/use-tags';
import { useQuestionDetail } from '@/hooks/api/use-question-detail';
import { useCreateQuestion } from '@/features/questions/api/create-question';
import { useDeleteQuestion } from '@/features/questions/api/delete-question';
import { useUpdateQuestion } from '@/features/questions/api/update-question';
import { QuestionBatchEditor } from '@/features/questions/components/question-batch-editor';
import { createBlankEditableQuestion, questionToEditableItem } from '@/components/questions/question-editor-helpers';
import { useRoleNavigate } from '@/hooks/use-role-navigate';

export const QuestionFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const questionId = id ? Number(id) : null;
  const isEdit = Boolean(questionId);
  const { roleNavigate } = useRoleNavigate();
  const { data: spaceTags } = useTags({ tag_type: 'SPACE' });
  const { data: questionDetail, isLoading } = useQuestionDetail(questionId ?? 0);
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();

  const initialItems = isEdit
    ? questionDetail
      ? [questionToEditableItem(questionDetail)]
      : []
    : [createBlankEditableQuestion()];

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col">
      <EditorPageShell>
        <PageWorkbench className="min-w-0">
          {isEdit && isLoading ? null : (
            <QuestionBatchEditor
              key={isEdit ? `question-edit-${questionId}` : 'question-create-page'}
              initialItems={initialItems}
              spaceTags={spaceTags}
              allowAdd={!isEdit}
              onCreateQuestion={(data) => createQuestion.mutateAsync(data)}
              onUpdateQuestion={(targetId, data) => updateQuestion.mutateAsync({ id: targetId, data })}
              onDeleteQuestion={async (targetId) => {
                await deleteQuestion.mutateAsync(targetId);
              }}
              onEmpty={() => roleNavigate('/questions')}
            />
          )}
        </PageWorkbench>
      </EditorPageShell>
    </div>
  );
};

export default QuestionFormPage;
