"use client"

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus,
  Send,
  FileEdit,
  Loader2,
  Search,
  ArrowLeft,
  Trash2,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
  Settings,
  FileText,
  Eye,
  CheckCircle2,
} from 'lucide-react';

import {
  Input,
  Button,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Label,
  Badge,
} from '@/components/ui';

import { useCreateQuiz, useUpdateQuiz } from '../api/create-quiz';
import { useQuizDetail } from '../api/get-quizzes';
import { useQuestions } from '@/features/test-center/questions/api/get-questions';
import { useCreateQuestion, useUpdateQuestion } from '@/features/test-center/questions/api/create-question';
import { useLineTypeTags } from '@/features/knowledge/api/get-tags';
import { ROUTES } from '@/config/routes';
import type { QuizCreateRequest, QuestionType, QuestionCreateRequest, QuizType, Question } from '@/types/api';
import { showApiError } from '@/utils/error-handler';
import { apiClient } from '@/lib/api-client';

import { OptionsInput, AnswerInput } from './question-form-inputs';
import { getQuestionTypeLabel, QUESTION_TYPE_LABELS, getQuestionTypeStyle } from '@/features/test-center/questions/constants';
import { cn } from '@/lib/utils';

interface QuizQuestionItem {
  id: number;
  content: string;
  question_type: QuestionType;
  question_type_display: string;
  score: string;
  order: number;
}

