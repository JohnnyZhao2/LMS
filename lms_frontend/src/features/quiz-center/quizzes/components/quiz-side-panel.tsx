import React from 'react';
import { Eye, FileEdit } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Question, QuestionCreateRequest, Tag } from '@/types/api';
import { QuestionEditorPanel } from '@/features/quiz-center/questions/components/question-editor-panel';

interface QuizSidePanelProps {
  mode: 'EDIT_QUESTION' | 'PREVIEW_QUESTION';
  editingQuestionId: number | null;
  previewQuestion?: Question | null;
  onBackToInfo: () => void;
  questionForm: Partial<QuestionCreateRequest>;
  setQuestionForm: React.Dispatch<React.SetStateAction<Partial<QuestionCreateRequest>>>;
  lineTypes?: Tag[];
  onSaveQuestion: () => void;
  isSavingQuestion: boolean;
}

export const QuizSidePanel: React.FC<QuizSidePanelProps> = ({
  mode,
  editingQuestionId,
  previewQuestion,
  onBackToInfo,
  questionForm,
  setQuestionForm,
  lineTypes,
  onSaveQuestion,
  isSavingQuestion,
}) => {
  const noopSetQuestionForm: React.Dispatch<React.SetStateAction<Partial<QuestionCreateRequest>>> = () => undefined;
  const previewForm: Partial<QuestionCreateRequest> = previewQuestion ? {
    line_tag_id: previewQuestion.line_tag?.id,
    question_type: previewQuestion.question_type,
    content: previewQuestion.content,
    options: previewQuestion.options || [],
    answer: previewQuestion.answer || '',
    explanation: previewQuestion.explanation || '',
    score: previewQuestion.score || '1',
  } : {};

  const showEditPanel = mode === 'EDIT_QUESTION';
  const showPreviewPanel = mode === 'PREVIEW_QUESTION';

  return (
    <div className="w-[450px] flex flex-col bg-background rounded-2xl shadow-2xl border border-border shrink-0 overflow-hidden h-full">
      <div className="flex items-center gap-2 px-5 py-4 text-sm font-semibold text-foreground border-b border-border">
        {showEditPanel ? (
          <><FileEdit className="w-4 h-4 text-secondary-500" />{editingQuestionId ? '编辑题目' : '新建题目'}</>
        ) : (
          <><Eye className="w-4 h-4 text-primary-500" />题目预览</>
        )}
        <Button variant="ghost" size="sm" onClick={onBackToInfo} className="ml-auto text-text-muted">
          返回
        </Button>
      </div>

      {showEditPanel && (
        <QuestionEditorPanel
          questionForm={questionForm}
          setQuestionForm={setQuestionForm}
          lineTypes={lineTypes}
          editingQuestionId={editingQuestionId}
          onCancel={onBackToInfo}
          onSave={onSaveQuestion}
          isSaving={isSavingQuestion}
        />
      )}

      {showPreviewPanel && previewQuestion && (
        <QuestionEditorPanel
          questionForm={previewForm}
          setQuestionForm={noopSetQuestionForm}
          lineTypes={lineTypes}
          editingQuestionId={previewQuestion.id}
          onCancel={onBackToInfo}
          onSave={onBackToInfo}
          isSaving={false}
          readOnly
          showActions={false}
        />
      )}
    </div>
  );
};
