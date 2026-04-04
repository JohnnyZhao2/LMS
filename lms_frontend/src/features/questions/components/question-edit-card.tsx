import React from 'react';
import { Loader2, Save, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { normalizeQuestionTypeFields } from '@/features/questions/constants';
import type { QuestionCreateRequest, QuestionType, Tag } from '@/types/api';

import { QuestionDocumentBody } from './question-document-core';
import { QuestionMetaToolbar } from './question-meta-toolbar';

export interface QuestionEditCardValue {
  questionId: number | null;
  questionType: QuestionType;
  spaceTagId?: number | null;
  content: string;
  options: Array<{ key: string; value: string }>;
  answer: string | string[];
  explanation: string;
  showExplanation: boolean;
  score: string;
  tagIds?: number[];
}

interface QuestionEditCardProps {
  item: QuestionEditCardValue;
  index: number;
  spaceTypes?: Tag[];
  leadingSlot?: React.ReactNode;
  onChange: (patch: Partial<QuestionEditCardValue>) => void;
  onFocus?: () => void;
  onDelete?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  isDeleting?: boolean;
  showMetaToolbar?: boolean;
  headerActions?: React.ReactNode;
}

export const QuestionEditCard: React.FC<QuestionEditCardProps> = ({
  item,
  index,
  spaceTypes,
  leadingSlot,
  onChange,
  onFocus,
  onDelete,
  onSave,
  isSaving = false,
  isDeleting = false,
  showMetaToolbar = false,
  headerActions,
}) => {
  const resolvedActionButtons = headerActions ?? ((onDelete || onSave) ? (
    <div className="flex items-center gap-2.5">
      {onDelete ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-none border-none bg-transparent p-0 text-destructive shadow-none opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-transparent hover:text-destructive/85"
          onClick={onDelete}
          disabled={isDeleting || isSaving}
          aria-label="删除"
          title="删除"
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      ) : null}
      {onSave ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-none border-none bg-transparent p-0 text-primary-600 shadow-none hover:bg-transparent hover:text-primary-500"
          onClick={onSave}
          disabled={isDeleting || isSaving}
          aria-label="保存"
          title="保存"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        </Button>
      ) : null}
    </div>
  ) : null);

  return (
    <div className="group flex items-start gap-2.5 transition-all">
      {leadingSlot}

      <div onClick={onFocus} className="min-w-0 flex-1">
        <div className="space-y-2">
          <div className="pl-1 text-[11px] font-medium text-text-muted">第 {index + 1} 题</div>
          <QuestionDocumentBody
            questionType={item.questionType}
            content={item.content}
            options={item.options}
            answer={item.answer}
            explanation={item.explanation}
            showExplanation={item.showExplanation}
            staticType={!!item.questionId}
            showScore
            score={item.score}
            onQuestionTypeChange={(value) => {
              const normalized = normalizeQuestionTypeFields({
                question_type: item.questionType,
                content: item.content,
                options: item.options,
                answer: item.answer,
                explanation: item.explanation,
                score: item.score,
                space_tag_id: item.spaceTagId ?? null,
                tag_ids: item.tagIds ?? [],
              } satisfies Partial<QuestionCreateRequest>, value);

              onChange({
                questionType: value,
                options: normalized.options ?? item.options,
                answer: normalized.answer ?? item.answer,
              });
            }}
            onContentChange={(value) => onChange({ content: value })}
            onOptionsChange={(value) => onChange({ options: value })}
            onAnswerChange={(value) => onChange({ answer: value })}
            onExplanationChange={(value) => onChange({ explanation: value })}
            onShowExplanationChange={(show) => {
              if (!show) {
                onChange({ showExplanation: false, explanation: '' });
                return;
              }
              onChange({ showExplanation: true });
            }}
            onScoreChange={(value) => onChange({ score: value })}
            middleSection={(showMetaToolbar || resolvedActionButtons) ? (
              showMetaToolbar ? (
                <QuestionMetaToolbar
                  spaceTypes={spaceTypes}
                  spaceTagId={item.spaceTagId}
                  tagIds={item.tagIds ?? []}
                  onSpaceTagIdChange={(value) => onChange({ spaceTagId: value })}
                  onTagAdd={(tag) => onChange({
                    tagIds: [...new Set([...(item.tagIds ?? []), tag.id])],
                  })}
                  onTagRemove={(tagId) => onChange({
                    tagIds: (item.tagIds ?? []).filter((id) => id !== tagId),
                  })}
                  trailingContent={resolvedActionButtons}
                />
              ) : (
                <div className="flex justify-end">
                  {resolvedActionButtons}
                </div>
              )
            ) : null}
          />
        </div>
      </div>
    </div>
  );
};
