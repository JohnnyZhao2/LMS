import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { arrayMove } from '@dnd-kit/sortable';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { THREE_PANEL_EDITOR_WORKBENCH_CLASSNAME } from '@/components/ui/editor-layout';
import { FILLED_PLAIN_FIELD_CLASSNAME } from '@/components/ui/interactive-styles';
import { Input } from '@/components/ui/input';
import { EditorPageShell } from '@/components/ui/page-shell';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROUTES } from '@/config/routes';
import { useCreateQuestion, useUpdateQuestion } from '@/features/questions/api/create-question';
import { useQuestions } from '@/features/questions/api/get-questions';
import { QuestionBankPanel } from '@/features/questions/components/question-bank-panel';
import { QuestionDetailDialog } from '@/features/questions/components/question-detail-dialog';
import {
  buildQuestionCreatePayload,
  buildQuestionPatchPayload,
  createBlankEditableQuestion,
  hasQuestionAnswer,
  normalizeQuestionScore,
  questionToEditableItem,
  syncEditableQuestionItem,
} from '@/features/questions/components/question-editor-helpers';
import { useSpaceTypeTags } from '@/features/knowledge/api/get-tags';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { Question, QuestionType, QuizCreateRequest, QuizType } from '@/types/api';
import { showApiError } from '@/utils/error-handler';

import { useCreateQuiz, useUpdateQuiz } from '../api/create-quiz';
import { useQuizDetail } from '../api/get-quizzes';
import type { InlineQuestionItem } from '../types';

import { QuizDocumentEditor } from './quiz-document-editor';
import { QuizOutlinePanel } from './quiz-outline-panel';

const applyScoreOverride = (item: InlineQuestionItem, score: string | number | null | undefined): InlineQuestionItem => {
  const normalizedScore = normalizeQuestionScore(score);

  return {
    ...item,
    score: normalizedScore,
    original: item.original ? { ...item.original, score: normalizedScore } : item.original,
  };
};

