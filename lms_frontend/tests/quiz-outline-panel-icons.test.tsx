import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { QuizOutlinePanel } from '@/features/quiz-center/quizzes/components/quiz-outline-panel';
import type { InlineQuestionItem } from '@/features/quiz-center/quizzes/types';

const baseItem: InlineQuestionItem = {
  key: 'q-1',
  questionId: null,
  resourceUuid: null,
  isCurrent: true,
  questionType: 'SINGLE_CHOICE',
  content: '左侧大纲题目',
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

test('quiz outline panel should render drag handle for sorting', () => {
  const html = renderToStaticMarkup(
    <QuizOutlinePanel
      items={[baseItem]}
      activeKey={baseItem.key}
      quizType="PRACTICE"
      onQuizTypeChange={() => undefined}
      onSelectItem={() => undefined}
      onReorderItems={() => undefined}
      onDurationChange={() => undefined}
      onPassScoreChange={() => undefined}
    />,
  );

  assert.equal(html.includes('lucide-grip-vertical'), true, '左侧大纲应展示拖拽排序把手');
  assert.equal(html.includes('左侧大纲题目'), true, '左侧大纲应渲染题目内容');
  assert.equal(html.includes('5分'), true, '左侧大纲应展示分值');
});
