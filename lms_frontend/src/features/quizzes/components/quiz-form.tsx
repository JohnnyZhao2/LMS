import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Send,
  GripVertical,
  ArrowUp,
  ArrowDown,
  FileEdit,
  X,
  Loader2,
} from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

import { useCreateQuiz, useUpdateQuiz } from '../api/create-quiz';
import { useQuizDetail } from '../api/get-quizzes';
import { useQuestions } from '@/features/questions/api/get-questions';
import { useCreateQuestion } from '@/features/questions/api/create-question';
import { useLineTypeTags } from '@/features/knowledge/api/get-tags';
import { ROUTES } from '@/config/routes';
import type { QuizCreateRequest, Question, QuestionType, QuestionCreateRequest, QuizType } from '@/types/api';
import { showApiError } from '@/utils/error-handler';

/**
 * 试卷中的题目项（带排序信息）
 */
interface QuizQuestionItem {
  id: number;
  content: string;
  question_type: QuestionType;
  question_type_display: string;
  score: string;
  order: number;
}

/**
 * 获取题目类型显示名称
 */
const getQuestionTypeDisplay = (type: QuestionType): string => {
  const labels: Record<QuestionType, string> = {
    SINGLE_CHOICE: '单选题',
    MULTIPLE_CHOICE: '多选题',
    TRUE_FALSE: '判断题',
    SHORT_ANSWER: '简答题',
  };
  return labels[type] || type;
};

/**
 * 获取题型标签颜色
 */
const getTypeTagStyle = (type: QuestionType) => {
  const styles: Record<QuestionType, { bg: string; text: string }> = {
    SINGLE_CHOICE: { bg: 'bg-blue-100', text: 'text-blue-700' },
    MULTIPLE_CHOICE: { bg: 'bg-green-100', text: 'text-green-700' },
    TRUE_FALSE: { bg: 'bg-orange-100', text: 'text-orange-700' },
    SHORT_ANSWER: { bg: 'bg-purple-100', text: 'text-purple-700' },
  };
  return styles[type] || { bg: 'bg-gray-100', text: 'text-gray-700' };
};

/**
 * 可排序的题目行组件
 */
