import { useState, useEffect, useCallback } from 'react';
import { Select, Input, InputNumber, message, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { CloseOutlined, PlusOutlined, DeleteOutlined, CheckCircleOutlined, CrownOutlined, CheckOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useCreateQuestion, useUpdateQuestion } from '../api/create-question';
import { useQuestionDetail } from '../api/get-questions';
import { useLineTypeTags } from '@/features/knowledge/api/get-tags';
import type { QuestionCreateRequest, QuestionType, Difficulty } from '@/types/api';
import { showApiError } from '@/utils/error-handler';
import styles from './question-form.module.css';

const { TextArea } = Input;

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
 * 题目表单组件 - 现代化设计
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
    setOptions(prev => prev.filter((_, i) => i !== index));
    // 如果删除的是已选择的正确答案，清空答案
    const deletedKey = options[index]?.key;
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
      message.error('请检查表单填写是否完整');
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
        message.success('更新成功');
      } else {
        await createQuestion.mutateAsync(submitData);
        message.success('创建成功');
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
      <div className={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 头部 */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{isEdit ? '编辑题目资产' : '创建题目资产'}</h1>
          <span className={styles.subtitle}>Asset Revision Management</span>
        </div>
        <button className={styles.closeButton} onClick={handleClose} title="关闭">
          <CloseOutlined />
        </button>
      </div>

      {/* 表单主体 */}
      <div className={styles.formBody}>
        {/* 第一行：业务线 + 难度 */}
        <div className={styles.row}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>业务线归属</label>
            <div className={styles.selectWrapper}>
              <Select
                value={lineTypeId}
                onChange={setLineTypeId}
                placeholder="请选择业务线"
                loading={!lineTypes}
                status={errors.lineType ? 'error' : undefined}
              >
                {lineTypes?.map((tag) => (
                  <Select.Option key={tag.id} value={tag.id}>
                    {tag.name}
                  </Select.Option>
                ))}
              </Select>
            </div>
            {errors.lineType && <div className={styles.fieldError}>{errors.lineType}</div>}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>评测难度</label>
            <div className={styles.difficultySelector}>
              {DIFFICULTY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.difficultyOption} ${difficulty === opt.value ? styles.difficultyActive : ''}`}
                  onClick={() => setDifficulty(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 题目类型 */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>题目类型</label>
          <div className={styles.questionTypeGroup}>
            {QUESTION_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                className={`${styles.questionTypeButton} ${questionType === type.value ? styles.questionTypeActive : ''}`}
                onClick={() => handleQuestionTypeChange(type.value)}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* 题目正文 */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>题目正文</label>
          <div className={styles.textareaWrapper}>
            <TextArea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请输入题目描述内容..."
              autoSize={{ minRows: 5, maxRows: 10 }}
              status={errors.content ? 'error' : undefined}
            />
          </div>
          {errors.content && <div className={styles.fieldError}>{errors.content}</div>}
        </div>

        {/* 分隔线 */}
        <div className={styles.divider} />

        {/* 选项配置 - 选择题 */}
        {(questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE') && (
          <div className={styles.optionsSection}>
            <div className={styles.optionsSectionHeader}>
              <span className={styles.sectionTitle}>选项配置 & 答案定义</span>
              <button type="button" className={styles.addOptionButton} onClick={handleAddOption}>
                <PlusOutlined /> 增加选项
              </button>
            </div>

            <div className={styles.optionsList}>
              {options.map((opt, index) => (
                <div
                  key={opt.key}
                  className={`${styles.optionCard} ${isCorrectAnswer(opt.key) ? styles.optionCorrect : ''}`}
                  onClick={() => handleSetCorrectAnswer(opt.key)}
                >
                  <div className={styles.optionLetter}>{opt.key}</div>
                  <input
                    type="text"
                    className={styles.optionInput}
                    value={opt.value}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleOptionChange(index, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder={`输入选项 ${opt.key} 的内容...`}
                  />
                  <div className={styles.optionActions}>
                    {isCorrectAnswer(opt.key) && (
                      <span className={styles.correctBadge}>
                        <CheckCircleOutlined /> CORRECT
                      </span>
                    )}
                    {options.length > 2 && (
                      <button
                        type="button"
                        className={styles.deleteOptionButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOption(index);
                        }}
                        title="删除选项"
                      >
                        <DeleteOutlined />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {errors.options && <div className={styles.fieldError}>{errors.options}</div>}
            {errors.answer && <div className={styles.fieldError}>{errors.answer}</div>}
          </div>
        )}

        {/* 判断题选项 */}
        {questionType === 'TRUE_FALSE' && (
          <div className={styles.optionsSection}>
            <div className={styles.optionsSectionHeader}>
              <span className={styles.sectionTitle}>答案选择</span>
            </div>

            <div className={styles.trueFalseOptions}>
              <div
                className={`${styles.trueFalseCard} ${answer === 'TRUE' ? styles.trueFalseSelected : ''}`}
                onClick={() => setAnswer('TRUE')}
              >
                <div className={styles.trueFalseIcon}>
                  <CheckOutlined />
                </div>
                <div className={styles.trueFalseLabel}>正确</div>
              </div>
              <div
                className={`${styles.trueFalseCard} ${answer === 'FALSE' ? styles.trueFalseSelected : ''}`}
                onClick={() => setAnswer('FALSE')}
              >
                <div className={styles.trueFalseIcon}>
                  <CloseCircleOutlined />
                </div>
                <div className={styles.trueFalseLabel}>错误</div>
              </div>
            </div>
            {errors.answer && <div className={styles.fieldError}>{errors.answer}</div>}
          </div>
        )}

        {/* 简答题答案 */}
        {questionType === 'SHORT_ANSWER' && (
          <div className={styles.answerSection}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>参考答案</label>
              <div className={styles.textareaWrapper}>
                <TextArea
                  value={typeof answer === 'string' ? answer : ''}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="请输入参考答案..."
                  autoSize={{ minRows: 4, maxRows: 8 }}
                  status={errors.answer ? 'error' : undefined}
                />
              </div>
              {errors.answer && <div className={styles.fieldError}>{errors.answer}</div>}
            </div>
          </div>
        )}

        {/* 分隔线 */}
        <div className={styles.divider} />

        {/* 专家评测解析 */}
        <div className={styles.expertSection}>
          <div className={styles.expertHeader}>
            <CrownOutlined className={styles.expertIcon} />
            <span className={styles.expertTitle}>专家评测解析</span>
            <span className={styles.expertSubtitle}>(Expert Insight)</span>
          </div>
          <div className={styles.textareaWrapper}>
            <TextArea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="在此输入参考答案或该题目的知识点解析，用于考核后的能力反馈..."
              autoSize={{ minRows: 4, maxRows: 8 }}
            />
          </div>
        </div>

        {/* 分值 */}
        <div className={styles.scoreSection}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>题目分值</label>
            <div className={styles.scoreInput}>
              <InputNumber
                value={score}
                onChange={(val) => setScore(val || 1)}
                min={0}
                max={100}
                precision={1}
                addonAfter="分"
              />
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className={styles.footer}>
          <button type="button" className={styles.cancelButton} onClick={handleClose}>
            取消
          </button>
          <button
            type="button"
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? '提交中...' : (isEdit ? '保存更改' : '创建题目')}
          </button>
        </div>
      </div>
    </div>
  );
};