export const QuizForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  // --- 状态管理 ---
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quizType, setQuizType] = useState<QuizType>('PRACTICE');
  const [duration, setDuration] = useState<number | undefined>();
  const [passScore, setPassScore] = useState<number | undefined>();

  const [selectedQuestions, setSelectedQuestions] = useState<QuizQuestionItem[]>([]);
  const [rightPanelMode, setRightPanelMode] = useState<'QUIZ_INFO' | 'EDIT_QUESTION'>('QUIZ_INFO');
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
    difficulty: 'MEDIUM',
  });

  const [publishModalVisible, setPublishModalVisible] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [createdQuizId, setCreatedQuizId] = useState<number | null>(null);
  const initializedRef = useRef(false);

  // --- API 调用 ---
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

  // --- 初始化逻辑 ---
  useEffect(() => {
    if (isEdit && quizData && !initializedRef.current) {
      setTitle(quizData.title);
      setDescription(quizData.description || '');
      setQuizType(quizData.quiz_type || 'PRACTICE');
      setDuration(quizData.duration ?? undefined);
      setPassScore(quizData.pass_score ? Number(quizData.pass_score) : undefined);

      if (quizData.questions) {
        const items: QuizQuestionItem[] = quizData.questions
          .map((qq) => ({
            id: qq.question,
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
          return { id: q.id, content: q.content, question_type: q.question_type, question_type_display: q.question_type_display || getQuestionTypeLabel(q.question_type), score: q.score || '1', order: index + 1 };
        }).filter(Boolean) as QuizQuestionItem[];
        setSelectedQuestions(items);
      }
      initializedRef.current = true;
    }
  }, [isEdit, quizData, questionsData, searchParams]);

  // --- 计算属性 ---
  const totalScore = useMemo(() => selectedQuestions.reduce((sum, q) => sum + Number(q.score || 0), 0), [selectedQuestions]);
  const typeStats = useMemo(() => {
    const stats: Record<string, number> = {};
    selectedQuestions.forEach((q) => {
      const label = getQuestionTypeLabel(q.question_type);
      stats[label] = (stats[label] || 0) + 1;
    });
    return stats;
  }, [selectedQuestions]);

  // --- 题库操作 ---
  const handleAddQuestion = (q: Question) => {
    if (selectedQuestions.some(x => x.id === q.id)) return toast.warning('题目已在试卷中');
    const newItem: QuizQuestionItem = {
      id: q.id,
      content: q.content,
      question_type: q.question_type,
      question_type_display: q.question_type_display || getQuestionTypeLabel(q.question_type),
      score: q.score || '1',
      order: selectedQuestions.length + 1,
    };
    setSelectedQuestions(prev => [...prev, newItem]);
    toast.success('已添加到试卷');
  };

  // --- 试卷操作 ---
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

  const handleEditQuestion = async (item: QuizQuestionItem) => {
    try {
      const res = await apiClient.get<Question>(`/questions/${item.id}/`);
      setQuestionForm({
        line_type_id: res.line_type?.id,
        question_type: res.question_type,
        content: res.content,
        options: res.options || [],
        answer: res.answer,
        explanation: res.explanation || '',
        score: res.score || '1',
        difficulty: res.difficulty || 'MEDIUM',
      });
      setEditingQuestionId(item.id);
      setRightPanelMode('EDIT_QUESTION');
    } catch (err) { showApiError(err); }
  };

  const handleCreateNew = () => {
    setQuestionForm({ line_type_id: Number(filterLineTypeId) || undefined, question_type: 'SINGLE_CHOICE', content: '', options: [{ key: 'A', value: '' }, { key: 'B', value: '' }], answer: '', explanation: '', score: '1', difficulty: 'MEDIUM' });
    setEditingQuestionId(null);
    setRightPanelMode('EDIT_QUESTION');
  };

  const handleSaveQuestion = async () => {
    if (!questionForm.line_type_id) return toast.error('请选择条线类型');
    if (!questionForm.content?.trim()) return toast.error('请输入内容');
    if (!questionForm.answer) return toast.error('请设置答案');

    try {
      if (editingQuestionId) {
        const updated = await updateQuestion.mutateAsync({ id: editingQuestionId, data: questionForm as QuestionCreateRequest });
        setSelectedQuestions(prev => prev.map(q => q.id === editingQuestionId ? { ...q, content: updated.content, score: updated.score || q.score } : q));
        toast.success('更新成功');
      } else {
        const created = await createQuestion.mutateAsync(questionForm as QuestionCreateRequest);
        setSelectedQuestions(prev => [...prev, { id: created.id, content: created.content, question_type: created.question_type, question_type_display: created.question_type_display || getQuestionTypeLabel(created.question_type), score: created.score || '1', order: prev.length + 1 }]);
        toast.success('创建并添加成功');
      }
      setRightPanelMode('QUIZ_INFO');
    } catch (e) { showApiError(e); }
  };

  const handleSubmitQuiz = async () => {
    if (!title.trim()) return toast.error('请输入试卷名称');
    if (selectedQuestions.length === 0) return toast.warning('请添加题目');
    if (quizType === 'EXAM' && (!duration || !passScore)) return toast.error('考试模式需设置时长和及格分');

    try {
      const data: QuizCreateRequest = { title, description, quiz_type: quizType, duration: quizType === 'EXAM' ? duration : undefined, pass_score: quizType === 'EXAM' ? passScore : undefined, existing_question_ids: selectedQuestions.map(q => q.id) };
      if (isEdit) {
        await updateQuiz.mutateAsync({ id: Number(id), data });
        toast.success('试卷更新成功');
        navigate(ROUTES.TEST_CENTER);
      } else {
        const res = await createQuiz.mutateAsync(data);
        setCreatedQuizId(res.id);
        setPublishModalVisible(true);
      }
    } catch (e) { showApiError(e); }
  };

  const tagStyle = (type: QuestionType) => getQuestionTypeStyle(type);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header - 复用任务表单的样式 */}
      <div className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-gray-600 hover:text-primary-500">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-px h-5 bg-gray-200" />
          <h1 className="text-lg font-semibold text-gray-900">{isEdit ? '编辑试卷' : '创建全新试卷'}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>取消</Button>
          <Button onClick={handleSubmitQuiz} className="px-5 font-semibold">
            {(createQuiz.isPending || updateQuiz.isPending) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            完成并提交
          </Button>
        </div>
      </div>

      {/* Body - Three columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左栏：公共题库 - 复用任务表单资源库样式 */}
        <div className="w-80 flex flex-col bg-white border-r border-gray-200 shrink-0">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <LayoutGrid className="w-4 h-4 text-primary-500" />
              公共题库
            </div>
            <Button variant="ghost" size="sm" onClick={handleCreateNew} className="text-primary-500 hover:text-primary-600 hover:bg-primary-50 h-7">
              + 新建题目
            </Button>
          </div>

          <div className="px-5 mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="检索题目内容..." className="pl-9" value={resourceSearch} onChange={e => setResourceSearch(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2 px-5 mb-4">
            <Select value={filterLineTypeId} onValueChange={setFilterLineTypeId}>
              <SelectTrigger className="flex-1 text-xs"><SelectValue placeholder="全部条线" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部条线</SelectItem>
                {lineTypes?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterQuestionType} onValueChange={setFilterQuestionType}>
              <SelectTrigger className="flex-1 text-xs"><SelectValue placeholder="全部题型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部题型</SelectItem>
                {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-5">
            {questionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : questionsData?.results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <FileText className="w-8 h-8 mb-2" />
                <span className="text-sm">暂无资源</span>
              </div>
            ) : (
              <div className="space-y-2">
                {questionsData?.results.map(q => (
                  <div
                    key={q.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 transition-all hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 group"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-primary-500 text-white"
                    >
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setPreviewQuestion(q)}>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={cn("text-[10px] px-1.5 h-5", tagStyle(q.question_type).bg, tagStyle(q.question_type).color)}>
                          {getQuestionTypeLabel(q.question_type)}
                        </Badge>
                        <span className="text-xs text-gray-400">#{q.id}</span>
                      </div>
                      <div className="text-sm text-gray-700 line-clamp-2 group-hover:text-primary-600 flex items-center gap-1">
                        <span className="truncate">{q.content}</span>
                        <Eye className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary-500 hover:bg-primary-50 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddQuestion(q);
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 题目预览弹窗 */}
        <Dialog open={!!previewQuestion} onOpenChange={(open) => !open && setPreviewQuestion(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${previewQuestion ? getQuestionTypeStyle(previewQuestion.question_type).bg : ''} ${previewQuestion ? getQuestionTypeStyle(previewQuestion.question_type).color : ''}`}>
                  {previewQuestion ? getQuestionTypeLabel(previewQuestion.question_type) : ''}
                </span>
                题目内容预览
              </DialogTitle>
            </DialogHeader>

            {previewQuestion && (
              <div className="space-y-6 py-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">题目正文</h4>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100">
                    {previewQuestion.content}
                  </div>
                </div>

                {(previewQuestion.question_type === 'SINGLE_CHOICE' || previewQuestion.question_type === 'MULTIPLE_CHOICE') && previewQuestion.options && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">备选项</h4>
                    <div className="grid gap-2">
                      {previewQuestion.options.map((opt) => {
                        const isCorrect = Array.isArray(previewQuestion.answer)
                          ? previewQuestion.answer.includes(opt.key)
                          : previewQuestion.answer === opt.key;
                        return (
                          <div
                            key={opt.key}
                            className={`flex items-start gap-3 p-3 rounded-lg border text-sm transition-all ${isCorrect ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-white'
                              }`}
                          >
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold shrink-0 ${isCorrect ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'
                              }`}>
                              {opt.key}
                            </span>
                            <span className="flex-1 pt-0.5">{opt.value}</span>
                            {isCorrect && (
                              <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {previewQuestion.question_type === 'TRUE_FALSE' && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">正确答案</h4>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full border border-green-100 text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      {previewQuestion.answer === 'TRUE' ? '正确' : '错误'}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">解析说明</h4>
                  <div className="text-sm text-gray-600 bg-amber-50/50 p-4 rounded-lg border border-amber-100 italic">
                    {previewQuestion.explanation || '暂无解析'}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <Button variant="outline" onClick={() => setPreviewQuestion(null)}>关闭</Button>
                  <Button
                    className="bg-primary-600 text-white hover:bg-primary-700"
                    onClick={() => {
                      handleAddQuestion(previewQuestion);
                      setPreviewQuestion(null);
                    }}
                  >
                    全部内容预览无误，添加到试卷
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 中栏：试卷内容结构 - 复用任务表单流程样式 */}
        <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
          <div className="flex items-center gap-2 px-6 py-4 text-sm font-semibold text-gray-900 bg-white border-b border-gray-200">
            <FileText className="w-4 h-4 text-primary-500" />
            试卷内容结构
            <Badge variant="secondary" className="ml-2 bg-gray-100">{selectedQuestions.length} 道题目</Badge>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {selectedQuestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <LayoutGrid className="w-16 h-16 mb-4 text-gray-300" />
                <span className="text-base">从左侧题库点击添加到试卷</span>
              </div>
            ) : (
              <div className="relative w-full max-w-[560px] mx-auto pl-12">
                {/* 连接线 */}
                {selectedQuestions.length > 1 && (
                  <div
                    className="absolute left-[17px] top-[18px] w-0.5 bg-gray-200"
                    style={{ height: `calc(100% - 36px)` }}
                  />
                )}
                <div className="space-y-4">
                  {selectedQuestions.map((item, idx) => (
                    <div key={item.id} className="relative flex gap-4 animate-fadeInUp">
                      {/* 左侧图标 */}
                      <div className="absolute -left-12 top-0 flex flex-col items-center">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-md"
                          style={{ background: 'var(--color-primary-500)' }}
                        >
                          <FileText className="w-4 h-4" />
                        </div>
                      </div>
                      {/* 题目卡片 */}
                      <div className="flex-1 flex flex-col gap-2 p-4 bg-white border border-gray-200 rounded-xl transition-all hover:border-primary-300 hover:shadow-md">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={cn("text-[10px] px-1.5", tagStyle(item.question_type).bg, tagStyle(item.question_type).color)}>
                                {idx + 1}. {getQuestionTypeLabel(item.question_type)}
                              </Badge>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.5}
                                value={Number(item.score)}
                                onChange={(e) => setSelectedQuestions(prev => prev.map(q => q.id === item.id ? { ...q, score: e.target.value } : q))}
                                className="w-16 h-6 text-xs text-center"
                              />
                              <span className="text-xs text-gray-400">分</span>
                            </div>
                            <div className="text-sm text-gray-800 line-clamp-3">{item.content}</div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={idx === 0} onClick={() => moveQuestion(idx, 'up')}>
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={idx === selectedQuestions.length - 1} onClick={() => moveQuestion(idx, 'down')}>
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-500 hover:text-primary-600 hover:bg-primary-50" onClick={() => handleEditQuestion(item)}>
                              <FileEdit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => removeQuestion(idx)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右栏：配置面板 - 复用任务表单配置样式 */}
        <div className="w-[400px] flex flex-col bg-white border-l border-gray-200 shrink-0 overflow-y-auto">
          <div className="flex items-center gap-2 px-5 py-4 text-sm font-semibold text-gray-900 border-b border-gray-200">
            {rightPanelMode === 'QUIZ_INFO' ? (
              <><Settings className="w-4 h-4 text-primary-500" />试卷配置属性</>
            ) : (
              <><FileEdit className="w-4 h-4 text-emerald-500" />{editingQuestionId ? '编辑题目' : '新建题目'}</>
            )}
            {rightPanelMode === 'EDIT_QUESTION' && (
              <Button variant="ghost" size="sm" onClick={() => setRightPanelMode('QUIZ_INFO')} className="ml-auto text-gray-500">
                返回
              </Button>
            )}
          </div>

          {rightPanelMode === 'QUIZ_INFO' ? (
            <div className="p-5 space-y-4 bg-white rounded-lg mx-5 mt-5 border border-gray-100">
              <div className="space-y-2">
                <Label>试卷标题</Label>
                <Input placeholder="输入试卷标题..." value={title} onChange={e => setTitle(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>试卷描述</Label>
                <Textarea placeholder="说明试卷的考核重点..." value={description} onChange={e => setDescription(e.target.value)} rows={3} className="resize-none" />
              </div>

              <div className="space-y-2">
                <Label>试卷性质</Label>
                <div className="flex p-1 bg-gray-100 rounded-lg gap-1">
                  <button className={cn("flex-1 py-2 text-sm font-semibold rounded-md transition-all", quizType === 'PRACTICE' ? "bg-white text-primary-600 shadow-sm" : "text-gray-500 hover:text-gray-700")} onClick={() => setQuizType('PRACTICE')}>练习模式</button>
                  <button className={cn("flex-1 py-2 text-sm font-semibold rounded-md transition-all", quizType === 'EXAM' ? "bg-red-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700")} onClick={() => setQuizType('EXAM')}>考试模式</button>
                </div>
              </div>

              {quizType === 'EXAM' && (
                <div className="p-4 bg-red-50/50 border border-red-100 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-red-600">考试时长 (分钟)</Label>
                      <Input type="number" value={duration ?? ''} onChange={e => setDuration(Number(e.target.value) || undefined)} className="bg-white border-red-200" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-red-600">合格分数线</Label>
                      <Input type="number" value={passScore ?? ''} onChange={e => setPassScore(Number(e.target.value) || undefined)} className="bg-white border-red-200" />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="bg-primary-50/50 p-4 rounded-xl border border-primary-50/80">
                  <div className="text-xs text-primary-600 font-semibold mb-1">当前总分</div>
                  <div className="text-2xl font-bold text-primary-700">{totalScore}<span className="text-sm ml-1 font-normal">pts</span></div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="text-xs text-gray-500 font-semibold mb-1">各题分布</div>
                  <div className="space-y-1 mt-2">
                    {Object.entries(typeStats).map(([t, c]) => (
                      <div key={t} className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">{t}</span>
                        <span className="text-gray-900 font-semibold">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <Label>题目类别与题型</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={questionForm.line_type_id?.toString()} onValueChange={val => setQuestionForm(prev => ({ ...prev, line_type_id: Number(val) }))}>
                    <SelectTrigger><SelectValue placeholder="选择所属条线" /></SelectTrigger>
                    <SelectContent>
                      {lineTypes?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={questionForm.question_type} onValueChange={val => setQuestionForm(prev => ({ ...prev, question_type: val as QuestionType }))} disabled={!!editingQuestionId}>
                    <SelectTrigger><SelectValue placeholder="题型" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>题目核心内容</Label>
                <Textarea placeholder="输入题目内容..." value={questionForm.content} onChange={e => setQuestionForm(prev => ({ ...prev, content: e.target.value }))} className="min-h-[100px]" />
              </div>

              {(questionForm.question_type === 'SINGLE_CHOICE' || questionForm.question_type === 'MULTIPLE_CHOICE') ? (
                <div className="space-y-2">
                  <Label className="text-primary-600">备选项与正确答案</Label>
                  <OptionsInput
                    questionType={questionForm.question_type as QuestionType}
                    value={questionForm.options || []}
                    onChange={opts => setQuestionForm(prev => ({ ...prev, options: opts }))}
                    answer={questionForm.answer || ''}
                    onAnswerChange={ans => setQuestionForm(prev => ({ ...prev, answer: ans }))}
                  />
                  <p className="text-[10px] text-gray-400 mt-1 italic">* 点击选项前的图标即可直接设置该项为正确答案</p>
                </div>
              ) : (
                <div className="space-y-2 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <Label className="text-emerald-700">标准正确答案</Label>
                  <AnswerInput
                    questionType={questionForm.question_type as QuestionType}
                    options={questionForm.options || []}
                    value={questionForm.answer || ''}
                    onChange={ans => setQuestionForm(prev => ({ ...prev, answer: ans }))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>考点解析</Label>
                <Textarea placeholder="提供给学员的解析内容..." value={questionForm.explanation} onChange={e => setQuestionForm(prev => ({ ...prev, explanation: e.target.value }))} className="h-20" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">默认分值</Label>
                  <Input type="number" value={questionForm.score} onChange={e => setQuestionForm(prev => ({ ...prev, score: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">预设难度</Label>
                  <Select value={questionForm.difficulty} onValueChange={v => setQuestionForm(prev => ({ ...prev, difficulty: v as 'EASY' | 'MEDIUM' | 'HARD' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EASY">简单</SelectItem>
                      <SelectItem value="MEDIUM">中等</SelectItem>
                      <SelectItem value="HARD">困难</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setRightPanelMode('QUIZ_INFO')}>放弃编辑</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveQuestion}>
                  {createQuestion.isPending || updateQuestion.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : '完成并同步'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 创建成功对话框 */}
      <Dialog open={publishModalVisible} onOpenChange={v => { if (!v) navigate(ROUTES.TEST_CENTER); }}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              试卷创建成功
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              恭喜！试卷 <span className="font-bold text-gray-900">「{title}」</span> 已成功保存至系统库。
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => navigate(ROUTES.TEST_CENTER)}>返回列表</Button>
              <Button onClick={() => navigate(`/tasks/create?quiz_id=${createdQuizId}`)}>立即发布任务</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
