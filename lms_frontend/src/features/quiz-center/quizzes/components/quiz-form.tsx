import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ROUTES } from '@/config/routes';
import { useCreateQuestion, useUpdateQuestion } from '@/features/questions/api/create-question';
import { useQuestions } from '@/features/questions/api/get-questions';
import { useSpaceTypeTags } from '@/features/knowledge/api/get-tags';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { apiClient } from '@/lib/api-client';
import type { Question, QuestionCreateRequest, QuestionType, QuizCreateRequest, QuizType } from '@/types/api';
import { showApiError } from '@/utils/error-handler';
import { useCreateQuiz, useUpdateQuiz } from '../api/create-quiz';
import { useQuizDetail } from '../api/get-quizzes';
import type { InlineQuestionItem } from '../types';

import { QuestionBankPanel } from '@/features/questions/components/question-bank-panel';
import { QuizFormHeader } from './quiz-form-header';
import { QuizOutlinePanel } from './quiz-outline-panel';
import { QuizDocumentEditor } from './quiz-document-editor';

let _keyCounter = 0;
const nextKey = () => `q_${++_keyCounter}`;
const syncKeyCounter = (items: InlineQuestionItem[]) => {
  const maxKey = items.reduce((currentMax, item) => {
    const match = /^q_(\d+)$/.exec(item.key);
    if (!match) return currentMax;
    return Math.max(currentMax, Number(match[1]));
  }, 0);
  _keyCounter = Math.max(_keyCounter, maxKey);
};

