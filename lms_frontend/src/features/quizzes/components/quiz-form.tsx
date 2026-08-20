import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { arrayMove } from '@dnd-kit/sortable';
import { Eye, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { THREE_PANEL_EDITOR_WORKBENCH_CLASSNAME } from '@/components/ui/editor-layout';
import { FILLED_PLAIN_FIELD_CLASSNAME } from '@/components/ui/interactive-styles';
import { Input } from '@/components/ui/input';
import { EditorPageShell, PageWorkbench } from '@/components/ui/page-shell';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROUTES } from '@/config/routes';
import { useTags } from '@/api/tags';
import { useQuestions } from '@/api/questions/get-questions';
import { QuestionBankPanel } from '@/features/quizzes/components/question-bank-panel';
import { QuestionDetailDialog } from '@/components/questions/question-detail-dialog';
import { QuestionDocumentList } from '@/components/questions/question-document-list';
import {
  createBlankEditableQuestion,
  questionToEditableItem,
  type EditableQuestionItem,
} from '@/lib/question-editor';
import { useAuth } from '@/lib/auth';

import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { QuestionType } from '@/types/common';
import type { Question } from '@/types/question';
import type { QuizCreateRequest, QuizType } from '@/types/quiz';
import { showApiError } from '@/utils/error-handler';

import { useCreateQuiz, useUpdateQuiz } from '../api/create-quiz';
import { useQuizDetail } from '@/features/quizzes/api/get-quizzes';
import type { QuizDraftState } from '@/features/quizzes/types';

import { buildQuizEditableItem, buildQuizSubmitPayload, validateQuizDraft } from './quiz-form.helpers';
import { QuizOutlinePanel } from '@/components/quizzes/quiz-outline-panel';
import { QuizPreviewWorkbench } from '@/features/quizzes/components/quiz-preview-workbench';

const COLLAPSED_QUESTION_BANK_WORKBENCH_CLASSNAME =
  'grid h-full min-h-0 min-w-0 items-stretch gap-3 [grid-template-columns:minmax(12rem,14rem)_minmax(0,1fr)_2rem] xl:[grid-template-columns:minmax(15rem,16rem)_minmax(0,1fr)_2rem] 2xl:[grid-template-columns:minmax(18rem,18.5rem)_minmax(0,1fr)_2rem]';

