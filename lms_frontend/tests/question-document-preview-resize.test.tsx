import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { QuestionDocumentBody } from '../src/features/questions/components/question-document-core';
import { QuestionPreviewSurface } from '../src/features/questions/components/question-preview-surface';

test('question preview mode should keep split resize handle draggable', () => {
  const html = renderToStaticMarkup(
    <QuestionDocumentBody
      mode="preview"
      questionType="SINGLE_CHOICE"
      content="预览题干"
      options={[
        { key: 'A', value: '选项 A' },
        { key: 'B', value: '选项 B' },
      ]}
      answer="A"
      explanation=""
      showExplanation={false}
      questionNumber={1}
    />,
  );

  assert.equal(html.includes('调整题干与选项区域宽度'), true, '预览态应保留可拖动的分栏把手');
  assert.equal(html.includes('cursor-col-resize'), true, '预览态分栏把手应保持拖动样式');
});

test('question answer mode should also keep split resize handle draggable', () => {
  const html = renderToStaticMarkup(
    <QuestionDocumentBody
      mode="answer"
      questionType="SINGLE_CHOICE"
      content="学员作答题干"
      options={[
        { key: 'A', value: '选项 A' },
        { key: 'B', value: '选项 B' },
      ]}
      answer=""
      response="A"
      explanation=""
      showExplanation={false}
      questionNumber={1}
      onResponseChange={() => undefined}
    />,
  );

  assert.equal(html.includes('调整题干与选项区域宽度'), true, '学员侧作答卡片也应保留可拖动的分栏把手');
  assert.equal(html.includes('cursor-col-resize'), true, '学员侧分栏把手应保持拖动样式');
});

test('question detail preview surface should scope divider inside local grid', () => {
  const html = renderToStaticMarkup(
    <QuestionPreviewSurface
      question={{
        id: 1,
        question_type: 'SINGLE_CHOICE',
        content: '题干',
        options: [
          { key: 'A', value: '选项 A' },
          { key: 'B', value: '选项 B' },
        ],
        answer: 'A',
        explanation: '',
        updated_at: '2026-04-05T00:00:00Z',
      } as never}
    />,
  );

  assert.equal(html.includes('class="relative grid"'), true, '题目详情预览应让分隔线相对内部网格定位');
});