const SortableQuestionRow: React.FC<{
  item: QuizQuestionItem;
  index: number;
  onRemove: (id: number) => void;
  onScoreChange: (id: number, score: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  isFirst: boolean;
  isLast: boolean;
}> = ({ item, index, onRemove, onScoreChange, onMoveUp, onMoveDown, isFirst, isLast }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const tagStyle = getTypeTagStyle(item.question_type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 ${isDragging ? 'bg-blue-50' : 'bg-white'
        }`}
      {...attributes}
    >
      {/* 拖拽手柄 */}
      <div {...listeners} className="cursor-grab text-gray-400 p-1">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* 序号 */}
      <div className="w-8 text-gray-600 font-medium text-sm">
        {index + 1}.
      </div>

      {/* 题型标签 */}
      <div className="w-20">
        <span className={`px-2 py-1 rounded text-xs font-medium ${tagStyle.bg} ${tagStyle.text}`}>
          {getQuestionTypeDisplay(item.question_type)}
        </span>
      </div>

      {/* 题目内容 */}
      <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-gray-700">
        {item.content}
      </div>

      {/* 分值 */}
      <div className="w-24">
        <Input
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={Number(item.score)}
          onChange={(e) => onScoreChange(item.id, Number(e.target.value) || 0)}
          className="h-8 text-sm w-20"
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isFirst}
          onClick={() => onMoveUp(index)}
          className="h-7 w-7 p-0"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isLast}
          onClick={() => onMoveDown(index)}
          className="h-7 w-7 p-0"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(item.id)}
          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

/**
 * 试卷表单组件 - ShadCN UI 版本
 */
export const QuizForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  // 表单状态
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quizType, setQuizType] = useState<QuizType>('PRACTICE');
  const [duration, setDuration] = useState<number | undefined>();
  const [passScore, setPassScore] = useState<number | undefined>();

  // 已选题目列表（带顺序和分值）
  const [selectedQuestions, setSelectedQuestions] = useState<QuizQuestionItem[]>([]);
  const [questionModalVisible, setQuestionModalVisible] = useState(false);
  const [publishModalVisible, setPublishModalVisible] = useState(false);
  const [createdQuizId, setCreatedQuizId] = useState<number | null>(null);

  // 新建题目抽屉
  const [newQuestionDrawerVisible, setNewQuestionDrawerVisible] = useState(false);
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>('SINGLE_CHOICE');
  const [newQuestionLineTypeId, setNewQuestionLineTypeId] = useState<number | undefined>();
  const [newQuestionContent, setNewQuestionContent] = useState('');
  const [newQuestionOptions, setNewQuestionOptions] = useState<Array<{ key: string; value: string }>>([]);
  const [newQuestionAnswer, setNewQuestionAnswer] = useState<string | string[]>('');
  const [newQuestionExplanation, setNewQuestionExplanation] = useState('');
  const [newQuestionScore, setNewQuestionScore] = useState(1);
  const [newQuestionDifficulty, setNewQuestionDifficulty] = useState('MEDIUM');

  // 标记是否已从 URL/试卷详情初始化
  const initializedFromUrlRef = useRef(false);
  const initializedFromQuizRef = useRef(false);

  const { data: quizData } = useQuizDetail(Number(id));
  const { data: questionsData } = useQuestions({ pageSize: 1000 });
  const { data: lineTypes } = useLineTypeTags();
  const createQuiz = useCreateQuiz();
  const updateQuiz = useUpdateQuiz();
  const createQuestion = useCreateQuestion();

  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  /**
   * 切换试卷时重置初始化标记
   */
  useEffect(() => {
    initializedFromQuizRef.current = false;
    initializedFromUrlRef.current = false;
  }, [id]);

  /**
   * 初始化：从 URL 参数或编辑数据加载已选题目
   */
  useEffect(() => {
    if (isEdit && quizData && !initializedFromQuizRef.current) {
      setTitle(quizData.title);
      setDescription(quizData.description || '');

      if (quizData.questions) {
        const items: QuizQuestionItem[] = quizData.questions.map((qq) => ({
          id: qq.question,
          content: qq.question_content,
          question_type: qq.question_type as QuestionType,
          question_type_display: qq.question_type_display || getQuestionTypeDisplay(qq.question_type as QuestionType),
          score: qq.score,
          order: qq.order,
        })).sort((a, b) => a.order - b.order);
        setSelectedQuestions(items);
      } else {
        setSelectedQuestions([]);
      }
      // Initialize quiz type and exam settings
      setQuizType(quizData.quiz_type || 'PRACTICE');
      setDuration(quizData.duration ?? undefined);
      setPassScore(quizData.pass_score ? Number(quizData.pass_score) : undefined);
      initializedFromQuizRef.current = true;
    } else if (!isEdit && questionsData?.results && !initializedFromUrlRef.current) {
      const questionIdsParam = searchParams.get('question_ids');
      if (questionIdsParam) {
        const questionIds = questionIdsParam.split(',').map(Number).filter(Boolean);
        const items: QuizQuestionItem[] = questionIds
          .map((qid, index) => {
            const question = questionsData.results.find(q => q.id === qid);
            if (!question) return null;
            return {
              id: question.id,
              content: question.content,
              question_type: question.question_type,
              question_type_display: question.question_type_display || getQuestionTypeDisplay(question.question_type),
              score: question.score,
              order: index + 1,
            };
          })
          .filter(Boolean) as QuizQuestionItem[];
        setSelectedQuestions(items);
        initializedFromUrlRef.current = true;
      }
    }
  }, [isEdit, quizData, questionsData, searchParams]);

  /**
   * 计算总分
   */
  const totalScore = useMemo(() => {
    return selectedQuestions.reduce((sum, q) => sum + Number(q.score || 0), 0);
  }, [selectedQuestions]);

  /**
   * 题型统计
   */
  const typeStats = useMemo(() => {
    const stats: Record<string, number> = {};
    selectedQuestions.forEach(q => {
      const label = getQuestionTypeDisplay(q.question_type);
      stats[label] = (stats[label] || 0) + 1;
    });
    return stats;
  }, [selectedQuestions]);

  /**
   * 提交表单
   */
  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('请输入试卷名称');
      return;
    }
    if (selectedQuestions.length === 0) {
      toast.warning('请至少添加一道题目');
      return;
    }
    if (quizType === 'EXAM') {
      if (!duration || duration <= 0) {
        toast.error('考试类型必须设置考试时长');
        return;
      }
      if (!passScore || passScore < 0) {
        toast.error('考试类型必须设置及格分数');
        return;
      }
    }

    try {
      const submitData: QuizCreateRequest = {
        title,
        description: description || undefined,
        quiz_type: quizType,
        duration: quizType === 'EXAM' ? duration : undefined,
        pass_score: quizType === 'EXAM' ? passScore : undefined,
        existing_question_ids: selectedQuestions.map(q => q.id),
      };

      if (isEdit) {
        await updateQuiz.mutateAsync({ id: Number(id), data: submitData });
        toast.success('更新成功');
        navigate(`${ROUTES.TEST_CENTER}?tab=quizzes`);
      } else {
        const quiz = await createQuiz.mutateAsync(submitData);
        toast.success('创建成功');
        setCreatedQuizId(quiz.id);
        setPublishModalVisible(true);
      }
    } catch (error) {
      showApiError(error, isEdit ? '更新失败' : '创建失败');
    }
  };

  /**
   * 立即发布任务
   */
  const handlePublish = () => {
    setPublishModalVisible(false);
    navigate(`/tasks/create?quiz_id=${createdQuizId}`);
  };

  /**
   * 稍后发布
   */
  const handleLater = () => {
    setPublishModalVisible(false);
    navigate(`${ROUTES.TEST_CENTER}?tab=quizzes`);
  };

  /**
   * 从题库添加题目
   */
  const handleAddQuestions = (questionIds: number[]) => {
    const newItems: QuizQuestionItem[] = [];
    const currentMaxOrder = selectedQuestions.length;

    questionIds.forEach((qid, index) => {
      if (selectedQuestions.some(q => q.id === qid)) return;

      const question = questionsData?.results?.find(q => q.id === qid);
      if (!question) return;

      newItems.push({
        id: question.id,
        content: question.content,
        question_type: question.question_type,
        question_type_display: question.question_type_display,
        score: question.score,
        order: currentMaxOrder + index + 1,
      });
    });

    setSelectedQuestions([...selectedQuestions, ...newItems]);
    setQuestionModalVisible(false);
    if (newItems.length > 0) {
      toast.success(`已添加 ${newItems.length} 道题目`);
    }
  };

  /**
   * 移除题目
   */
  const handleRemoveQuestion = (questionId: number) => {
    setSelectedQuestions(selectedQuestions.filter(q => q.id !== questionId));
  };

  /**
   * 修改题目分值
   */
  const handleScoreChange = (questionId: number, score: number) => {
    setSelectedQuestions(selectedQuestions.map(q =>
      q.id === questionId ? { ...q, score: String(score) } : q
    ));
  };

  /**
   * 上移题目
   */
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...selectedQuestions];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setSelectedQuestions(newItems);
  };

  /**
   * 下移题目
   */
  const handleMoveDown = (index: number) => {
    if (index === selectedQuestions.length - 1) return;
    const newItems = [...selectedQuestions];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setSelectedQuestions(newItems);
  };

  /**
   * 拖拽排序结束
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = selectedQuestions.findIndex(q => q.id === active.id);
      const newIndex = selectedQuestions.findIndex(q => q.id === over.id);
      setSelectedQuestions(arrayMove(selectedQuestions, oldIndex, newIndex));
    }
  };

  /**
   * 新建题目并添加到试卷
   */
  const handleCreateNewQuestion = async () => {
    if (!newQuestionLineTypeId) {
      toast.error('请选择条线类型');
      return;
    }
    if (!newQuestionContent.trim()) {
      toast.error('请输入题目内容');
      return;
    }

    try {
      const submitData: QuestionCreateRequest = {
        line_type_id: newQuestionLineTypeId,
        question_type: newQuestionType,
        content: newQuestionContent,
        options: (newQuestionType === 'SINGLE_CHOICE' || newQuestionType === 'MULTIPLE_CHOICE') ? newQuestionOptions : undefined,
        answer: newQuestionAnswer,
        explanation: newQuestionExplanation || undefined,
        score: String(newQuestionScore),
        difficulty: newQuestionDifficulty as 'EASY' | 'MEDIUM' | 'HARD',
      };

      const newQuestion = await createQuestion.mutateAsync(submitData);

      const newItem: QuizQuestionItem = {
        id: newQuestion.id,
        content: newQuestion.content,
        question_type: newQuestion.question_type,
        question_type_display: newQuestion.question_type_display || getQuestionTypeDisplay(newQuestion.question_type),
        score: newQuestion.score || String(newQuestionScore),
        order: selectedQuestions.length + 1,
      };

      setSelectedQuestions(prev => [...prev, newItem]);

      toast.success('题目创建成功并已添加到试卷');
      setNewQuestionDrawerVisible(false);
      // 重置表单
      setNewQuestionType('SINGLE_CHOICE');
      setNewQuestionLineTypeId(undefined);
      setNewQuestionContent('');
      setNewQuestionOptions([]);
      setNewQuestionAnswer('');
      setNewQuestionExplanation('');
      setNewQuestionScore(1);
      setNewQuestionDifficulty('MEDIUM');
    } catch (error) {
      showApiError(error, '创建题目失败');
    }
  };

  // 可添加的题目（排除已选的）
  const availableQuestions = questionsData?.results?.filter(
    (q) => !selectedQuestions.some(sq => sq.id === q.id)
  ) || [];

  const isSubmitting = createQuiz.isPending || updateQuiz.isPending;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? '编辑试卷' : '新建试卷'}
      </h2>

      <div className="grid grid-cols-3 gap-6">
        {/* 左侧：试卷信息和题目列表 */}
        <div className="col-span-2 space-y-4">
          <Card className="p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">基本信息</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                  试卷名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="请输入试卷名称"
                  className="mt-1.5 h-10"
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  试卷描述
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                  placeholder="请输入试卷描述（可选）"
                  className="mt-1.5"
                  rows={2}
                />
              </div>

              {/* 试卷类型选择 */}
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  试卷类型 <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2 mt-1.5">
                  <Button
                    type="button"
                    variant={quizType === 'PRACTICE' ? 'default' : 'outline'}
                    onClick={() => setQuizType('PRACTICE')}
                    className="flex-1"
                    style={quizType === 'PRACTICE' ? { background: 'rgb(77, 108, 255)' } : {}}
                  >
                    练习
                  </Button>
                  <Button
                    type="button"
                    variant={quizType === 'EXAM' ? 'default' : 'outline'}
                    onClick={() => setQuizType('EXAM')}
                    className="flex-1"
                    style={quizType === 'EXAM' ? { background: '#EF4444' } : {}}
                  >
                    考试
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  {quizType === 'PRACTICE'
                    ? '练习模式：学员可多次提交，即时查看结果'
                    : '考试模式：限时作答，只能提交一次，有及格分数线'}
                </p>
              </div>

              {/* 考试配置（仅考试类型显示） */}
              {quizType === 'EXAM' && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-100 space-y-4">
                  <h4 className="text-sm font-semibold text-red-700">考试配置</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        考试时长（分钟）<span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        value={duration ?? ''}
                        onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="如 60"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        及格分数 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        value={passScore ?? ''}
                        onChange={(e) => setPassScore(e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="如 60"
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <span className="text-base font-semibold text-gray-900">
                题目列表 ({selectedQuestions.length} 道)
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuestionModalVisible(true)}
                  className="h-8"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  从题库添加
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setNewQuestionDrawerVisible(true)}
                  className="h-8"
                  style={{ background: 'rgb(77, 108, 255)' }}
                >
                  <FileEdit className="w-4 h-4 mr-1" />
                  新建题目
                </Button>
              </div>
            </div>

            {selectedQuestions.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={selectedQuestions.map(q => q.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div>
                    {selectedQuestions.map((item, index) => (
                      <SortableQuestionRow
                        key={item.id}
                        item={item}
                        index={index}
                        onRemove={handleRemoveQuestion}
                        onScoreChange={handleScoreChange}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                        isFirst={index === 0}
                        isLast={index === selectedQuestions.length - 1}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="py-10 text-center text-gray-400">
                暂无题目，请从题库添加或新建题目
              </div>
            )}
          </Card>

          {/* 提交按钮 */}
          <div className="flex justify-end gap-3 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`${ROUTES.TEST_CENTER}?tab=quizzes`)}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || selectedQuestions.length === 0}
              className="px-6"
              style={{ background: 'rgb(77, 108, 255)' }}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? '保存修改' : '创建试卷'}
            </Button>
          </div>
        </div>

        {/* 右侧：统计信息 */}
        <div className="col-span-1">
          <Card className="p-6 sticky top-4">
            <h3 className="text-base font-semibold text-gray-900 mb-4">试卷统计</h3>

            <div className="mb-6">
              <div className="text-sm text-gray-500 mb-1">总分</div>
              <div className="text-4xl font-bold" style={{ color: 'rgb(77, 108, 255)' }}>
                {totalScore}
                <span className="text-base font-normal text-gray-400 ml-1">分</span>
              </div>
            </div>

            <div className="h-px bg-gray-100 my-4" />

            <div className="mb-6">
              <div className="text-sm text-gray-500 mb-1">题目数量</div>
              <div className="text-2xl font-bold text-gray-900">
                {selectedQuestions.length}
                <span className="text-base font-normal text-gray-400 ml-1">道</span>
              </div>
            </div>

            <div className="h-px bg-gray-100 my-4" />

            <div>
              <div className="text-sm text-gray-500 mb-3">题型分布</div>
              {Object.entries(typeStats).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(typeStats).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{type}</span>
                      <span className="text-sm font-semibold text-gray-900">{count} 道</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400">暂无题目</div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* 从题库添加题目弹窗 */}
      <Dialog open={questionModalVisible} onOpenChange={setQuestionModalVisible}>
        <DialogContent className="max-w-[900px]">
          <DialogHeader>
            <DialogTitle>从题库添加题目</DialogTitle>
          </DialogHeader>
          <QuestionSelector
            availableQuestions={availableQuestions}
            onConfirm={handleAddQuestions}
            onCancel={() => setQuestionModalVisible(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 新建题目抽屉 */}
      <Dialog open={newQuestionDrawerVisible} onOpenChange={setNewQuestionDrawerVisible}>
        <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新建题目</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">
                条线类型 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={newQuestionLineTypeId?.toString()}
                onValueChange={(val) => setNewQuestionLineTypeId(Number(val))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="请选择条线类型" />
                </SelectTrigger>
                <SelectContent>
                  {lineTypes?.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id.toString()}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">
                题目类型 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={newQuestionType}
                onValueChange={(val) => setNewQuestionType(val as QuestionType)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="请选择题目类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINGLE_CHOICE">单选题</SelectItem>
                  <SelectItem value="MULTIPLE_CHOICE">多选题</SelectItem>
                  <SelectItem value="TRUE_FALSE">判断题</SelectItem>
                  <SelectItem value="SHORT_ANSWER">简答题</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">
                题目内容 <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={newQuestionContent}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewQuestionContent(e.target.value)}
                placeholder="请输入题目内容"
                className="mt-1.5"
                rows={3}
              />
            </div>

            {(newQuestionType === 'SINGLE_CHOICE' || newQuestionType === 'MULTIPLE_CHOICE') && (
              <div>
                <Label className="text-sm font-medium">选项</Label>
                <OptionsInput
                  value={newQuestionOptions}
                  onChange={setNewQuestionOptions}
                />
              </div>
            )}

            <div>
              <Label className="text-sm font-medium">
                答案 <span className="text-red-500">*</span>
              </Label>
              <AnswerInput
                questionType={newQuestionType}
                options={newQuestionOptions}
                value={newQuestionAnswer}
                onChange={setNewQuestionAnswer}
              />
            </div>

            <div>
              <Label className="text-sm font-medium">解析</Label>
              <Textarea
                value={newQuestionExplanation}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewQuestionExplanation(e.target.value)}
                placeholder="请输入解析（可选）"
                className="mt-1.5"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">分值</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={newQuestionScore}
                  onChange={(e) => setNewQuestionScore(Number(e.target.value) || 1)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">难度</Label>
                <Select
                  value={newQuestionDifficulty}
                  onValueChange={setNewQuestionDifficulty}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EASY">简单</SelectItem>
                    <SelectItem value="MEDIUM">中等</SelectItem>
                    <SelectItem value="HARD">困难</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewQuestionDrawerVisible(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={handleCreateNewQuestion}
              disabled={createQuestion.isPending}
              style={{ background: 'rgb(77, 108, 255)' }}
            >
              {createQuestion.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              创建并添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建成功后发布弹窗 */}
      <Dialog open={publishModalVisible} onOpenChange={setPublishModalVisible}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>试卷创建成功</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 py-4">试卷创建成功！是否立即发布为任务？</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleLater}>
              稍后发布
            </Button>
            <Button
              type="button"
              onClick={handlePublish}
              style={{ background: 'rgb(77, 108, 255)' }}
            >
              <Send className="w-4 h-4 mr-2" />
              立即发布任务
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};


/**
 * 题库选择器组件
 */
const QuestionSelector: React.FC<{
  availableQuestions: Question[];
  onConfirm: (ids: number[]) => void;
  onCancel: () => void;
}> = ({ availableQuestions, onConfirm, onCancel }) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [filterType, setFilterType] = useState<QuestionType | 'all'>('all');

  const filteredQuestions = filterType === 'all'
    ? availableQuestions
    : availableQuestions.filter(q => q.question_type === filterType);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredQuestions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredQuestions.map(q => q.id));
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <Select
          value={filterType}
          onValueChange={(val) => setFilterType(val as QuestionType | 'all')}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="筛选题型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部题型</SelectItem>
            <SelectItem value="SINGLE_CHOICE">单选题</SelectItem>
            <SelectItem value="MULTIPLE_CHOICE">多选题</SelectItem>
            <SelectItem value="TRUE_FALSE">判断题</SelectItem>
            <SelectItem value="SHORT_ANSWER">简答题</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-500">
          共 {filteredQuestions.length} 道题目
        </span>
      </div>

      <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
        {/* 表头 */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200 sticky top-0">
          <Checkbox
            checked={selectedIds.length === filteredQuestions.length && filteredQuestions.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <div className="w-20 text-xs font-medium text-gray-500">题目类型</div>
          <div className="flex-1 text-xs font-medium text-gray-500">题目内容</div>
          <div className="w-20 text-xs font-medium text-gray-500">条线类型</div>
          <div className="w-14 text-xs font-medium text-gray-500">分值</div>
        </div>

        {/* 题目列表 */}
        {filteredQuestions.length > 0 ? (
          filteredQuestions.map((q) => {
            const tagStyle = getTypeTagStyle(q.question_type);
            return (
              <div
                key={q.id}
                onClick={() => toggleSelect(q.id)}
                className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 cursor-pointer transition-colors ${selectedIds.includes(q.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
              >
                <Checkbox
                  checked={selectedIds.includes(q.id)}
                  onCheckedChange={() => toggleSelect(q.id)}
                />
                <div className="w-20">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${tagStyle.bg} ${tagStyle.text}`}>
                    {getQuestionTypeDisplay(q.question_type)}
                  </span>
                </div>
                <div className="flex-1 text-sm text-gray-700 truncate">
                  {q.content}
                </div>
                <div className="w-20 text-sm text-gray-500">
                  {q.line_type?.name || '-'}
                </div>
                <div className="w-14 text-sm text-gray-700">
                  {q.score}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-10 text-center text-gray-400">
            暂无可添加的题目
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button
          type="button"
          disabled={selectedIds.length === 0}
          onClick={() => onConfirm(selectedIds)}
          style={{ background: 'rgb(77, 108, 255)' }}
        >
          添加已选 ({selectedIds.length})
        </Button>
      </div>
    </div>
  );
};

