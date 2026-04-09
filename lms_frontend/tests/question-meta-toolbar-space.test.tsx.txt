import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { QuestionMetaToolbar } from '../src/features/questions/components/question-meta-toolbar';

test('space trigger should keep gray circle placeholder without underscore when no space is selected', () => {
  const html = renderToStaticMarkup(
    <QuestionMetaToolbar
      questionType="SINGLE_CHOICE"
      score="1"
      showSpace
      spaceTagId={null}
      onSpaceTagIdChange={() => undefined}
      spaceTypes={[]}
    />,
  );

  assert.equal(
    html.includes('color-mix(in oklab, var(--color-text-muted) 36%, white)'),
    true,
    '未选空间时应显示灰色圆圈',
  );
  assert.equal(html.includes('bg-foreground/16'), true, '未选空间时应保留圆圈后的分割线');
  assert.equal(html.includes('>___</span>'), true, '未选空间时文案区域应显示更长的下划线占位');
});

test('space trigger should show divider only when space name exists', () => {
  const html = renderToStaticMarkup(
    <QuestionMetaToolbar
      questionType="SINGLE_CHOICE"
      score="1"
      showSpace
      spaceTagId={1}
      onSpaceTagIdChange={() => undefined}
      spaceTypes={[{
        id: 1,
        name: '训练营',
        color: '#95A5FF',
        tag_type: 'SPACE',
        tag_type_display: 'space',
        sort_order: 1,
        allow_knowledge: true,
        allow_question: true,
      }]}
    />,
  );

  assert.equal(html.includes('训练营'), true, '已选空间时应显示空间名');
  assert.equal(html.includes('bg-foreground/16'), true, '有空间名时应显示分隔线');
});
