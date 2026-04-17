import { describe, expect, it } from 'vitest';

import { createBlankEditableQuestion } from '@/features/questions/components/question-editor-helpers';

import { buildQuizSubmitPayload, validateQuizDraft } from './quiz-form.helpers';


describe('quiz-form.helpers', () => {
  it('考试模式缺少参考时间或及格分时会拦截', () => {
    const item = {
      ...createBlankEditableQuestion('SINGLE_CHOICE'),
      content: '题目内容',
      options: [
        { key: 'A', value: '选项A' },
        { key: 'B', value: '选项B' },
      ],
      answer: 'A',
    };

    expect(validateQuizDraft({
      title: '考试卷',
      quizType: 'EXAM',
      items: [item],
    })).toBe('考试模式需设置参考时间和及格分');
  });

  it('会校验每道题的内容和答案', () => {
    const item = createBlankEditableQuestion('SINGLE_CHOICE');

    expect(validateQuizDraft({
      title: '试卷',
      quizType: 'PRACTICE',
      items: [item],
    })).toBe('第1题未填写内容');

    expect(validateQuizDraft({
      title: '试卷',
      quizType: 'PRACTICE',
      items: [{ ...item, content: '题目内容' }],
    })).toBe('第1题未设置答案');
  });

  it('buildQuizSubmitPayload 会提交完整题目列表和来源题 id', () => {
    const existingItem = {
      ...createBlankEditableQuestion('SINGLE_CHOICE'),
      quizQuestionId: 11,
      sourceQuestionId: 7,
      content: '试卷里的题目',
      options: [
        { key: 'A', value: '选项A' },
        { key: 'B', value: '选项B' },
      ],
      answer: 'A',
      explanation: '解析',
      score: '2',
      tagIds: [3, 4],
    };
    const inlineItem = {
      ...createBlankEditableQuestion('SHORT_ANSWER'),
      questionType: 'SHORT_ANSWER' as const,
      content: '新建简答题',
      answer: '参考答案',
      explanation: '说明',
      score: '5',
    };

    const payload = buildQuizSubmitPayload({
      title: '试卷 A',
      quizType: 'PRACTICE',
      duration: 30,
      passScore: 60,
      items: [existingItem, inlineItem],
    });

    expect(payload).toEqual({
      title: '试卷 A',
      quiz_type: 'PRACTICE',
      duration: null,
      pass_score: null,
      questions: [
        expect.objectContaining({
          id: 11,
          source_question_id: 7,
          content: '试卷里的题目',
          score: '2',
          tag_ids: [3, 4],
        }),
        expect.objectContaining({
          id: undefined,
          source_question_id: null,
          content: '新建简答题',
          score: '5',
        }),
      ],
    });
  });
});