/**
 * 选项输入组件
 */
const OptionsInput: React.FC<{
  value: Array<{ key: string; value: string }>;
  onChange: (value: Array<{ key: string; value: string }>) => void;
}> = ({ value = [], onChange }) => {
  const handleAdd = () => {
    const keys = ['A', 'B', 'C', 'D', 'E', 'F'];
    const nextKey = keys[value.length] || String.fromCharCode(65 + value.length);
    onChange([...value, { key: nextKey, value: '' }]);
  };

  const handleChange = (index: number, field: 'key' | 'value', val: string) => {
    const newOptions = [...value];
    newOptions[index] = { ...newOptions[index], [field]: val };
    onChange(newOptions);
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="mt-1.5 space-y-2">
      {value.map((opt, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={opt.key}
            onChange={(e) => handleChange(index, 'key', e.target.value)}
            placeholder="选项"
            className="w-16"
          />
          <Input
            value={opt.value}
            onChange={(e) => handleChange(index, 'value', e.target.value)}
            placeholder="选项内容"
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleRemove(index)}
            className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAdd}
        className="h-8"
      >
        <Plus className="w-3 h-3 mr-1" />
        添加选项
      </Button>
    </div>
  );
};

/**
 * 答案输入组件
 */
const AnswerInput: React.FC<{
  questionType: QuestionType;
  options: Array<{ key: string; value: string }>;
  value: string | string[];
  onChange: (value: string | string[]) => void;
}> = ({ questionType, options, value, onChange }) => {
  if (questionType === 'SINGLE_CHOICE') {
    return (
      <Select
        value={value as string}
        onValueChange={onChange}
      >
        <SelectTrigger className="mt-1.5">
          <SelectValue placeholder="请选择答案" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.key} value={opt.key}>
              {opt.key}: {opt.value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (questionType === 'MULTIPLE_CHOICE') {
    const selectedKeys = Array.isArray(value) ? value : [];
    return (
      <div className="mt-1.5 space-y-2">
        {options.map((opt) => (
          <div key={opt.key} className="flex items-center gap-2">
            <Checkbox
              checked={selectedKeys.includes(opt.key)}
              onCheckedChange={(checked) => {
                if (checked) {
                  onChange([...selectedKeys, opt.key]);
                } else {
                  onChange(selectedKeys.filter(k => k !== opt.key));
                }
              }}
            />
            <span className="text-sm">
              {opt.key}: {opt.value}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (questionType === 'TRUE_FALSE') {
    return (
      <Select
        value={value as string}
        onValueChange={onChange}
      >
        <SelectTrigger className="mt-1.5">
          <SelectValue placeholder="请选择答案" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TRUE">正确</SelectItem>
          <SelectItem value="FALSE">错误</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Textarea
      value={value as string}
      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
      placeholder="请输入参考答案"
      className="mt-1.5"
      rows={2}
    />
  );
};