export const QuizForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasCapability } = useAuth();
  const isEdit = !!id;
  const isPreviewRoute = location.pathname.endsWith('/preview');
  const routeState = location.state as { quizDraft?: QuizDraftState } | null;
  const quizDraft = routeState?.quizDraft && (!id || routeState.quizDraft.quizId === Number(id))
    ? routeState.quizDraft
    : undefined;

  const [title, setTitle] = useState('');
  const [quizType, setQuizType] = useState<QuizType>('PRACTICE');
  const [duration, setDuration] = useState<number | undefined>();
  const [passScore, setPassScore] = useState<number | undefined>();
  const [items, setItems] = useState<EditableQuestionItem[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [resourceSearch, setResourceSearch] = useState('');
  const [filterSpaceTagId, setFilterSpaceTagId] = useState<string>('all');
  const [filterQuestionType, setFilterQuestionType] = useState<string>('all');
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [questionBankCollapsed, setQuestionBankCollapsed] = useState(
    () => (typeof window !== 'undefined' ? window.innerWidth < 1500 : false),
  );
  const initializedRef = useRef(false);

  const appendItemPreservingFocus = useCallback((item: EditableQuestionItem) => {
    setItems((prev) => [...prev, item]);
    setActiveKey(item.key);
  }, []);

  const { data: quizData } = useQuizDetail(Number(id));
  const { data: spaceTags } = useTags({ tag_type: 'SPACE' });
  const { data: questionsData, isLoading: questionsLoading } = useQuestions({
    pageSize: 1000,
    search: resourceSearch || undefined,
    spaceTagId: filterSpaceTagId === 'all' ? undefined : Number(filterSpaceTagId),
    questionType: filterQuestionType === 'all' ? undefined : filterQuestionType as QuestionType,
  });

  const createQuiz = useCreateQuiz();
  const updateQuiz = useUpdateQuiz();
  const isSubmitting = createQuiz.isPending || updateQuiz.isPending;

  useEffect(() => {
    if (initializedRef.current) return undefined;

    let cancelled = false;

    const bootstrap = async () => {
      if (quizDraft) {
        setTitle(quizDraft.title);
        setQuizType(quizDraft.quizType);
        setDuration(quizDraft.duration);
        setPassScore(quizDraft.passScore);
        setItems(quizDraft.items);
        setActiveKey(quizDraft.items[0]?.key ?? null);
        initializedRef.current = true;
        return;
      }

      if (isEdit) {
        if (!quizData) return;

        const sorted = [...(quizData.questions ?? [])].sort((a, b) => a.order - b.order);
        const loadedItems = sorted.map(buildQuizEditableItem);

        if (cancelled) return;

        setTitle(quizData.title);
        setQuizType(quizData.quiz_type || 'PRACTICE');
        setDuration(quizData.duration ?? undefined);
        setPassScore(quizData.pass_score ? Number(quizData.pass_score) : undefined);
        setItems(loadedItems);
        setActiveKey(loadedItems[0]?.key ?? null);
        initializedRef.current = true;
        return;
      }

      const qidParam = searchParams.get('question_ids');
      let loadedItems: EditableQuestionItem[] = [];
      if (qidParam) {
        const questionIds = qidParam.split(',').map(Number).filter(Boolean);
        loadedItems = await Promise.all(
          questionIds.map(async (questionId) => {
            const question = await apiClient.get<Question>(`/questions/${questionId}/`);
            return questionToEditableItem(question);
          }),
        );
        if (cancelled) return;
      }

      setTitle('');
      setQuizType('PRACTICE');
      setDuration(undefined);
      setPassScore(undefined);
      setItems(loadedItems);
      setActiveKey(loadedItems[0]?.key ?? null);
      initializedRef.current = true;
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [isEdit, quizData, quizDraft, searchParams]);

  const selectedSourceQuestionIds = useMemo(
    () => new Set(items.map((item) => item.sourceQuestionId ?? item.questionId).filter((value): value is number => Boolean(value))),
    [items],
  );

  const filteredQuestionsData = useMemo(() => {
    if (!questionsData) return undefined;
    return {
      ...questionsData,
      results: questionsData.results.filter((question) => !selectedSourceQuestionIds.has(question.id)),
    };
  }, [questionsData, selectedSourceQuestionIds]);

  const workbenchClassName = questionBankCollapsed
    ? COLLAPSED_QUESTION_BANK_WORKBENCH_CLASSNAME
    : THREE_PANEL_EDITOR_WORKBENCH_CLASSNAME;

  const handleAddQuestion = useCallback(async (question: Question) => {
    if (selectedSourceQuestionIds.has(question.id)) {
      toast.warning('该题目已在试卷中');
      return;
    }

    try {
      const full = await apiClient.get<Question>(`/questions/${question.id}/`);
      appendItemPreservingFocus(questionToEditableItem(full));
      toast.success('已添加到试卷');
    } catch (error) {
      showApiError(error);
    }
  }, [appendItemPreservingFocus, selectedSourceQuestionIds]);

  const handleAddBlank = useCallback((questionType: QuestionType = 'SINGLE_CHOICE') => {
    appendItemPreservingFocus(
      createBlankEditableQuestion(
        questionType,
        filterSpaceTagId !== 'all' ? Number(filterSpaceTagId) : null,
      ),
    );
  }, [appendItemPreservingFocus, filterSpaceTagId]);

  const handleUpdateItem = useCallback((key: string, patch: Partial<EditableQuestionItem>) => {
    setItems((prev) => prev.map((item) => (
      item.key === key ? { ...item, ...patch } : item
    )));
  }, []);

  const handleRemoveItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
    setActiveKey((current) => (current === key ? null : current));
  }, []);

  const handleReorderItems = useCallback((fromKey: string, toKey: string) => {
    setItems((prev) => {
      const oldIndex = prev.findIndex((item) => item.key === fromKey);
      const newIndex = prev.findIndex((item) => item.key === toKey);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const handlePreviewQuestion = useCallback(async (question: Question) => {
    try {
      const full = await apiClient.get<Question>(`/questions/${question.id}/`);
      setPreviewQuestion(full);
    } catch (error) {
      showApiError(error);
    }
  }, []);

  const handleSubmitQuiz = async () => {
    const validationMessage = validateQuizDraft({
      title,
      quizType,
      duration,
      passScore,
      items,
    });
    if (validationMessage) {
      if (validationMessage === '请添加题目') {
        return toast.warning(validationMessage);
      }
      return toast.error(validationMessage);
    }

    const data: QuizCreateRequest = buildQuizSubmitPayload({
      title,
      quizType,
      duration,
      passScore,
      items,
    });

    try {
      if (isEdit) {
        await updateQuiz.mutateAsync({ id: Number(id), data });
        toast.success('试卷更新成功');
        navigate(ROUTES.QUIZZES);
      } else {
        await createQuiz.mutateAsync(data);
        setSuccessModalOpen(true);
      }
    } catch (error) {
      showApiError(error);
    }
  };

  const handleQuizTypeChange = (value: QuizType) => {
    setQuizType(value);
    if (value === 'PRACTICE') {
      setDuration(undefined);
      setPassScore(undefined);
    }
  };

  if (isPreviewRoute && isEdit) {
    return (
      <EditorPageShell>
        <PageWorkbench className="min-w-0">
          <QuizPreviewWorkbench
            quizId={Number(id)}
            quizDraft={quizDraft}
            onEdit={
              hasCapability('quizzes.change_quiz')
                ? (targetQuizId) => navigate(`${ROUTES.QUIZZES}/${targetQuizId}/edit`, {
                  state: quizDraft ? { quizDraft } : undefined,
                })
                : undefined
            }
            className="min-h-0 flex-1"
          />
        </PageWorkbench>
      </EditorPageShell>
    );
  }

  return (
    <EditorPageShell>
      <PageWorkbench className="min-w-0">
        <div className={workbenchClassName}>
          <div className="min-h-0 overflow-hidden rounded-xl border border-border bg-background">
            <QuizOutlinePanel
              items={items}
              activeKey={activeKey}
              quizType={quizType}
              itemDisplayMode="plain"
              duration={duration}
              passScore={passScore}
              onSelectItem={setActiveKey}
              onReorderItems={handleReorderItems}
              onDurationChange={setDuration}
              onPassScoreChange={setPassScore}
            />
          </div>

          <div className="min-h-0 flex flex-col overflow-hidden rounded-xl border border-border bg-background">
            <div className="relative flex h-12 shrink-0 items-center justify-between border-b border-border px-5">
              <Select value={quizType} onValueChange={(value) => handleQuizTypeChange(value as QuizType)}>
                <SelectTrigger
                  className={
                    quizType === 'EXAM'
                      ? 'relative z-10 grid h-9 w-[88px] shrink-0 grid-cols-[minmax(0,1fr)_1rem] items-center gap-0 rounded-lg border-none bg-destructive-500/10 px-3 text-[12px] font-semibold text-destructive-600 shadow-none focus-visible:ring-0'
                      : 'relative z-10 grid h-9 w-[88px] shrink-0 grid-cols-[minmax(0,1fr)_1rem] items-center gap-0 rounded-lg border-none bg-secondary-500/10 px-3 text-[12px] font-semibold text-secondary-700 shadow-none focus-visible:ring-0'
                  }
                >
                  <SelectValue className="block w-full min-w-0 text-center" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRACTICE">测验</SelectItem>
                  <SelectItem value="EXAM">考试</SelectItem>
                </SelectContent>
              </Select>

              <div className="absolute left-1/2 top-1/2 w-[clamp(13rem,44%,22rem)] -translate-x-1/2 -translate-y-1/2">
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="输入试卷标题..."
                  className={cn(
                    'h-10 rounded-lg px-5 text-center text-[14px] font-semibold placeholder:text-text-muted/50',
                    FILLED_PLAIN_FIELD_CLASSNAME,
                  )}
                />
              </div>

              <div className="relative z-10 flex shrink-0 items-center gap-2">
                {isEdit ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`${ROUTES.QUIZZES}/${id}/preview`, {
                      state: {
                        quizDraft: {
                          quizId: Number(id),
                          title,
                          quizType,
                          duration,
                          passScore,
                          items,
                        },
                      },
                    })}
                    className="h-9 rounded-lg px-3 text-[12px] font-semibold"
                  >
                    <Eye className="mr-1.5 h-4 w-4" />
                    预览
                  </Button>
                ) : null}
                <Button
                  onClick={handleSubmitQuiz}
                  disabled={isSubmitting}
                  className="h-9 rounded-lg bg-foreground px-3 text-[12px] font-semibold text-background hover:bg-foreground/90"
                >
                  {isSubmitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                  保存
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden bg-background">
              <QuestionDocumentList
                items={items}
                activeKey={activeKey}
                spaceTags={spaceTags}
                showScore
                lockQuestionType={false}
                onChangeItem={handleUpdateItem}
                onDeleteItem={handleRemoveItem}
                onSelectItem={setActiveKey}
                addMenuOpen={showAddMenu}
                onAddMenuOpenChange={setShowAddMenu}
                onAddQuestion={handleAddBlank}
              />
            </div>
          </div>

          <div
            className={cn(
              'min-h-0 overflow-hidden rounded-xl border border-border bg-background',
              questionBankCollapsed && 'min-h-fit self-start justify-self-end overflow-visible rounded-none border-0 bg-transparent',
            )}
          >
            <QuestionBankPanel
              collapsed={questionBankCollapsed}
              onToggleCollapse={() => setQuestionBankCollapsed((prev) => !prev)}
              resourceSearch={resourceSearch}
              onResourceSearchChange={setResourceSearch}
              filterSpaceTagId={filterSpaceTagId}
              onFilterSpaceTagIdChange={setFilterSpaceTagId}
              filterQuestionType={filterQuestionType}
              onFilterQuestionTypeChange={setFilterQuestionType}
              spaceTags={spaceTags}
              questionsData={filteredQuestionsData}
              questionsLoading={questionsLoading}
              onPreview={handlePreviewQuestion}
              onAddQuestion={handleAddQuestion}
            />
          </div>
        </div>
      </PageWorkbench>

      <Dialog open={successModalOpen} onOpenChange={(open) => { if (!open) navigate(ROUTES.QUIZZES); }}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <div className="h-2 w-2 animate-pulse rounded-full bg-secondary-500"></div>
              试卷创建成功
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-6">
            <p className="text-sm leading-relaxed text-text-muted">
              恭喜！试卷 <span className="font-bold text-foreground">「{title}」</span> 已成功保存至系统库。
            </p>
            <Button variant="outline" onClick={() => navigate(ROUTES.QUIZZES)}>返回列表</Button>
          </div>
        </DialogContent>
      </Dialog>

      <QuestionDetailDialog
        question={previewQuestion}
        open={!!previewQuestion}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewQuestion(null);
          }
        }}
        onEdit={(question) => {
          setPreviewQuestion(null);
          navigate(`/questions/${question.id}/edit`);
        }}
        onDelete={() => {
          setPreviewQuestion(null);
          toast.info('请在题库管理页删除题目');
        }}
      />
    </EditorPageShell>
  );
};