/** 从 Question API 对象创建 InlineQuestionItem */
const questionToInline = (q: Question): InlineQuestionItem => ({
  key: nextKey(),
  questionId: q.id,
  resourceUuid: q.resource_uuid,
  isCurrent: q.is_current,
  questionType: q.question_type,
  spaceTagId: q.space_tag?.id ?? null,
  content: q.content,
  options: q.options || [],
  answer: q.answer || '',
  explanation: q.explanation || '',
  score: q.score || '1',
  saved: true,
});
export const QuizForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { roleNavigate } = useRoleNavigate();
  const isEdit = !!id;

  const [title, setTitle] = useState('');
  const [quizType, setQuizType] = useState<QuizType>('PRACTICE');
  const [duration, setDuration] = useState<number | undefined>();
  const [passScore, setPassScore] = useState<number | undefined>();

  // 文档流：所有题目的内联编辑数据
  const [items, setItems] = useState<InlineQuestionItem[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const [resourceSearch, setResourceSearch] = useState('');
  const [filterSpaceTypeId, setFilterSpaceTypeId] = useState<string>('all');
  const [filterQuestionType, setFilterQuestionType] = useState<string>('all');

  const [successModalOpen, setSuccessModalOpen] = useState(false);
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

  // 初始化：编辑模式加载已有题目，需要逐个获取完整数据
  useEffect(() => {
    if (initializedRef.current) return undefined;

    let cancelled = false;

    const bootstrap = async () => {
      if (isEdit) {
        if (!quizData) return;

        const sorted = [...(quizData.questions ?? [])].sort((a, b) => a.order - b.order);
        const loadedItems = await Promise.all(
          sorted.map((qq) => apiClient.get<Question>(`/questions/${qq.question}/`).then((q) => {
            const item = questionToInline(q);
            item.score = qq.score;
            return item;
          })),
        );

        if (cancelled) return;

        syncKeyCounter(loadedItems);
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
          qids.map((qid) => apiClient.get<Question>(`/questions/${qid}/`).then((q) => questionToInline(q))),
        );
        if (cancelled) return;
      }

      syncKeyCounter(loadedItems);
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

  // 过滤已添加的题目
  const filteredQuestionsData = useMemo(() => {
    if (!questionsData) return undefined;
    const usedUuids = new Set(items.filter(i => i.resourceUuid).map(i => i.resourceUuid));
    return { ...questionsData, results: questionsData.results.filter(q => !usedUuids.has(q.resource_uuid)) };
  }, [questionsData, items]);
  // 从题库添加题目
  const handleAddQuestion = useCallback(async (q: Question) => {
    if (items.some(i => i.resourceUuid === q.resource_uuid)) return toast.warning('该题目已在试卷中');
    try {
      const full = await apiClient.get<Question>(`/questions/${q.id}/`);
      const item = questionToInline(full);
      appendItemPreservingFocus(item);
      toast.success('已添加到试卷');
    } catch (e) {
      showApiError(e);
    }
  }, [appendItemPreservingFocus, items]);

  // 新建空白题目
  const handleAddBlank = useCallback((questionType: QuestionType = 'SINGLE_CHOICE') => {
    const isChoiceType = questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE';
    const item: InlineQuestionItem = {
      key: nextKey(),
      questionId: null,
      resourceUuid: null,
      isCurrent: true,
      questionType,
      spaceTagId: filterSpaceTypeId !== 'all' ? Number(filterSpaceTypeId) : null,
      content: '',
      options: isChoiceType ? [{ key: 'A', value: '' }, { key: 'B', value: '' }, { key: 'C', value: '' }, { key: 'D', value: '' }] : [],
      answer: '',
      explanation: '',
      score: '1',
      saved: false,
    };
    appendItemPreservingFocus(item);
  }, [appendItemPreservingFocus, filterSpaceTypeId]);

  // 更新某题的字段
  const handleUpdateItem = useCallback((key: string, patch: Partial<InlineQuestionItem>) => {
    setItems(prev => prev.map(i => i.key === key ? { ...i, ...patch, saved: false } : i));
  }, []);

  // 删除某题
  const handleRemoveItem = useCallback((key: string) => {
    setItems(prev => prev.filter(i => i.key !== key));
    if (activeKey === key) setActiveKey(null);
  }, [activeKey]);

  // 移动题目
  const handleReorderItems = useCallback((activeKey: string, overKey: string) => {
    setItems(prev => {
      const oldIndex = prev.findIndex((item) => item.key === activeKey);
      const newIndex = prev.findIndex((item) => item.key === overKey);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  // 预览题库中的题目（弹窗或其他方式，暂保留简单 toast）
  const handlePreviewQuestion = useCallback((question: Question) => {
    void question;
    toast.info('题目预览功能开发中');
  }, []);
  // 提交试卷：先保存所有未保存的题目，再提交试卷
  const handleSubmitQuiz = async () => {
    if (!title.trim()) return toast.error('请输入试卷名称');
    if (items.length === 0) return toast.warning('请添加题目');
    if (quizType === 'EXAM' && (!duration || !passScore)) return toast.error('考试模式需设置时长和及格分');

    // 验证所有题目
    for (const [index, item] of items.entries()) {
      if (!item.content.trim()) return toast.error(`第${index + 1}题未填写内容`);
      if (!item.answer || (Array.isArray(item.answer) && item.answer.length === 0)) return toast.error(`第${index + 1}题未设置答案`);
    }

    try {
      // 保存所有未保存的题目
      const savedItems = await Promise.all(items.map(async (item) => {
        if (item.questionId && item.saved) return item;
        const formData: QuestionCreateRequest = {
          space_tag_id: item.spaceTagId ?? null,
          question_type: item.questionType,
          content: item.content,
          options: item.options,
          answer: item.answer as string,
          explanation: item.explanation,
          score: item.score,
        };
        if (item.questionId) {
          const updated = await updateQuestion.mutateAsync({ id: item.questionId, data: formData });
          return { ...item, questionId: updated.id, resourceUuid: updated.resource_uuid, saved: true };
        }
        const created = await createQuestion.mutateAsync(formData);
        return { ...item, questionId: created.id, resourceUuid: created.resource_uuid, saved: true };
      }));

      const data: QuizCreateRequest = {
        title,
        quiz_type: quizType,
        duration: quizType === 'EXAM' ? duration : undefined,
        pass_score: quizType === 'EXAM' ? passScore : undefined,
        existing_question_ids: savedItems.map(i => i.questionId!),
      };

      if (isEdit) {
        await updateQuiz.mutateAsync({ id: Number(id), data });
        toast.success('试卷更新成功');
        roleNavigate(ROUTES.QUIZZES);
      } else {
        await createQuiz.mutateAsync(data);
        setSuccessModalOpen(true);
      }
    } catch (e) {
      showApiError(e);
    }
  };
  return (
    <div className="flex h-[calc(100vh-48px)] min-h-0 flex-col gap-2 overflow-hidden bg-muted/20 py-2">
      <QuizFormHeader
        isEdit={isEdit}
        quizData={quizData}
        title={title}
        quizType={quizType}
        onTitleChange={setTitle}
        onBack={() => navigate(-1)}
        onSubmit={handleSubmitQuiz}
        isSubmitting={isSubmitting}
      />

      <div className="flex-1 overflow-auto">
        <div className="grid h-full min-w-[1360px] grid-cols-[16rem_minmax(0,1fr)_18rem] gap-3 xl:grid-cols-[18rem_minmax(0,1fr)_20rem]">
          <div className="min-h-0 overflow-hidden rounded-xl border border-border bg-background">
            <QuizOutlinePanel
              items={items}
              activeKey={activeKey}
              quizType={quizType}
              duration={duration}
              passScore={passScore}
              onQuizTypeChange={setQuizType}
              onSelectItem={(key) => {
                setActiveKey(key);
              }}
              onReorderItems={handleReorderItems}
              onDurationChange={setDuration}
              onPassScoreChange={setPassScore}
            />
          </div>

          <div className="min-h-0 overflow-hidden rounded-xl border border-border bg-background">
            <QuizDocumentEditor
              items={items}
              activeKey={activeKey}
              onUpdateItem={handleUpdateItem}
              onRemoveItem={handleRemoveItem}
              onReorderItems={handleReorderItems}
              onAddBlank={handleAddBlank}
              onFocusItem={setActiveKey}
            />
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
              <div className="w-2 h-2 rounded-full bg-secondary-500 animate-pulse"></div>
              试卷创建成功
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <p className="text-sm text-text-muted leading-relaxed">
              恭喜！试卷 <span className="font-bold text-foreground">「{title}」</span> 已成功保存至系统库。
            </p>
            <Button variant="outline" onClick={() => roleNavigate(ROUTES.QUIZZES)}>返回列表</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
