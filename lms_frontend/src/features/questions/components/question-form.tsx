import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Crown,
  Check,
  XCircle,
  Loader2,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useCreateQuestion, useUpdateQuestion } from '../api/create-question';
import { useQuestionDetail } from '../api/get-questions';
import { useLineTypeTags } from '@/features/knowledge/api/get-tags';
import type { QuestionCreateRequest, QuestionType, Difficulty } from '@/types/api';
import { showApiError } from '@/utils/error-handler';

/**
 * 题目类型选项
 */
const QUESTION_TYPES: Array<{ value: QuestionType; label: string }> = [
  { value: 'SINGLE_CHOICE', label: '单项选择' },
  { value: 'MULTIPLE_CHOICE', label: '多项选择' },
  { value: 'TRUE_FALSE', label: '判断题' },
  { value: 'SHORT_ANSWER', label: '简答题' },
];

/**
 * 难度等级选项
 */
const DIFFICULTY_OPTIONS: Array<{ value: Difficulty; label: string }> = [
  { value: 'EASY', label: '初级' },
  { value: 'MEDIUM', label: '高级' },
  { value: 'HARD', label: '专家' },
];

/**
 * 选项接口
 */
interface QuestionOption {
  key: string;
  value: string;
}

/**
 * 题目表单组件 - ShadCN UI 版本
 */
