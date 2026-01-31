import React from 'react';
import { Eye, FileEdit, Settings } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Question, QuestionCreateRequest, QuizType, Tag } from '@/types/api';
import { QuestionEditorPanel } from '@/features/quiz-center/questions/components/question-editor-panel';

import { QuizInfoPanel } from './quiz-info-panel';

interface QuizSidePanelProps {
  mode: 'QUIZ_INFO' | 'EDIT_QUESTION' | 'PREVIEW_QUESTION';
  editingQuestionId: number | null;
  previewQuestion?: Question | null;
  onBackToInfo: () => void;
  title: string;
  description: string;
  quizType: QuizType;
  duration?: number;
  passScore?: number;
  totalScore: number;
  typeStats: Record<string, number>;
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setQuizType: (value: QuizType) => void;
  setDuration: (value?: number) => void;
  setPassScore: (value?: number) => void;
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
  title,
  description,
  quizType,
  duration,
  passScore,
  totalScore,
  typeStats,
  setTitle,
  setDescription,
  setQuizType,
  setDuration,
  setPassScore,
  questionForm,
  setQuestionForm,
  lineTypes,
  onSaveQuestion,
  isSavingQuestion,
}) => {
  const noopSetQuestionForm: React.Dispatch<React.SetStateAction<Partial<QuestionCreateRequest>>> = () => undefined;
  const previewForm: Partial<QuestionCreateRequest> = previewQuestion ? {
    line_type_id: previewQuestion.line_type?.id,
    question_type: previewQuestion.question_type,
    content: previewQuestion.content,
    options: previewQuestion.options || [],
    answer: previewQuestion.answer || '',
    explanation: previewQuestion.explanation || '',
    score: previewQuestion.score || '1',
  } : {};

  const showInfoPanel = mode === 'QUIZ_INFO';
  const showEditPanel = mode === 'EDIT_QUESTION';
  const showPreviewPanel = mode === 'PREVIEW_QUESTION';

  return (
    <div className="w-[400px] flex flex-col bg-background border-l border-border shrink-0 overflow-y-auto">
      <div className="flex items-center gap-2 px-5 py-4 text-sm font-semibold text-foreground border-b border-border">
        {showInfoPanel ? (
          <><Settings className="w-4 h-4 text-primary-500" />试卷配置属性</>
        ) : showEditPanel ? (
          <><FileEdit className="w-4 h-4 text-secondary-500" />{editingQuestionId ? '编辑题目' : '新建题目'}</>
        ) : (
          <><Eye className="w-4 h-4 text-primary-500" />题目预览</>
        )}
        {!showInfoPanel && (
          <Button variant="ghost" size="sm" onClick={onBackToInfo} className="ml-auto text-text-muted">
            返回
          </Button>
        )}
      </div>

      {showInfoPanel && (
        <QuizInfoPanel
          title={title}
          description={description}
          quizType={quizType}
          duration={duration}
          passScore={passScore}
          totalScore={totalScore}
          typeStats={typeStats}
          setTitle={setTitle}
          setDescription={setDescription}
          setQuizType={setQuizType}
          setDuration={setDuration}
          setPassScore={setPassScore}
        />
      )}

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