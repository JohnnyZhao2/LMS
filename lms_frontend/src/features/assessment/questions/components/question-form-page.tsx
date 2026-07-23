import React from 'react';
import { useParams } from 'react-router-dom';

import { EditorPageShell, PageWorkbench } from '@/components/ui/page-shell';
import {
  useCreateQuestion,
  useDeleteQuestion,
  useQuestionDetail,
  useUpdateQuestion,
} from '@/features/assessment/api/questions-queries';
import { QuestionEditor } from '@/features/assessment/questions/components/question-editor';
import { createBlankEditableQuestion, questionToEditableItem } from '@/features/assessment/questions/editor-utils';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import type { AssessmentTagDeps } from '@/features/assessment/types/tag-deps';

interface QuestionFormPageProps {
  tagDeps: AssessmentTagDeps;
}

export const QuestionFormPage: React.FC<QuestionFormPageProps> = ({ tagDeps }) => {
  const { id } = useParams<{ id: string }>();
  const questionId = id ? Number(id) : null;
  const isEdit = Boolean(questionId);
  const { roleNavigate } = useRoleNavigate();
  const { useTags } = tagDeps;
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
            <QuestionEditor
              key={isEdit ? `question-edit-${questionId}` : 'question-create-page'}
              initialItems={initialItems}
              spaceTags={spaceTags}
              TagInput={tagDeps.TagInput}
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
