import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TaskDetail } from './task-detail';

const navigateMock = vi.fn();
const useTaskDetailMock = vi.fn();
const useStudentLearningTaskDetailMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ search: '' }),
  useNavigate: () => navigateMock,
  useParams: () => ({ id: '42' }),
}));

vi.mock('@/session/auth/auth-context', () => ({
  useAuth: () => ({
    user: { id: 7 },
    isLoading: false,
  }),
}));

vi.mock('@/session/hooks/use-current-role', () => ({
  useCurrentRole: () => 'STUDENT',
}));

vi.mock('@/session/hooks/use-role-navigate', () => ({
  useRoleNavigate: () => ({
    roleNavigate: vi.fn(),
    getRolePath: (path: string) => `/student/${path}`,
  }),
}));

vi.mock('@/entities/task/api/get-task-detail', () => ({
  useTaskDetail: (...args: unknown[]) => useTaskDetailMock(...args),
  useStudentLearningTaskDetail: (...args: unknown[]) => useStudentLearningTaskDetailMock(...args),
}));

const taskDetail = {
  id: 42,
  title: '阶段任务',
  description: '',
  deadline: '2099-01-01T12:00:00.000Z',
  knowledge_items: [],
  quizzes: [],
  assignments: [
    {
      id: 77,
      assignee: 7,
      status: 'IN_PROGRESS',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ],
  created_by_name: '导师',
  updated_by_name: '导师',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  has_progress: true,
  actions: {
    view: true,
    update: false,
    delete: false,
    analytics: false,
  },
};

const learningDetail = {
  id: 77,
  task_id: 42,
  task_title: '阶段任务',
  task_description: '',
  deadline: '2099-01-01T12:00:00.000Z',
  created_by_name: '导师',
  status: 'PENDING_GRADING',
  status_display: '待批改',
  progress: {
    completed: 1,
    total: 2,
    percentage: 50,
    knowledge_total: 0,
    knowledge_completed: 0,
    quiz_total: 2,
    quiz_completed: 1,
    exam_total: 1,
    exam_completed: 0,
    practice_total: 1,
    practice_completed: 1,
  },
  score: null,
  knowledge_items: [],
  quiz_items: [
    {
      id: 101,
      quiz: 101,
      quiz_id: 101,
      task_quiz_id: 101,
      quiz_revision_id: 501,
      quiz_title: '主观题练习',
      quiz_type: 'PRACTICE',
      quiz_type_display: '练习',
      question_count: 1,
      total_score: 10,
      duration: null,
      pass_score: null,
      order: 1,
      is_completed: true,
      score: null,
      latest_submission_id: 9001,
      latest_status: 'GRADING',
    },
    {
      id: 202,
      quiz: 202,
      quiz_id: 202,
      task_quiz_id: 202,
      quiz_revision_id: 502,
      quiz_title: '结课考试',
      quiz_type: 'EXAM',
      quiz_type_display: '考试',
      question_count: 5,
      total_score: 100,
      duration: 45,
      pass_score: 60,
      order: 2,
      is_completed: false,
      score: null,
      latest_submission_id: null,
      latest_status: null,
    },
  ],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('TaskDetail', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    useTaskDetailMock.mockReturnValue({
      data: taskDetail,
      isLoading: false,
      isError: false,
    });
    useStudentLearningTaskDetailMock.mockReturnValue({
      data: learningDetail,
      isLoading: false,
    });
  });

  it('待批改状态不锁住后续考试', async () => {
    const user = userEvent.setup();

    render(<TaskDetail />);

    expect(screen.queryByText('待解锁')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /结课考试/ }));

    expect(navigateMock).toHaveBeenCalledWith('/student/quiz/202?assignment=77&task=42');
  });
});
