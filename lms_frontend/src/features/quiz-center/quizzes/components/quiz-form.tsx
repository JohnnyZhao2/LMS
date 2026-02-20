/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCreateQuiz, useUpdateQuiz } from '../api/create-quiz';
import { useQuizDetail } from '../api/get-quizzes';
import { useQuestions } from '@/features/quiz-center/questions/api/get-questions';
import { useCreateQuestion, useUpdateQuestion } from '@/features/quiz-center/questions/api/create-question';
import { getQuestionTypeLabel } from '@/features/quiz-center/questions/constants';
import { useLineTypeTags } from '@/features/knowledge/api/get-tags';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import type { Question, QuestionCreateRequest, QuestionType, QuizCreateRequest, QuizType } from '@/types/api';
import { showApiError } from '@/utils/error-handler';
import { apiClient } from '@/lib/api-client';
import type { QuizQuestionItem } from '@/features/quiz-center/quizzes/types';

import { QuestionBankPanel } from '@/features/quiz-center/questions/components/question-bank-panel';

import { QuizFormHeader } from './quiz-form-header';
import { QuizStructurePanel } from './quiz-structure-panel';
import { QuizSidePanel } from './quiz-side-panel';

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

  const [selectedQuestions, setSelectedQuestions] = useState<QuizQuestionItem[]>([]);
  const [rightPanelMode, setRightPanelMode] = useState<'EDIT_QUESTION' | 'PREVIEW_QUESTION' | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);

  const [resourceSearch, setResourceSearch] = useState('');
  const [filterLineTypeId, setFilterLineTypeId] = useState<string>('all');
  const [filterQuestionType, setFilterQuestionType] = useState<string>('all');

  const [questionForm, setQuestionForm] = useState<Partial<QuestionCreateRequest>>({
    question_type: 'SINGLE_CHOICE',
    content: '',
    options: [],
    answer: '',
    explanation: '',
    score: '1',
  });

  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const initializedRef = useRef(false);

  const { data: quizData } = useQuizDetail(Number(id));
  const { data: lineTypes } = useLineTypeTags();
  const { data: questionsData, isLoading: questionsLoading } = useQuestions({
    pageSize: 1000,
    search: resourceSearch || undefined,
    lineTypeId: filterLineTypeId === 'all' ? undefined : Number(filterLineTypeId),
    questionType: filterQuestionType === 'all' ? undefined : filterQuestionType as QuestionType
  });

  const createQuiz = useCreateQuiz();
  const updateQuiz = useUpdateQuiz();
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();

  useEffect(() => {
    if (isEdit && quizData && !initializedRef.current) {
      setTitle(quizData.title);
      setQuizType(quizData.quiz_type || 'PRACTICE');
      setDuration(quizData.duration ?? undefined);
      setPassScore(quizData.pass_score ? Number(quizData.pass_score) : undefined);

      if (quizData.questions) {
        const items: QuizQuestionItem[] = quizData.questions
          .map((qq) => ({
            id: qq.question,
            resource_uuid: qq.resource_uuid,
            is_current: qq.is_current,
            content: qq.question_content,
            question_type: qq.question_type as QuestionType,
            question_type_display: qq.question_type_display || getQuestionTypeLabel(qq.question_type as QuestionType),
            score: qq.score,
            order: qq.order,
          }))
          .sort((a, b) => a.order - b.order);
        setSelectedQuestions(items);
      }
      initializedRef.current = true;
    } else if (!isEdit && questionsData?.results && !initializedRef.current) {
      const qidParam = searchParams.get('question_ids');
      if (qidParam) {
        const qids = qidParam.split(',').map(Number).filter(Boolean);
        const items = qids.map((qid, index) => {
          const q = questionsData.results.find(x => x.id === qid);
          if (!q) return null;
          return {
            id: q.id,
            resource_uuid: q.resource_uuid,
            is_current: q.is_current,
            content: q.content,
            question_type: q.question_type,
            question_type_display: q.question_type_display || getQuestionTypeLabel(q.question_type),
            score: q.score || '1',
            order: index + 1,
          };
        }).filter(Boolean) as QuizQuestionItem[];
        setSelectedQuestions(items);
      }
      initializedRef.current = true;
    }
  }, [isEdit, quizData, questionsData, searchParams]);

  const filteredQuestionsData = useMemo(() => {
    if (!questionsData) return undefined;
    const selectedUuids = new Set(selectedQuestions.map(q => q.resource_uuid));
    return {
      ...questionsData,
      results: questionsData.results.filter(q => !selectedUuids.has(q.resource_uuid))
    };
  }, [questionsData, selectedQuestions]);

  const handleAddQuestion = (q: Question) => {
    if (selectedQuestions.some(x => x.resource_uuid === q.resource_uuid)) return toast.warning('该题目已在试卷中');
    const newItem: QuizQuestionItem = {
      id: q.id,
      resource_uuid: q.resource_uuid,
      is_current: q.is_current,
      content: q.content,
      question_type: q.question_type,
      question_type_display: q.question_type_display || getQuestionTypeLabel(q.question_type),
      score: q.score || '1',
      order: selectedQuestions.length + 1,
    };
    setSelectedQuestions(prev => [...prev, newItem]);
    toast.success('已添加到试卷');
  };

  const moveQuestion = (idx: number, direction: 'up' | 'down') => {
    const newItems = [...selectedQuestions];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newItems.length) return;
    [newItems[idx], newItems[targetIdx]] = [newItems[targetIdx], newItems[idx]];
    setSelectedQuestions(newItems);
  };

  const removeQuestion = (idx: number) => {
    setSelectedQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleScoreChange = (id: number, score: string) => {
    setSelectedQuestions(prev => prev.map(q => q.id === id ? { ...q, score } : q));
  };

  const handleSortQuestions = () => {
    const typeOrder: Record<string, number> = {
      'SINGLE_CHOICE': 1,
      'MULTIPLE_CHOICE': 2,
      'TRUE_FALSE': 3,
      'SHORT_ANSWER': 4,
    };

    const sorted = [...selectedQuestions].sort((a, b) => {
      const orderA = typeOrder[a.question_type] || 99;
      const orderB = typeOrder[b.question_type] || 99;
      return orderA - orderB;
    });

    setSelectedQuestions(sorted);
    toast.success('已按题型一键排序');
  };

  const handleUpgradeQuestion = (index: number, resourceUuid: string) => {
    // 从题库中找到该 resource_uuid 的最新版本
    const latestQuestion = questionsData?.results.find(q => q.resource_uuid === resourceUuid);
    if (!latestQuestion) {
      toast.error('未找到最新版本');
      return;
    }
    // 替换该位置的题目
    setSelectedQuestions(prev => prev.map((q, idx) => {
      if (idx !== index) return q;
      return {
        id: latestQuestion.id,
        resource_uuid: latestQuestion.resource_uuid,
        is_current: latestQuestion.is_current,
        content: latestQuestion.content,
        question_type: latestQuestion.question_type,
        question_type_display: latestQuestion.question_type_display || getQuestionTypeLabel(latestQuestion.question_type),
        score: q.score, // 保留原分值
        order: q.order,
      };
    }));
    toast.success('已升级到最新版本');
  };

  const handleEditQuestion = async (item: QuizQuestionItem) => {
    try {
      const res = await apiClient.get<Question>(`/questions/${item.id}/`);
      setQuestionForm({
        line_tag_id: res.line_tag?.id,
        question_type: res.question_type,
        content: res.content,
        options: res.options || [],
        answer: res.answer,
        explanation: res.explanation || '',
        score: res.score || '1',
      });
      setEditingQuestionId(item.id);
      setPreviewQuestion(null);
      setRightPanelMode('EDIT_QUESTION');
    } catch (err) {
      showApiError(err);
    }
  };

  const handleCreateNew = () => {
    setQuestionForm({
      line_tag_id: Number(filterLineTypeId) || undefined,
      question_type: 'SINGLE_CHOICE',
      content: '',
      options: [{ key: 'A', value: '' }, { key: 'B', value: '' }],
      answer: '',
      explanation: '',
      score: '1',
    });
    setEditingQuestionId(null);
    setPreviewQuestion(null);
    setRightPanelMode('EDIT_QUESTION');
  };

  const handlePreviewQuestion = (question: Question) => {
    setPreviewQuestion(question);
    setEditingQuestionId(null);
    setRightPanelMode('PREVIEW_QUESTION');
  };

  const handleSaveQuestion = async () => {
    if (!questionForm.line_tag_id) return toast.error('请选择条线类型');
    if (!questionForm.content?.trim()) return toast.error('请输入内容');
    if (!questionForm.answer) return toast.error('请设置答案');

    try {
      if (editingQuestionId) {
        const updated = await updateQuestion.mutateAsync({ id: editingQuestionId, data: questionForm as QuestionCreateRequest });
        setSelectedQuestions(prev => prev.map(q => q.id === editingQuestionId ? { ...q, content: updated.content, score: updated.score || q.score } : q));
        toast.success('更新成功');
      } else {
        const created = await createQuestion.mutateAsync(questionForm as QuestionCreateRequest);
        setSelectedQuestions(prev => [...prev, {
          id: created.id,
          resource_uuid: created.resource_uuid,
          is_current: created.is_current,
          content: created.content,
          question_type: created.question_type,
          question_type_display: created.question_type_display || getQuestionTypeLabel(created.question_type),
          score: created.score || '1',
          order: prev.length + 1,
        }]);
        toast.success('创建并添加成功');
      }
      setRightPanelMode(null);
    } catch (e) {
      showApiError(e);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!title.trim()) return toast.error('请输入试卷名称');
    if (selectedQuestions.length === 0) return toast.warning('请添加题目');
    if (quizType === 'EXAM' && (!duration || !passScore)) return toast.error('考试模式需设置时长和及格分');

    try {
      const data: QuizCreateRequest = {
        title,
        quiz_type: quizType,
        duration: quizType === 'EXAM' ? duration : undefined,
        pass_score: quizType === 'EXAM' ? passScore : undefined,
        existing_question_ids: selectedQuestions.map(q => q.id),
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
    <div className="flex flex-col h-[calc(100vh-64px)] p-4 sm:p-6 gap-4 sm:gap-6 bg-transparent">
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

      <div className="flex flex-1 overflow-hidden gap-4 sm:gap-6">
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
          onCreateNew={handleCreateNew}
          onPreview={handlePreviewQuestion}
          onAddQuestion={handleAddQuestion}
        />

        <QuizStructurePanel
          selectedQuestions={selectedQuestions}
          quizType={quizType}
          duration={duration}
          passScore={passScore}
          onMoveQuestion={moveQuestion}
          onEditQuestion={handleEditQuestion}
          onRemoveQuestion={removeQuestion}
          onScoreChange={handleScoreChange}
          onDurationChange={setDuration}
          onPassScoreChange={setPassScore}
          onSortQuestions={handleSortQuestions}
          onUpgradeQuestion={handleUpgradeQuestion}
        />

        {/* Drawer Overlay for Side Panel */}
        {rightPanelMode && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => {
                setRightPanelMode(null);
                setPreviewQuestion(null);
                setEditingQuestionId(null);
              }}
            />
            {/* Drawer */}
            <div className="fixed right-0 top-0 bottom-0 z-50 flex h-full p-4 sm:p-6 shadow-2xl animate-in slide-in-from-right duration-300 ease-out">
              <QuizSidePanel
                mode={rightPanelMode}
                editingQuestionId={editingQuestionId}
                previewQuestion={previewQuestion}
                onBackToInfo={() => {
                  setRightPanelMode(null);
                  setPreviewQuestion(null);
                  setEditingQuestionId(null);
                }}
                questionForm={questionForm}
                setQuestionForm={setQuestionForm}
                lineTypes={lineTypes}
                onSaveQuestion={handleSaveQuestion}
                isSavingQuestion={createQuestion.isPending || updateQuestion.isPending}
              />
            </div>
          </>
        )}
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
