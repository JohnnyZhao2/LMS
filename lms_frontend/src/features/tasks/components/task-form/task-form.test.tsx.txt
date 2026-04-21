import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TaskForm } from './task-form';

const useTaskFormMock = vi.fn();

vi.mock('./use-task-form', () => ({
  useTaskForm: () => useTaskFormMock(),
}));

vi.mock('./task-resource-library-panel', () => ({
  TaskResourceLibraryPanel: ({
    onResourceSearchChange,
    onResourceTypeChange,
    onQuizPreview,
    onDocumentPreview,
  }: Record<string, (value?: unknown) => void>) => (
    <div>
      <button type="button" onClick={() => onResourceSearchChange('线代')}>change-search</button>
      <button type="button" onClick={() => onResourceTypeChange('QUIZ')}>change-type</button>
      <button type="button" onClick={() => onQuizPreview(2)}>preview-quiz</button>
      <button type="button" onClick={() => onDocumentPreview(9)}>preview-knowledge</button>
    </div>
  ),
}));

vi.mock('./task-configuration-panel', () => ({
  TaskConfigurationPanel: () => <div>task-config</div>,
}));

vi.mock('./task-pipeline-panel', () => ({
  TaskPipelinePanel: () => <div>task-pipeline</div>,
}));

vi.mock('@/entities/quiz/components/quiz-preview-dialog', () => ({
  QuizPreviewDialog: ({
    open,
    onPrimaryAction,
    onOpenChange,
  }: Record<string, (value?: unknown) => void> & { open: boolean }) => (
    open ? (
      <div>
        <div>quiz-preview-dialog</div>
        <button type="button" onClick={() => onPrimaryAction(2)}>confirm-quiz-preview</button>
        <button type="button" onClick={() => onOpenChange(false)}>close-quiz-preview</button>
      </div>
    ) : null
  ),
}));

vi.mock('@/entities/knowledge/components/knowledge-detail-modal', () => ({
  KnowledgeDetailModal: ({
    knowledgeId,
    onClose,
  }: { knowledgeId: number; onClose: () => void }) => (
    <div>
      <div>{`knowledge-preview-${knowledgeId}`}</div>
      <button type="button" onClick={onClose}>close-knowledge-preview</button>
    </div>
  ),
}));

const buildHookState = (overrides: Record<string, unknown> = {}) => ({
  isEdit: false,
  taskError: false,
  title: '任务标题',
  setTitle: vi.fn(),
  description: '',
  setDescription: vi.fn(),
  deadline: new Date('2026-04-19T08:00:00.000Z'),
  setDeadline: vi.fn(),
  selectedResources: [],
  resourceSearch: '',
  setResourceSearch: vi.fn(),
  resourceType: 'ALL',
  setResourceType: vi.fn(),
  selectedUserIds: [1],
  userSearch: '',
  setUserSearch: vi.fn(),
  setCurrentPage: vi.fn(),
  availableResources: [
    { id: 2, title: '试卷 2', resourceType: 'QUIZ' },
  ],
  totalResourceCount: 1,
  resourcePageSize: 9,
  safeCurrentPage: 2,
  shouldPaginateResources: false,
  filteredUsers: [],
  isUsersLoading: false,
  isLoading: false,
  isSubmitting: false,
  canSubmit: true,
  resourcesDisabled: false,
  canRemoveAssignee: true,
  addResource: vi.fn(),
  removeResource: vi.fn(),
  toggleUser: vi.fn(),
  toggleUsers: vi.fn(),
  handleDragEnd: vi.fn(),
  handleSubmit: vi.fn(),
  roleNavigate: vi.fn(),
  ...overrides,
});

describe('TaskForm', () => {
  beforeEach(() => {
    useTaskFormMock.mockReset();
  });

  it('切换资源搜索和类型时会重置分页', async () => {
    const user = userEvent.setup();
    const setResourceSearch = vi.fn();
    const setResourceType = vi.fn();
    const setCurrentPage = vi.fn();

    useTaskFormMock.mockReturnValue(buildHookState({
      setResourceSearch,
      setResourceType,
      setCurrentPage,
    }));

    render(<TaskForm />);

    await user.click(screen.getByRole('button', { name: 'change-search' }));
    await user.click(screen.getByRole('button', { name: 'change-type' }));

    expect(setResourceSearch).toHaveBeenCalledWith('线代');
    expect(setResourceType).toHaveBeenCalledWith('QUIZ');
    expect(setCurrentPage).toHaveBeenCalledTimes(2);
    expect(setCurrentPage).toHaveBeenNthCalledWith(1, 1);
    expect(setCurrentPage).toHaveBeenNthCalledWith(2, 1);
  });

  it('试卷预览确认后会把资源加入任务管道', async () => {
    const user = userEvent.setup();
    const addResource = vi.fn();

    useTaskFormMock.mockReturnValue(buildHookState({ addResource }));

    render(<TaskForm />);

    await user.click(screen.getByRole('button', { name: 'preview-quiz' }));
    expect(screen.getByText('quiz-preview-dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'confirm-quiz-preview' }));

    expect(addResource).toHaveBeenCalledWith({
      id: 2,
      title: '试卷 2',
      resourceType: 'QUIZ',
    });
    expect(screen.queryByText('quiz-preview-dialog')).not.toBeInTheDocument();
  });

  it('知识预览关闭后会收起弹窗', async () => {
    const user = userEvent.setup();

    useTaskFormMock.mockReturnValue(buildHookState());

    render(<TaskForm />);

    await user.click(screen.getByRole('button', { name: 'preview-knowledge' }));
    expect(screen.getByText('knowledge-preview-9')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'close-knowledge-preview' }));

    expect(screen.queryByText('knowledge-preview-9')).not.toBeInTheDocument();
  });
});
