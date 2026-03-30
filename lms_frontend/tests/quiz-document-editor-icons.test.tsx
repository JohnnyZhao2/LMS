import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { QuizDocumentEditor } from '@/features/quiz-center/quizzes/components/quiz-document-editor';
import type { InlineQuestionItem } from '@/features/quiz-center/quizzes/types';

const baseItem: InlineQuestionItem = {
  key: 'q-1',
  questionId: null,
  resourceUuid: null,
  isCurrent: true,
  questionType: 'SINGLE_CHOICE',
  content: '题目内容',
  options: [
    { key: 'A', value: '选项 A' },
    { key: 'B', value: '选项 B' },
  ],
  answer: 'A',
  explanation: '',
  score: '5',
  spaceTagId: null,
  saved: false,
};

test('inline question card should always show editor content without collapse controls', () => {
  const html = renderToStaticMarkup(
    <QuizDocumentEditor
      items={[baseItem]}
      activeKey={baseItem.key}
      onUpdateItem={() => undefined}
      onRemoveItem={() => undefined}
      onReorderItems={() => undefined}
      onAddBlank={() => undefined}
      onFocusItem={() => undefined}
    />,
  );

  assert.equal(html.includes('lucide-fold-vertical'), false, '不应再渲染折叠按钮');
  assert.equal(html.includes('lucide-unfold-vertical'), false, '不应再渲染展开按钮');
  assert.equal(html.includes('lucide-chevron-up'), false, '上下移动按钮应替换为拖拽排序');
  assert.equal(html.includes('lucide-chevron-down'), false, '上下移动按钮应替换为拖拽排序');
  assert.equal(html.includes('lucide-grip-vertical'), true, '应展示拖拽排序把手');
  assert.equal(html.includes('题目内容'), true, '题目内容应始终展示完整编辑区');
  assert.equal(html.includes('选项'), true, '折叠功能删除后不应隐藏编辑表单');
});
