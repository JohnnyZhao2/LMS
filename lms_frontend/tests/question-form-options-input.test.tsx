import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { OptionsInput } from '@/features/questions/components/question-form-inputs';

test('options input should render drag handles at the end of each option row', () => {
  const html = renderToStaticMarkup(
    <OptionsInput
      questionType="SINGLE_CHOICE"
      value={[
        { key: 'A', value: '选项 A' },
        { key: 'B', value: '选项 B' },
      ]}
      answer="A"
      onChange={() => undefined}
      onAnswerChange={() => undefined}
    />,
  );

  assert.equal(html.includes('lucide-grip-vertical'), true, '选项末端应展示拖拽排序把手');
  assert.equal(html.includes('选项 A'), true, '应渲染选项内容');
  assert.equal(html.includes('选项 B'), true, '应渲染全部选项');
});
