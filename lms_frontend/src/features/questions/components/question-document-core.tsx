import React from 'react';

import { QuestionDocumentEditMode } from './question-document-edit-mode';
import { QuestionDocumentReadMode } from './question-document-read-mode';
import type { QuestionDocumentBodyProps, QuestionDocumentMode } from './question-document-types';

export const QuestionDocumentBody: React.FC<QuestionDocumentBodyProps> = ({
  mode = 'edit',
  ...props
}) => {
  const resolvedMode: QuestionDocumentMode = mode;

  if (resolvedMode === 'edit') {
    return <QuestionDocumentEditMode {...props} />;
  }

  return <QuestionDocumentReadMode mode={resolvedMode} {...props} />;
};
