/* eslint-disable react-hooks/set-state-in-effect */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCreateQuiz, useUpdateQuiz } from '../api/create-quiz';
import { useQuizDetail } from '../api/get-quizzes';
import { useQuestions } from '@/features/quiz-center/questions/api/get-questions';
import { useCreateQuestion, useUpdateQuestion } from '@/features/quiz-center/questions/api/create-question';
import { useLineTypeTags } from '@/features/knowledge/api/get-tags';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import type { Question, QuestionCreateRequest, QuestionType, QuizCreateRequest, QuizType } from '@/types/api';
import { showApiError } from '@/utils/error-handler';
import { apiClient } from '@/lib/api-client';
import type { InlineQuestionItem } from '../types';

import { QuestionBankPanel } from '@/features/quiz-center/questions/components/question-bank-panel';
import { QuizFormHeader } from './quiz-form-header';
import { QuizOutlinePanel } from './quiz-outline-panel';
import { QuizDocumentEditor } from './quiz-document-editor';

let _keyCounter = 0;
const nextKey = () => `q_${++_keyCounter}`;

/** 从 Question API 对象创建 InlineQuestionItem */
const questionToInline = (q: Question, collapsed = false): InlineQuestionItem => ({
  key: nextKey(),
  questionId: q.id,
  resourceUuid: q.resource_uuid,
  isCurrent: q.is_current,
  questionType: q.question_type,
  lineTagId: q.line_tag?.id,
  content: q.content,
  options: q.options || [],
  answer: q.answer || '',
  explanation: q.explanation || '',
  score: q.score || '1',
  saved: true,
  collapsed,
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
  const [filterLineTypeId, setFilterLineTypeId] = useState<string>('all');
  const [filterQuestionType, setFilterQuestionType] = useState<string>('all');

  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const initializedRef = useRef(false);

  const { data: quizData } = useQuizDetail(Number(id));
  const { data: lineTypes } = useLineTypeTags();
  const { data: questionsData, isLoading: questionsLoading } = useQuestions({
    pageSize: 1000,
    search: resourceSearch || undefined,
    lineTypeId: filterLineTypeId === 'all' ? undefined : Number(filterLineTypeId),
    questionType: filterQuestionType === 'all' ? undefined : filterQuestionType as QuestionType,
  });

  const createQuiz = useCreateQuiz();
  const updateQuiz = useUpdateQuiz();
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  // 初始化：编辑模式加载已有题目，需要逐个获取完整数据
  useEffect(() => {
    if (isEdit && quizData && !initializedRef.current) {
      setTitle(quizData.title);
      setQuizType(quizData.quiz_type || 'PRACTICE');
      setDuration(quizData.duration ?? undefined);
      setPassScore(quizData.pass_score ? Number(quizData.pass_score) : undefined);

      if (quizData.questions) {
        const sorted = [...quizData.questions].sort((a, b) => a.order - b.order);
        Promise.all(
          sorted.map((qq) => apiClient.get<Question>(`/questions/${qq.question}/`).then((q) => {
            const item = questionToInline(q, true);
            item.score = qq.score; // 保留试卷中的分值
            return item;
          }))
        ).then(setItems);
      }
      initializedRef.current = true;
    } else if (!isEdit && questionsData?.results && !initializedRef.current) {
      const qidParam = searchParams.get('question_ids');
      if (qidParam) {
        const qids = qidParam.split(',').map(Number).filter(Boolean);
        Promise.all(
          qids.map((qid) => apiClient.get<Question>(`/questions/${qid}/`).then((q) => questionToInline(q, true)))
        ).then(setItems);
      }
      initializedRef.current = true;
    }
  }, [isEdit, quizData, questionsData, searchParams]);

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
      const item = questionToInline(full, false);
      setItems(prev => [...prev, item]);
      setActiveKey(item.key);
      toast.success('已添加到试卷');
    } catch (e) {
      showApiError(e);
    }
  }, [items]);

  // 新建空白题目
  const handleAddBlank = useCallback(() => {
    const item: InlineQuestionItem = {
      key: nextKey(),
      questionId: null,
      resourceUuid: null,
      isCurrent: true,
      questionType: 'SINGLE_CHOICE',
      lineTagId: filterLineTypeId !== 'all' ? Number(filterLineTypeId) : undefined,
      content: '',
      options: [{ key: 'A', value: '' }, { key: 'B', value: '' }],
      answer: '',
      explanation: '',
      score: '1',
      saved: false,
      collapsed: false,
    };
    setItems(prev => [...prev, item]);
    setActiveKey(item.key);
  }, [filterLineTypeId]);

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
  const handleMoveItem = useCallback((key: string, direction: 'up' | 'down') => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.key === key);
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next;
    });
  }, []);

  // 折叠/展开
  const handleToggleCollapse = useCallback((key: string) => {
    setItems(prev => prev.map(i => i.key === key ? { ...i, collapsed: !i.collapsed } : i));
  }, []);

  // 排序
  const handleSortQuestions = useCallback(() => {
    const typeOrder: Record<string, number> = { SINGLE_CHOICE: 1, MULTIPLE_CHOICE: 2, TRUE_FALSE: 3, SHORT_ANSWER: 4 };
    setItems(prev => [...prev].sort((a, b) => (typeOrder[a.questionType] || 99) - (typeOrder[b.questionType] || 99)));
    toast.success('已按题型排序');
  }, []);

  // 预览题库中的题目（弹窗或其他方式，暂保留简单 toast）
  const handlePreviewQuestion = useCallback((_q: Question) => {
    toast.info('题目预览功能开发中');
  }, []);
  // 提交试卷：先保存所有未保存的题目，再提交试卷
  const handleSubmitQuiz = async () => {
    if (!title.trim()) return toast.error('请输入试卷名称');
    if (items.length === 0) return toast.warning('请添加题目');
    if (quizType === 'EXAM' && (!duration || !passScore)) return toast.error('考试模式需设置时长和及格分');

    // 验证所有题目
    for (const item of items) {
      if (!item.lineTagId) return toast.error(`第${items.indexOf(item) + 1}题未选择条线`);
      if (!item.content.trim()) return toast.error(`第${items.indexOf(item) + 1}题未填写内容`);
      if (!item.answer || (Array.isArray(item.answer) && item.answer.length === 0)) return toast.error(`第${items.indexOf(item) + 1}题未设置答案`);
    }

    try {
      // 保存所有未保存的题目
      const savedItems = await Promise.all(items.map(async (item) => {
        if (item.questionId && item.saved) return item;
        const formData: QuestionCreateRequest = {
          line_tag_id: item.lineTagId!,
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
        roleNavigate('quiz-center');
      } else {
        await createQuiz.mutateAsync(data);
        setSuccessModalOpen(true);
      }
    } catch (e) {
      showApiError(e);
    }
  };
  return (
    <div className="flex flex-col h-[calc(100vh-48px)] gap-5 bg-transparent">
      <QuizFormHeader
        isEdit={isEdit}
        quizData={quizData}
        title={title}
        quizType={quizType}
        onTitleChange={setTitle}
        onQuizTypeChange={setQuizType}
        onBack={() => navigate(-1)}
        onSubmit={handleSubmitQuiz}
        isSubmitting={createQuiz.isPending || updateQuiz.isPending}
      />

      <div className="flex flex-1 overflow-hidden gap-5">
        {/* Left: 试卷大纲 */}
        <QuizOutlinePanel
          items={items}
          activeKey={activeKey}
          quizType={quizType}
          duration={duration}
          passScore={passScore}
          onSelectItem={(key) => {
            setActiveKey(key);
            setItems(prev => prev.map(i => i.key === key ? { ...i, collapsed: false } : i));
          }}
          onDurationChange={setDuration}
          onPassScoreChange={setPassScore}
          onSortQuestions={handleSortQuestions}
        />

        {/* Center: 文档流编辑器 */}
        <QuizDocumentEditor
          items={items}
          lineTypes={lineTypes}
          activeKey={activeKey}
          onUpdateItem={handleUpdateItem}
          onRemoveItem={handleRemoveItem}
          onMoveItem={handleMoveItem}
          onToggleCollapse={handleToggleCollapse}
          onAddBlank={handleAddBlank}
          onFocusItem={setActiveKey}
        />

        {/* Right: 公共题库 */}
        <QuestionBankPanel
          resourceSearch={resourceSearch}
          onResourceSearchChange={setResourceSearch}
          filterLineTypeId={filterLineTypeId}
          onFilterLineTypeIdChange={setFilterLineTypeId}
          filterQuestionType={filterQuestionType}
          onFilterQuestionTypeChange={setFilterQuestionType}
          lineTypes={lineTypes}
          questionsData={filteredQuestionsData}
          questionsLoading={questionsLoading}
          onCreateNew={handleAddBlank}
          onPreview={handlePreviewQuestion}
          onAddQuestion={handleAddQuestion}
        />
      </div>

      <Dialog open={successModalOpen} onOpenChange={(open) => { if (!open) roleNavigate('quiz-center'); }}>
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
            <Button variant="outline" onClick={() => roleNavigate('quiz-center')}>返回列表</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
