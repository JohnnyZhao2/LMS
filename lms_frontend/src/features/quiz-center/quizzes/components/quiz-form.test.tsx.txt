import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createBlankEditableQuestion } from '@/entities/question/components/question-editor-helpers';

import { QuizForm } from './quiz-form';

const roleNavigateMock = vi.fn();
const hasCapabilityMock = vi.fn();
const createQuizMutateAsyncMock = vi.fn();
const updateQuizMutateAsyncMock = vi.fn();
const useQuizDetailMock = vi.fn();

vi.mock('@/session/hooks/use-role-navigate', () => ({
  useRoleNavigate: () => ({
    roleNavigate: roleNavigateMock,
  }),
}));

vi.mock('@/session/auth/auth-context', () => ({
  useAuth: () => ({
    hasCapability: hasCapabilityMock,
  }),
}));

vi.mock('../api/create-quiz', () => ({
  useCreateQuiz: () => ({
    mutateAsync: createQuizMutateAsyncMock,
    isPending: false,
  }),
  useUpdateQuiz: () => ({
    mutateAsync: updateQuizMutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/entities/quiz/api/get-quizzes', () => ({
  useQuizDetail: (...args: unknown[]) => useQuizDetailMock(...args),
}));

vi.mock('@/entities/tag/api/tags', () => ({
  useTags: () => ({
    data: [],
  }),
}));

vi.mock('@/entities/question/api/get-questions', () => ({
  useQuestions: () => ({
    data: { results: [] },
    isLoading: false,
  }),
}));

vi.mock('@/entities/question/components/question-bank-panel', () => ({
  QuestionBankPanel: () => <div>question-bank</div>,
}));

vi.mock('@/entities/question/components/question-detail-dialog', () => ({
  QuestionDetailDialog: () => null,
}));

vi.mock('@/entities/quiz/components/quiz-document-editor', () => ({
  QuizDocumentEditor: () => <div>quiz-document-editor</div>,
}));

vi.mock('@/entities/quiz/components/quiz-outline-panel', () => ({
  QuizOutlinePanel: ({
    duration,
    passScore,
  }: {
    duration?: number;
    passScore?: number;
  }) => <div>{`outline:${duration ?? 'none'}:${passScore ?? 'none'}`}</div>,
}));

vi.mock('@/entities/quiz/components/quiz-preview-workbench', () => ({
  QuizPreviewWorkbench: ({
    onEdit,
    quizId,
  }: {
    onEdit?: (quizId: number) => void;
    quizId: number;
  }) => (
    <button type="button" onClick={() => onEdit?.(quizId)}>
      preview-edit
    </button>
  ),
}));

vi.mock('@/components/ui/page-shell', () => ({
  EditorPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PageWorkbench: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
  }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const renderQuizForm = (initialEntry: string | { pathname: string; state?: unknown }) => render(
  <MemoryRouter
    initialEntries={[initialEntry]}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
  >
    <Routes>
      <Route path="/:role/quizzes/create" element={<QuizForm />} />
      <Route path="/:role/quizzes/:id/edit" element={<QuizForm />} />
      <Route path="/:role/quizzes/:id/preview" element={<QuizForm />} />
    </Routes>
  </MemoryRouter>,
);

describe('QuizForm', () => {
  beforeEach(() => {
    roleNavigateMock.mockReset();
    hasCapabilityMock.mockReset();
    createQuizMutateAsyncMock.mockReset();
    updateQuizMutateAsyncMock.mockReset();
    useQuizDetailMock.mockReset();

    hasCapabilityMock.mockReturnValue(true);
    createQuizMutateAsyncMock.mockResolvedValue({ id: 99 });
    updateQuizMutateAsyncMock.mockResolvedValue({ id: 5 });
    useQuizDetailMock.mockReturnValue({ data: undefined });
  });

  it('新建成功后会弹出成功反馈', async () => {
    const user = userEvent.setup();
    const validItem = {
      ...createBlankEditableQuestion('SINGLE_CHOICE'),
      content: '题目内容',
      options: [
        { key: 'A', value: '选项 A' },
        { key: 'B', value: '选项 B' },
      ],
      answer: 'A',
      score: '5',
    };
    const quizDraft = {
      title: '章节测验',
      quizType: 'PRACTICE' as const,
      duration: undefined,
      passScore: undefined,
      items: [validItem],
    };

    renderQuizForm({
      pathname: '/admin/quizzes/create',
      state: { quizDraft },
    });

    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(createQuizMutateAsyncMock).toHaveBeenCalledWith(expect.objectContaining({
        title: '章节测验',
        quiz_type: 'PRACTICE',
      }));
    });
    expect(screen.getByText('试卷创建成功')).toBeInTheDocument();
  });

  it('预览态点击编辑会带着当前草稿回到编辑页', async () => {
    const user = userEvent.setup();
    const quizDraft = {
      quizId: 5,
      title: '期中考试',
      quizType: 'EXAM' as const,
      duration: 90,
      passScore: 60,
      items: [],
    };

    renderQuizForm({
      pathname: '/admin/quizzes/5/preview',
      state: { quizDraft },
    });

    await user.click(screen.getByRole('button', { name: 'preview-edit' }));

    expect(roleNavigateMock).toHaveBeenCalledWith('/quizzes/5/edit', {
      state: { quizDraft },
    });
  });
});
