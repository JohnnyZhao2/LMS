import { describe, expect, it } from 'vitest';

import {
  buildQuestionPatchPayload,
  normalizeQuestionScore,
  questionToEditableItem,
} from '@/entities/question/components/question-editor-helpers';


describe('question-editor-helpers', () => {
  it('normalizeQuestionScore 会统一数字输入', () => {
    expect(normalizeQuestionScore(undefined)).toBe('5');
    expect(normalizeQuestionScore('')).toBe('5');
    expect(normalizeQuestionScore(3)).toBe('3');
    expect(normalizeQuestionScore('2.5')).toBe('2.5');
    expect(normalizeQuestionScore('abc')).toBe('abc');
  });

  it('buildQuestionPatchPayload 会忽略标签顺序变化', () => {
    const baseline = {
      content: '原题',
      question_type: 'SINGLE_CHOICE' as const,
      options: [
        { key: 'A', value: '选项A' },
        { key: 'B', value: '选项B' },
      ],
      answer: 'A' as const,
      explanation: '解析',
      space_tag_id: 1,
      tag_ids: [2, 1],
    };

    const patch = buildQuestionPatchPayload(baseline, {
      ...baseline,
      tag_ids: [1, 2],
    });

    expect(patch).toEqual({});
  });

  it('buildQuestionPatchPayload 只返回真正变化字段', () => {
    const baseline = {
      content: '原题',
      question_type: 'SINGLE_CHOICE' as const,
      options: [
        { key: 'A', value: '选项A' },
        { key: 'B', value: '选项B' },
      ],
      answer: 'A' as const,
      explanation: '解析',
      space_tag_id: 1,
      tag_ids: [1, 2],
    };

    const patch = buildQuestionPatchPayload(baseline, {
      ...baseline,
      content: '新题',
      explanation: '新解析',
    });

    expect(patch).toEqual({
      content: '新题',
      explanation: '新解析',
    });
  });

  it('questionToEditableItem 会把题库题转换成可编辑副本', () => {
    const item = questionToEditableItem({
      id: 7,
      content: '题目内容',
      question_type: 'SINGLE_CHOICE',
      question_type_display: '单选题',
      options: [
        { key: 'A', value: '选项A' },
        { key: 'B', value: '选项B' },
      ],
      answer: 'A',
      explanation: '解析',
      usage_count: 0,
      is_referenced: false,
      tags: [{ id: 9, name: '标签' }],
      space_tag: { id: 3, name: '空间' },
      created_at: '',
      updated_at: '',
    });

    expect(item.questionId).toBe(7);
    expect(item.sourceQuestionId).toBe(7);
    expect(item.spaceTagId).toBe(3);
    expect(item.tagIds).toEqual([9]);
    expect(item.score).toBe('5');
    expect(item.saved).toBe(true);
  });
});