export const QuizForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { roleNavigate } = useRoleNavigate();
  const isEdit = !!id;

  const [title, setTitle] = useState('');
  const [quizType, setQuizType] = useState<QuizType>('PRACTICE');
  const [duration, setDuration] = useState<number | undefined>();
  const [passScore, setPassScore] = useState<number | undefined>();
  const [items, setItems] = useState<InlineQuestionItem[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [resourceSearch, setResourceSearch] = useState('');
  const [filterSpaceTypeId, setFilterSpaceTypeId] = useState<string>('all');
  const [filterQuestionType, setFilterQuestionType] = useState<string>('all');
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [savingItemKey, setSavingItemKey] = useState<string | null>(null);
  const initializedRef = useRef(false);

  const appendItemPreservingFocus = useCallback((item: InlineQuestionItem) => {
    setItems((prev) => [...prev, item]);
    setActiveKey(item.key);
  }, []);

  const { data: quizData } = useQuizDetail(Number(id));
  const { data: spaceTypes } = useSpaceTypeTags();
  const { data: questionsData, isLoading: questionsLoading } = useQuestions({
    pageSize: 1000,
    search: resourceSearch || undefined,
    spaceTypeId: filterSpaceTypeId === 'all' ? undefined : Number(filterSpaceTypeId),
    questionType: filterQuestionType === 'all' ? undefined : filterQuestionType as QuestionType,
  });

  const createQuiz = useCreateQuiz();
  const updateQuiz = useUpdateQuiz();
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const isSubmitting = createQuiz.isPending || updateQuiz.isPending;

  const buildSavedLocalItem = useCallback((item: InlineQuestionItem): InlineQuestionItem => {
    const payload = buildQuestionCreatePayload(item);
    const normalizedScore = normalizeQuestionScore(item.score);

    return {
      ...item,
      score: normalizedScore,
      original: { ...payload, score: normalizedScore },
      saved: true,
    };
  }, []);

  const persistItemToLibrary = useCallback(async (item: InlineQuestionItem) => {
    if (item.questionId) {
      const patchData = buildQuestionPatchPayload(item.original ?? {}, buildQuestionCreatePayload(item));
      if (Object.keys(patchData).length === 0) {
        return {
          item: buildSavedLocalItem(item),
          changed: false,
        };
      }

      const updated = await updateQuestion.mutateAsync({ id: item.questionId, data: patchData });
      return {
        item: syncEditableQuestionItem(item, updated),
        changed: true,
      };
    }

    const created = await createQuestion.mutateAsync(buildQuestionCreatePayload(item));
    return {
      item: syncEditableQuestionItem(item, created),
      changed: true,
    };
  }, [buildSavedLocalItem, createQuestion, updateQuestion]);

  useEffect(() => {
    if (initializedRef.current) return undefined;

    let cancelled = false;

    const bootstrap = async () => {
      if (isEdit) {
        if (!quizData) return;

        const sorted = [...(quizData.questions ?? [])].sort((a, b) => a.order - b.order);
        const loadedItems = await Promise.all(
          sorted.map(async (quizQuestion) => {
            const question = await apiClient.get<Question>(`/questions/${quizQuestion.question}/`);
            return applyScoreOverride(questionToEditableItem(question), quizQuestion.score);
          }),
        );

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
      let loadedItems: InlineQuestionItem[] = [];
      if (qidParam) {
        const qids = qidParam.split(',').map(Number).filter(Boolean);
        loadedItems = await Promise.all(
          qids.map(async (qid) => questionToEditableItem(await apiClient.get<Question>(`/questions/${qid}/`))),
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
  }, [isEdit, quizData, searchParams]);

  const filteredQuestionsData = useMemo(() => {
    if (!questionsData) return undefined;
    const usedUuids = new Set(items.filter((item) => item.resourceUuid).map((item) => item.resourceUuid));
    return {
      ...questionsData,
      results: questionsData.results.filter((question) => !usedUuids.has(question.resource_uuid)),
    };
  }, [questionsData, items]);

  const handleAddQuestion = useCallback(async (question: Question) => {
    if (items.some((item) => item.resourceUuid === question.resource_uuid)) {
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
  }, [appendItemPreservingFocus, items]);

  const handleAddBlank = useCallback((questionType: QuestionType = 'SINGLE_CHOICE') => {
    appendItemPreservingFocus(
      createBlankEditableQuestion(
        questionType,
        filterSpaceTypeId !== 'all' ? Number(filterSpaceTypeId) : null,
      ),
    );
  }, [appendItemPreservingFocus, filterSpaceTypeId]);

  const handleUpdateItem = useCallback((key: string, patch: Partial<InlineQuestionItem>) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch, saved: false } : item)));
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

  const handleSaveItem = useCallback(async (key: string) => {
    const item = items.find((current) => current.key === key);
    if (!item) return;
    if (!item.content.trim()) return void toast.error('请输入内容');
    if (!hasQuestionAnswer(item.answer)) return void toast.error('请设置答案');

    setSavingItemKey(key);
    try {
      const { item: savedItem, changed } = await persistItemToLibrary(item);
      setItems((prev) => prev.map((current) => (current.key === key ? savedItem : current)));
      if (!changed) {
        toast.info('未检测到改动');
        return;
      }
      toast.success('题目保存成功');
    } catch (error) {
      showApiError(error);
    } finally {
      setSavingItemKey(null);
    }
  }, [items, persistItemToLibrary]);

  const handleSubmitQuiz = async () => {
    if (!title.trim()) return toast.error('请输入试卷名称');
    if (items.length === 0) return toast.warning('请添加题目');
    if (quizType === 'EXAM' && (!duration || !passScore)) return toast.error('考试模式需设置时长和及格分');

    for (const [index, item] of items.entries()) {
      if (!item.content.trim()) return toast.error(`第${index + 1}题未填写内容`);
      if (!hasQuestionAnswer(item.answer)) return toast.error(`第${index + 1}题未设置答案`);
    }

    try {
      const savedItems = await Promise.all(items.map(async (item) => {
        if (item.questionId && item.saved) {
          return item;
        }
        const result = await persistItemToLibrary(item);
        return result.item;
      }));

      setItems(savedItems);

      const data: QuizCreateRequest = {
        title,
        quiz_type: quizType,
        duration: quizType === 'EXAM' ? duration : undefined,
        pass_score: quizType === 'EXAM' ? passScore : undefined,
        existing_question_ids: savedItems.map((item) => item.questionId!),
      };

      if (isEdit) {
        await updateQuiz.mutateAsync({ id: Number(id), data });
        toast.success('试卷更新成功');
        roleNavigate(ROUTES.QUIZZES);
      } else {
        await createQuiz.mutateAsync(data);
        setSuccessModalOpen(true);
      }
    } catch (error) {
      showApiError(error);
    }
  };

  return (
    <EditorPageShell>
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className={THREE_PANEL_EDITOR_WORKBENCH_CLASSNAME}>
          <div className="min-h-0 overflow-hidden rounded-xl border border-border bg-background">
            <QuizOutlinePanel
              items={items}
              activeKey={activeKey}
              quizType={quizType}
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
              <Select value={quizType} onValueChange={(value) => setQuizType(value as QuizType)}>
                <SelectTrigger
                  className={
                    quizType === 'EXAM'
                      ? 'relative z-10 h-9 w-[88px] shrink-0 rounded-lg border-none bg-destructive-500/10 px-3 text-[12px] font-semibold text-destructive-600 shadow-none focus-visible:ring-0'
                      : 'relative z-10 h-9 w-[88px] shrink-0 rounded-lg border-none bg-secondary-500/10 px-3 text-[12px] font-semibold text-secondary-700 shadow-none focus-visible:ring-0'
                  }
                >
                  <SelectValue />
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

              <Button
                onClick={handleSubmitQuiz}
                disabled={isSubmitting}
                className="relative z-10 h-9 shrink-0 rounded-lg bg-foreground px-4 text-[12px] font-semibold text-background hover:bg-foreground/90"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                保存试卷
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden bg-background">
              <QuizDocumentEditor
                items={items}
                activeKey={activeKey}
                spaceTypes={spaceTypes}
                onUpdateItem={handleUpdateItem}
                onSaveItem={handleSaveItem}
                onRemoveItem={handleRemoveItem}
                onReorderItems={handleReorderItems}
                onAddBlank={handleAddBlank}
                onFocusItem={setActiveKey}
                savingItemKey={savingItemKey}
              />
            </div>
          </div>

          <div className="min-h-0 overflow-hidden rounded-xl border border-border bg-background">
            <QuestionBankPanel
              resourceSearch={resourceSearch}
              onResourceSearchChange={setResourceSearch}
              filterSpaceTypeId={filterSpaceTypeId}
              onFilterSpaceTypeIdChange={setFilterSpaceTypeId}
              filterQuestionType={filterQuestionType}
              onFilterQuestionTypeChange={setFilterQuestionType}
              spaceTypes={spaceTypes}
              questionsData={filteredQuestionsData}
              questionsLoading={questionsLoading}
              onPreview={handlePreviewQuestion}
              onAddQuestion={handleAddQuestion}
            />
          </div>
        </div>
      </div>

      <Dialog open={successModalOpen} onOpenChange={(open) => { if (!open) roleNavigate(ROUTES.QUIZZES); }}>
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
            <Button variant="outline" onClick={() => roleNavigate(ROUTES.QUIZZES)}>返回列表</Button>
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
          roleNavigate(`/questions/${question.id}/edit`);
        }}
        onDelete={() => {
          setPreviewQuestion(null);
          toast.info('请在题库管理页删除题目');
        }}
      />
    </EditorPageShell>
  );
};