export const QuestionForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  // API Hooks
  const { data: questionData, isLoading } = useQuestionDetail(Number(id));
  const { data: lineTypes } = useLineTypeTags();
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();

  // 表单状态
  const [lineTypeId, setLineTypeId] = useState<number | undefined>();
  const [difficulty, setDifficulty] = useState<Difficulty>('EASY');
  const [questionType, setQuestionType] = useState<QuestionType>('SINGLE_CHOICE');
  const [content, setContent] = useState('');
  const [options, setOptions] = useState<QuestionOption[]>([
    { key: 'A', value: '' },
    { key: 'B', value: '' },
    { key: 'C', value: '' },
    { key: 'D', value: '' },
  ]);
  const [answer, setAnswer] = useState<string | string[]>('');
  const [explanation, setExplanation] = useState('');
  const [score, setScore] = useState<number>(1);

  // 表单错误
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * 编辑模式下填充数据
   */
  useEffect(() => {
    if (isEdit && questionData) {
      setLineTypeId(questionData.line_type?.id);
      if (questionData.difficulty) {
        setDifficulty(questionData.difficulty);
      }
      setQuestionType(questionData.question_type);
      setContent(questionData.content);
      setOptions(questionData.options || [
        { key: 'A', value: '' },
        { key: 'B', value: '' },
        { key: 'C', value: '' },
        { key: 'D', value: '' },
      ]);
      if (questionData.answer) {
        setAnswer(questionData.answer);
      }
      setExplanation(questionData.explanation || '');
      setScore(Number(questionData.score) || 1);
    }
  }, [isEdit, questionData]);

  /**
   * 关闭/返回
   */
  const handleClose = useCallback(() => {
    navigate('/test-center?tab=questions');
  }, [navigate]);

  /**
   * 添加选项
   */
  const handleAddOption = useCallback(() => {
    const keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const nextKey = keys[options.length] || String.fromCharCode(65 + options.length);
    setOptions(prev => [...prev, { key: nextKey, value: '' }]);
  }, [options.length]);

  /**
   * 更新选项内容
   */
  const handleOptionChange = useCallback((index: number, value: string) => {
    setOptions(prev => {
      const newOptions = [...prev];
      newOptions[index] = { ...newOptions[index], value };
      return newOptions;
    });
  }, []);

  /**
   * 删除选项
   */
  const handleDeleteOption = useCallback((index: number) => {
    const deletedKey = options[index]?.key;
    setOptions(prev => prev.filter((_, i) => i !== index));
    // 如果删除的是已选择的正确答案，清空答案
    if (Array.isArray(answer)) {
      setAnswer(answer.filter(a => a !== deletedKey));
    } else if (answer === deletedKey) {
      setAnswer('');
    }
  }, [options, answer]);

  /**
   * 设置正确答案（选择题）
   */
  const handleSetCorrectAnswer = useCallback((key: string) => {
    if (questionType === 'SINGLE_CHOICE') {
      setAnswer(answer === key ? '' : key);
    } else if (questionType === 'MULTIPLE_CHOICE') {
      setAnswer(prev => {
        const currentAnswers = Array.isArray(prev) ? prev : [];
        if (currentAnswers.includes(key)) {
          return currentAnswers.filter(a => a !== key);
        } else {
          return [...currentAnswers, key];
        }
      });
    }
  }, [questionType, answer]);

  /**
   * 判断选项是否为正确答案
   */
  const isCorrectAnswer = useCallback((key: string) => {
    if (Array.isArray(answer)) {
      return answer.includes(key);
    }
    return answer === key;
  }, [answer]);

  /**
   * 表单验证
   */
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!lineTypeId) {
      newErrors.lineType = '请选择业务线归属';
    }
    if (!content.trim()) {
      newErrors.content = '请输入题目正文';
    }
    if ((questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE') && options.length < 2) {
      newErrors.options = '至少需要2个选项';
    }
    if ((questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE') && options.some(o => !o.value.trim())) {
      newErrors.options = '请填写所有选项内容';
    }
    if (!answer || (Array.isArray(answer) && answer.length === 0)) {
      newErrors.answer = '请设置正确答案';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [lineTypeId, content, questionType, options, answer]);

  /**
   * 提交表单
   */
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      toast.error('请检查表单填写是否完整');
      return;
    }

    const submitData: QuestionCreateRequest = {
      line_type_id: lineTypeId!,
      difficulty,
      question_type: questionType,
      content,
      options: (questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE') ? options : undefined,
      answer: Array.isArray(answer) ? answer : answer,
      explanation: explanation || undefined,
      score: String(score),
    };

    try {
      if (isEdit) {
        await updateQuestion.mutateAsync({ id: Number(id), data: submitData });
        toast.success('更新成功');
      } else {
        await createQuestion.mutateAsync(submitData);
        toast.success('创建成功');
      }
      navigate('/test-center?tab=questions');
    } catch (error) {
      showApiError(error, isEdit ? '更新失败' : '创建失败');
    }
  }, [
    validateForm, lineTypeId, difficulty, questionType, content, options,
    answer, explanation, score, isEdit, id, updateQuestion, createQuestion, navigate
  ]);

  /**
   * 题目类型切换时重置答案
   */
  const handleQuestionTypeChange = useCallback((type: QuestionType) => {
    setQuestionType(type);
    // 重置答案
    if (type === 'TRUE_FALSE') {
      setAnswer('');
    } else if (type === 'MULTIPLE_CHOICE') {
      setAnswer([]);
    } else {
      setAnswer('');
    }
    // 重置选项（仅选择题需要）
    if (type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE') {
      if (options.length === 0) {
        setOptions([
          { key: 'A', value: '' },
          { key: 'B', value: '' },
          { key: 'C', value: '' },
          { key: 'D', value: '' },
        ]);
      }
    }
  }, [options.length]);

  const isSubmitting = createQuestion.isPending || updateQuestion.isPending;

  if (isEdit && isLoading) {
    return (
      <div className="max-w-[800px] mx-auto p-4 animate-in fade-in-0 duration-400">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[rgb(77,108,255)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto p-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-400">
      {/* 头部 */}
      <div className="flex justify-between items-start mb-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-gray-900 m-0">
            {isEdit ? '编辑题目资产' : '创建题目资产'}
          </h1>
          <span
            className="text-[10px] font-semibold tracking-[1.5px] uppercase"
            style={{ color: 'rgb(77, 108, 255)' }}
          >
            Asset Revision Management
          </span>
        </div>
        <button
          onClick={handleClose}
          className="w-10 h-10 rounded-lg border border-gray-200 bg-white cursor-pointer flex items-center justify-center transition-all text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300"
          title="关闭"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 表单主体 */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        {/* 第一行：业务线 + 难度 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-2">业务线归属</label>
            <Select
              value={lineTypeId?.toString()}
              onValueChange={(val) => setLineTypeId(Number(val))}
            >
              <SelectTrigger
                className="h-9 rounded-md bg-gray-50 border-gray-200"
                style={{ borderColor: errors.lineType ? 'rgb(239, 68, 68)' : undefined }}
              >
                <SelectValue placeholder="请选择业务线" />
              </SelectTrigger>
              <SelectContent>
                {lineTypes?.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id.toString()}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.lineType && <div className="text-[11px] text-red-500 mt-1">{errors.lineType}</div>}
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-2">评测难度</label>
            <div className="flex bg-gray-100 rounded-full p-[3px] gap-[2px] h-9">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDifficulty(opt.value)}
                  className={`flex-1 px-3 py-2 rounded-full border-none cursor-pointer text-sm font-medium transition-all text-center ${
                    difficulty === opt.value
                      ? 'bg-green-500 text-white shadow-sm'
                      : 'bg-transparent text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 题目类型 */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-2">题目类型</label>
          <div className="flex gap-2 flex-wrap">
            {QUESTION_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => handleQuestionTypeChange(type.value)}
                className={`px-4 py-2 rounded-md border cursor-pointer text-sm font-medium transition-all h-8 ${
                  questionType === type.value
                    ? 'border-[rgb(77,108,255)] bg-blue-50 text-[rgb(77,108,255)]'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-[rgb(77,108,255)]'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* 题目正文 */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-2">题目正文</label>
          <Textarea
            value={content}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
            placeholder="请输入题目描述内容..."
            className={`min-h-[100px] rounded-md bg-gray-50 border-gray-200 p-3 text-sm resize-y focus:border-[rgb(77,108,255)] focus:bg-white ${
              errors.content ? 'border-red-500' : ''
            }`}
          />
          {errors.content && <div className="text-[11px] text-red-500 mt-1">{errors.content}</div>}
        </div>

        {/* 分隔线 */}
        <div className="h-px bg-gray-200 my-4" />

        {/* 选项配置 - 选择题 */}
        {(questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE') && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-medium text-gray-600">选项配置 & 答案定义</span>
              <button
                type="button"
                onClick={handleAddOption}
                className="flex items-center gap-1 px-2 py-1 border-none bg-transparent cursor-pointer text-xs font-semibold text-green-500 transition-all hover:text-green-600"
              >
                <Plus className="w-3 h-3" /> 增加选项
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {options.map((opt, index) => (
                <div
                  key={opt.key}
                  onClick={() => handleSetCorrectAnswer(opt.key)}
                  className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-all ${
                    isCorrectAnswer(opt.key)
                      ? 'border-green-500 bg-green-500/5'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 transition-all ${
                      isCorrectAnswer(opt.key)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {opt.key}
                  </div>
                  <input
                    type="text"
                    value={opt.value}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleOptionChange(index, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder={`输入选项 ${opt.key} 的内容...`}
                    className="flex-1 border-none bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  />
                  <div className="flex items-center gap-2">
                    {isCorrectAnswer(opt.key) && (
                      <span className="flex items-center gap-[2px] text-[10px] font-semibold text-green-500 tracking-[0.5px]">
                        <CheckCircle2 className="w-3 h-3" /> CORRECT
                      </span>
                    )}
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOption(index);
                        }}
                        className="w-7 h-7 rounded-sm border-none bg-transparent cursor-pointer flex items-center justify-center text-gray-400 transition-all hover:bg-red-50 hover:text-red-500"
                        title="删除选项"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {errors.options && <div className="text-[11px] text-red-500 mt-1">{errors.options}</div>}
            {errors.answer && <div className="text-[11px] text-red-500 mt-1">{errors.answer}</div>}
          </div>
        )}

        {/* 判断题选项 */}
        {questionType === 'TRUE_FALSE' && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-medium text-gray-600">答案选择</span>
            </div>

            <div className="flex gap-3">
              <div
                onClick={() => setAnswer('TRUE')}
                className={`flex-1 p-4 rounded-md border cursor-pointer text-center transition-all ${
                  answer === 'TRUE'
                    ? 'border-green-500 bg-green-500/5'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto mb-2 text-base ${
                    answer === 'TRUE'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <Check className="w-5 h-5" />
                </div>
                <div
                  className={`text-sm font-medium ${
                    answer === 'TRUE' ? 'text-green-600' : 'text-gray-700'
                  }`}
                >
                  正确
                </div>
              </div>
              <div
                onClick={() => setAnswer('FALSE')}
                className={`flex-1 p-4 rounded-md border cursor-pointer text-center transition-all ${
                  answer === 'FALSE'
                    ? 'border-green-500 bg-green-500/5'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto mb-2 text-base ${
                    answer === 'FALSE'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <XCircle className="w-5 h-5" />
                </div>
                <div
                  className={`text-sm font-medium ${
                    answer === 'FALSE' ? 'text-green-600' : 'text-gray-700'
                  }`}
                >
                  错误
                </div>
              </div>
            </div>
            {errors.answer && <div className="text-[11px] text-red-500 mt-1">{errors.answer}</div>}
          </div>
        )}

        {/* 简答题答案 */}
        {questionType === 'SHORT_ANSWER' && (
          <div className="mt-4">
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-2">参考答案</label>
              <Textarea
                value={typeof answer === 'string' ? answer : ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAnswer(e.target.value)}
                placeholder="请输入参考答案..."
                className={`min-h-[80px] rounded-md bg-gray-50 border-gray-200 p-3 text-sm resize-y focus:border-[rgb(77,108,255)] focus:bg-white ${
                  errors.answer ? 'border-red-500' : ''
                }`}
              />
              {errors.answer && <div className="text-[11px] text-red-500 mt-1">{errors.answer}</div>}
            </div>
          </div>
        )}

        {/* 分隔线 */}
        <div className="h-px bg-gray-200 my-4" />

        {/* 专家评测解析 */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-medium text-gray-600">专家评测解析</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-[0.5px] ml-1">(Expert Insight)</span>
          </div>
          <Textarea
            value={explanation}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExplanation(e.target.value)}
            placeholder="在此输入参考答案或该题目的知识点解析，用于考核后的能力反馈..."
            className="min-h-[80px] rounded-md bg-gray-50 border-gray-200 p-3 text-sm resize-y focus:border-[rgb(77,108,255)] focus:bg-white"
          />
        </div>

        {/* 分值 */}
        <div className="mt-4">
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-2">题目分值</label>
            <div className="w-[100px]">
              <Input
                type="number"
                value={score}
                onChange={(e) => setScore(Number(e.target.value) || 1)}
                min={0}
                max={100}
                step={0.1}
                className="h-9 rounded-md text-sm"
              />
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="px-4 h-9 rounded-md text-sm font-medium text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
          >
            取消
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 h-9 rounded-md text-sm font-semibold"
            style={{
              background: 'rgb(77, 108, 255)',
              boxShadow: '0 4px 12px rgba(77, 108, 255, 0.25)',
            }}
          >
            {isSubmitting ? '提交中...' : (isEdit ? '保存更改' : '创建题目')}
          </Button>
        </div>
      </div>
    </div>
  );
};
