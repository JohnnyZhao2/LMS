import { describe, expect, it } from 'vitest';

import {
  buildTaskFormInitialSelectedResources,
  buildTaskSubmitPayload,
  hasMissingTaskResourceSources,
} from './use-task-form.helpers';


describe('use-task-form.helpers', () => {
  it('编辑态会把缺失源资源转成缺失标记和负 id', () => {
    const resources = buildTaskFormInitialSelectedResources({
      isEdit: true,
      task: {
        id: 1,
        title: '任务',
        deadline: '2026-04-16T00:00:00+08:00',
        description: '',
        knowledge_items: [{
          id: 1,
          knowledge: null,
          knowledge_revision_id: 12,
          knowledge_title: '锁定知识标题',
          source_title: null,
          order: 1,
          revision_number: 2,
        }],
        quizzes: [{
          id: 2,
          task_quiz_id: 2,
          quiz: null,
          quiz_revision_id: 22,
          quiz_title: '锁定试卷标题',
          source_title: null,
          question_count: 3,
          total_score: 10,
          order: 2,
          revision_number: 1,
          quiz_type: 'PRACTICE',
          quiz_type_display: '测验',
        }],
        assignments: [],
        created_by_name: 'u',
        created_at: '',
        updated_at: '',
        has_progress: false,
        actions: { view: true, update: true, delete: true, analytics: true },
      },
    });

    expect(resources).toEqual([
      expect.objectContaining({
        id: -12,
        title: '锁定知识标题',
        resourceType: 'DOCUMENT',
        isMissingSource: true,
      }),
      expect.objectContaining({
        id: -22,
        title: '锁定试卷标题',
        resourceType: 'QUIZ',
        isMissingSource: true,
      }),
    ]);
    expect(hasMissingTaskResourceSources(resources)).toBe(true);
  });

  it('新建态可根据预选试卷生成默认资源', () => {
    const resources = buildTaskFormInitialSelectedResources({
      isEdit: false,
      paramQuizId: 7,
      quizDetail: {
        id: 7,
        title: '试卷 A',
        question_count: 5,
        total_score: '10',
        questions: [],
        quiz_type: 'EXAM',
        quiz_type_display: '考试',
        duration: 30,
        pass_score: 60,
        created_at: '',
        updated_at: '',
      },
    });

    expect(resources).toEqual([
      expect.objectContaining({
        id: 7,
        title: '试卷 A',
        resourceType: 'QUIZ',
        quizType: 'EXAM',
      }),
    ]);
  });

  it('buildTaskSubmitPayload 会在锁定态忽略资源 id，在可编辑态只提交正向资源 id', () => {
    const editablePayload = buildTaskSubmitPayload({
      title: '任务 A',
      description: '',
      deadline: new Date('2026-04-16T08:00:00.000Z'),
      resourcesDisabled: false,
      selectedUserIds: [3, 4],
      selectedResources: [
        { uid: 1, id: 10, title: '知识', resourceType: 'DOCUMENT' },
        { uid: 2, id: -11, title: '锁定知识', resourceType: 'DOCUMENT', isMissingSource: true },
        { uid: 3, id: 20, title: '试卷', resourceType: 'QUIZ' },
      ],
    });
    const lockedPayload = buildTaskSubmitPayload({
      title: '任务 B',
      description: '描述',
      deadline: new Date('2026-04-16T08:00:00.000Z'),
      resourcesDisabled: true,
      selectedUserIds: [8],
      selectedResources: [
        { uid: 1, id: 10, title: '知识', resourceType: 'DOCUMENT' },
        { uid: 2, id: 20, title: '试卷', resourceType: 'QUIZ' },
      ],
    });

    expect(editablePayload).toEqual({
      title: '任务 A',
      description: undefined,
      deadline: '2026-04-16T08:00:00.000Z',
      knowledge_ids: [10],
      quiz_ids: [20],
      assignee_ids: [3, 4],
    });
    expect(lockedPayload).toEqual({
      title: '任务 B',
      description: '描述',
      deadline: '2026-04-16T08:00:00.000Z',
      assignee_ids: [8],
    });
  });
});
