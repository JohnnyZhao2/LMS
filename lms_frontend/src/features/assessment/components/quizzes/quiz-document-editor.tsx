import React from 'react';

import { QuestionDocumentList } from '@/features/assessment/components/questions/question-document-list';
import type { QuestionType, Tag } from '@/types/common';

import type { InlineQuestionItem } from '@/features/assessment/components/quizzes/quiz-editor-types';
import type { AssessmentTagDeps } from '@/features/assessment/types/tag-deps';

interface QuizDocumentEditorProps {
  items: InlineQuestionItem[];
  activeKey: string | null;
  spaceTags?: Tag[];
  TagInput: AssessmentTagDeps['TagInput'];
  onUpdateItem: (key: string, patch: Partial<InlineQuestionItem>) => void;
  onRemoveItem: (key: string) => void;
  onReorderItems: (activeKey: string, overKey: string) => void;
  onAddBlank: (questionType?: QuestionType) => void;
  onFocusItem: (key: string) => void;
}

/**
 * 试卷文档流内联编辑：题目内容、分值、选项与解析。不展示 space 编辑，space 归属在题库中心维护。
 */
export const QuizDocumentEditor: React.FC<QuizDocumentEditorProps> = ({
  items,
  activeKey,
  spaceTags,
  TagInput,
  onUpdateItem,
  onRemoveItem,
  onReorderItems,
  onAddBlank,
  onFocusItem,
}) => {
  const [showAddMenu, setShowAddMenu] = React.useState(false);

  return (
    <QuestionDocumentList
      items={items}
      activeKey={activeKey}
      spaceTags={spaceTags}
      TagInput={TagInput}
      showScore
      lockQuestionType={false}
      onChangeItem={(key, patch) => onUpdateItem(key, patch as Partial<InlineQuestionItem>)}
      onSelectItem={onFocusItem}
      onReorderItems={onReorderItems}
      onDeleteItem={onRemoveItem}
      addMenuOpen={showAddMenu}
      onAddMenuOpenChange={setShowAddMenu}
      onAddQuestion={onAddBlank}
    />
  );
};
