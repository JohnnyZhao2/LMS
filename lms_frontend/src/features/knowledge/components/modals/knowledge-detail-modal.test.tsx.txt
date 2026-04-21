import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KnowledgeDetailModal } from './knowledge-detail-modal';

const useAuthMock = vi.fn();
const createKnowledgeMutateAsyncMock = vi.fn();
const updateKnowledgeMutateAsyncMock = vi.fn();
const parseDocumentMutateAsyncMock = vi.fn();
const completeLearningMutateAsyncMock = vi.fn();
const useKnowledgeDetailMock = vi.fn();
const useStudentLearningTaskDetailMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('@/session/auth/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../../api/knowledge', () => ({
  useKnowledgeDetail: (...args: unknown[]) => useKnowledgeDetailMock(...args),
}));

vi.mock('../../api/manage-knowledge', () => ({
  useCreateKnowledge: () => ({
    mutateAsync: createKnowledgeMutateAsyncMock,
    isPending: false,
  }),
  useUpdateKnowledge: () => ({
    mutateAsync: updateKnowledgeMutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('../../api/parse-document', () => ({
  useParseDocument: () => ({
    mutateAsync: parseDocumentMutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('../../hooks/use-knowledge-modal-interactions', () => ({
  useKnowledgeModalInteractions: () => undefined,
}));

vi.mock('@/entities/task/api/complete-learning', () => ({
  useCompleteLearning: () => ({
    mutateAsync: completeLearningMutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/entities/task/api/get-task-detail', () => ({
  useStudentLearningTaskDetail: (...args: unknown[]) => useStudentLearningTaskDetailMock(...args),
}));

vi.mock('@/entities/tag/api/tags', () => ({
  useTags: () => ({
    data: [{ id: 1, name: '默认空间' }],
  }),
}));

vi.mock('../editor/rich-text-editor', () => ({
  SlashQuillEditor: ({
    value,
    onChange,
    readOnly,
  }: {
    value: string;
    onChange?: (value: string) => void;
    readOnly?: boolean;
  }) => (
    <textarea
      aria-label="knowledge-editor"
      value={value}
      readOnly={readOnly}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}));

vi.mock('./knowledge-detail-side-panel', () => ({
  KnowledgeDetailSidePanel: ({
    onSave,
    onTitleChange,
    learningAction,
  }: {
    onSave: () => void;
    onTitleChange: (value: string) => void;
    learningAction?: React.ReactNode;
  }) => (
    <div>
      <button type="button" onClick={() => onTitleChange('新标题')}>change-title</button>
      <button type="button" onClick={onSave}>save-knowledge</button>
      {learningAction}
    </div>
  ),
}));

vi.mock('./knowledge-focus-shell', () => ({
  KnowledgeFocusShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('./knowledge-focus-metadata-bar', () => ({
  KnowledgeFocusMetadataBar: () => <div>focus-metadata</div>,
}));

vi.mock('../shared/focus-icon', () => ({
  FocusOrbIcon: () => <div>focus-icon</div>,
}));

vi.mock('@/components/ui/scroll-container', () => ({
  ScrollContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div>skeleton</div>,
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

const knowledgeDetail = {
  id: 1,
  title: '旧标题',
  content: '<p>旧内容</p>',
  tags: [],
  related_links: [],
  space_tag: { id: 1, name: '默认空间' },
  updated_at: '2026-04-19T08:00:00.000Z',
};

describe('KnowledgeDetailModal', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    createKnowledgeMutateAsyncMock.mockReset();
    updateKnowledgeMutateAsyncMock.mockReset();
    parseDocumentMutateAsyncMock.mockReset();
    completeLearningMutateAsyncMock.mockReset();
    useKnowledgeDetailMock.mockReset();
    useStudentLearningTaskDetailMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();

    useKnowledgeDetailMock.mockReturnValue({
      data: knowledgeDetail,
      isLoading: false,
    });
    useStudentLearningTaskDetailMock.mockReturnValue({ data: undefined });
    updateKnowledgeMutateAsyncMock.mockResolvedValue({
      ...knowledgeDetail,
      title: '新标题',
      content: '<p>新标题</p><p>新内容</p>',
    });
    createKnowledgeMutateAsyncMock.mockResolvedValue({ id: 1 });
    parseDocumentMutateAsyncMock.mockResolvedValue({
      suggested_title: '',
      content: '<p>导入内容</p>',
      file_type: 'pdf',
    });
    completeLearningMutateAsyncMock.mockResolvedValue(undefined);
  });

  it('保存编辑内容时会提交派生标题和正文', async () => {
    const user = userEvent.setup();
    const onUpdated = vi.fn();

    useAuthMock.mockReturnValue({
      currentRole: 'ADMIN',
      hasCapability: vi.fn((permissionCode: string) => permissionCode.startsWith('knowledge.')),
    });

    render(
      <KnowledgeDetailModal
        knowledgeId={1}
        startEditing
        onClose={vi.fn()}
        onUpdated={onUpdated}
      />,
    );

    await user.clear(screen.getByLabelText('knowledge-editor'));
    await user.type(screen.getByLabelText('knowledge-editor'), '<p>新标题</p><p>新内容</p>');
    await user.click(screen.getByRole('button', { name: 'change-title' }));
    await user.click(screen.getByRole('button', { name: 'save-knowledge' }));

    await waitFor(() => {
      expect(updateKnowledgeMutateAsyncMock).toHaveBeenCalledWith({
        id: 1,
        data: {
          title: '新标题',
          content: '<p>新标题</p><p>新内容</p>',
        },
      });
    });
    expect(onUpdated).toHaveBeenCalled();
  });

  it('学员点击标记已学习时会提交完成请求', async () => {
    const user = userEvent.setup();
    const onUpdated = vi.fn();

    useAuthMock.mockReturnValue({
      currentRole: 'STUDENT',
      hasCapability: vi.fn().mockReturnValue(false),
    });
    useStudentLearningTaskDetailMock.mockReturnValue({
      data: {
        knowledge_items: [
          { id: 5, knowledge_id: 1, is_completed: false },
        ],
      },
    });

    render(
      <KnowledgeDetailModal
        knowledgeId={1}
        taskId={7}
        taskKnowledgeId={5}
        onClose={vi.fn()}
        onUpdated={onUpdated}
      />,
    );

    await user.click(screen.getByRole('button', { name: '标记已学习' }));

    await waitFor(() => {
      expect(completeLearningMutateAsyncMock).toHaveBeenCalledWith({
        taskId: 7,
        taskKnowledgeId: 5,
      });
    });
    expect(onUpdated).toHaveBeenCalled();
  });
});
