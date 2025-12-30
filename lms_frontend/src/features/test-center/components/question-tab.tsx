import React, { useState, useMemo } from 'react';
import { Pencil, CheckCircle, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuestions, useQuestionDetail } from '@/features/questions/api/get-questions';
import { useLineTypeTags } from '@/features/knowledge/api/get-tags';
import type { QuestionType } from '@/types/api';
import dayjs from '@/lib/dayjs';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Pagination } from '@/components/ui/pagination';
import { Separator } from '@/components/ui/separator';

/** 题型筛选选项 */
const QUESTION_TYPE_FILTER_OPTIONS = [
  { label: '全部', value: 'ALL' },
  { label: '单选题', value: 'SINGLE_CHOICE' },
  { label: '多选题', value: 'MULTIPLE_CHOICE' },
  { label: '判断题', value: 'TRUE_FALSE' },
  { label: '简答题', value: 'SHORT_ANSWER' },
];

interface QuestionTabProps {
  search?: string;
}

/**
 * 题型配置
 */
const QUESTION_TYPE_CONFIG: Record<QuestionType, { label: string; variant: 'info' | 'success' | 'warning' | 'secondary' }> = {
  SINGLE_CHOICE: { label: '单选', variant: 'info' },
  MULTIPLE_CHOICE: { label: '多选', variant: 'success' },
  TRUE_FALSE: { label: '判断', variant: 'warning' },
  SHORT_ANSWER: { label: '简答', variant: 'secondary' },
};

/**
 * 分段选择器组件
 */
interface SegmentedProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}

const Segmented: React.FC<SegmentedProps> = ({ options, value, onChange }) => {
  return (
    <div className="inline-flex bg-gray-100 rounded-md p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn(
            'px-3 py-1 text-xs rounded-md transition-colors',
            value === option.value
              ? 'bg-primary-500 text-white'
              : 'text-gray-600 hover:text-gray-900'
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

/**
 * 题目管理标签页 - ShadCN UI 版本
 * 采用分屏布局：左侧题目列表，右侧题目详情
 */
export const QuestionTab: React.FC<QuestionTabProps> = ({ search = '' }) => {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [questionTypeFilter, setQuestionTypeFilter] = useState<string>('ALL');
  const [lineTypeFilter, setLineTypeFilter] = useState<string>('ALL');
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  /** 将筛选值转换为 API 参数 */
  const questionType = questionTypeFilter === 'ALL' ? undefined : questionTypeFilter as QuestionType;
  const lineTypeId = lineTypeFilter === 'ALL' ? undefined : Number(lineTypeFilter);

  const { data, isLoading } = useQuestions({
    page,
    questionType,
    lineTypeId,
    search: search || undefined,
  });
  const { data: lineTypes } = useLineTypeTags();

  /** 条线类型筛选选项（动态生成） */
  const lineTypeFilterOptions = useMemo(() => {
    const options = [{ label: '全部', value: 'ALL' }];
    if (lineTypes) {
      lineTypes.forEach((tag) => {
        options.push({ label: tag.name, value: String(tag.id) });
      });
    }
    return options;
  }, [lineTypes]);

  const { data: questionDetail, isLoading: detailLoading } = useQuestionDetail(
    selectedQuestionId || 0
  );

  /**
   * 立即组卷
   */
  const handleCreateQuiz = () => {
    if (selectedRowKeys.length === 0) return;
    const questionIds = selectedRowKeys.join(',');
    navigate(`/test-center/quizzes/create?question_ids=${questionIds}`);
  };

  /**
   * 一键移除所有选中
   */
  const handleClearSelection = () => {
    setSelectedRowKeys([]);
  };

  /**
   * 切换题目选中状态
   */
  const handleToggleSelection = (questionId: number) => {
    setSelectedRowKeys(prev => {
      if (prev.includes(questionId)) {
        return prev.filter(id => id !== questionId);
      } else {
        return [...prev, questionId];
      }
    });
  };

  /**
   * 点击题目查看详情
   */
  const handleQuestionClick = (questionId: number) => {
    setSelectedQuestionId(questionId);
  };

  /**
   * 从详情面板勾选加入/取消
   */
  const handleAddFromDetail = () => {
    if (!selectedQuestionId) return;
    handleToggleSelection(selectedQuestionId);
  };

  /**
   * 判断选项是否是正确答案
   */
  const isCorrectAnswer = (optionKey: string, answer?: string | string[]) => {
    if (!answer) return false;
    if (Array.isArray(answer)) {
      return answer.includes(optionKey);
    }
    return answer === optionKey;
  };

  return (
    <div className="h-full flex flex-col">
      {/* 筛选栏 */}
      <Card className="mb-4">
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 whitespace-nowrap">题型</span>
              <Segmented
                options={QUESTION_TYPE_FILTER_OPTIONS}
                value={questionTypeFilter}
                onChange={(value) => {
                  setQuestionTypeFilter(value);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 whitespace-nowrap">条线</span>
              <Segmented
                options={lineTypeFilterOptions}
                value={lineTypeFilter}
                onChange={(value) => {
                  setLineTypeFilter(value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 分屏布局 */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* 左侧：题目列表 */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-semibold">题目列表</CardTitle>
              <span className="text-xs text-gray-500">共 {data?.count || 0} 条</span>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Spinner />
              </div>
            ) : data?.results && data.results.length > 0 ? (
              <>
                <div>
                  {data.results.map((question) => {
                    const typeConfig = QUESTION_TYPE_CONFIG[question.question_type];
                    return (
                      <div
                        key={question.id}
                        className={cn(
                          'px-4 py-3 border-b border-gray-100 cursor-pointer flex items-start gap-3 transition-colors hover:bg-gray-50',
                          selectedQuestionId === question.id && 'bg-primary-50 border-l-3 border-l-primary-500 pl-3.25'
                        )}
                        onClick={() => handleQuestionClick(question.id)}
                      >
                        <Checkbox
                          className="mt-0.5"
                          checked={selectedRowKeys.includes(question.id)}
                          onCheckedChange={() => handleToggleSelection(question.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] px-1 py-0 leading-4 h-4 rounded bg-gray-100 text-gray-600">
                              {question.line_type?.name || '未分类'}
                            </span>
                            <Badge variant={typeConfig.variant} className="text-[10px] px-1 py-0 leading-4 h-4">
                              {typeConfig.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-900 line-clamp-2 m-0">
                            {question.content}
                          </p>
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">
                          {dayjs(question.updated_at).format('MM-DD')}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="py-3 px-4 text-center border-t border-gray-100 bg-gray-50">
                  <Pagination
                    current={page}
                    total={data.count || 0}
                    pageSize={10}
                    onChange={(newPage) => setPage(newPage)}
                    showTotal={(total) => `${total} 条`}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-10 text-gray-500">
                暂无题目
              </div>
            )}
          </CardContent>
        </Card>

        {/* 右侧：题目详情 */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-semibold">题目详情</CardTitle>
              {questionDetail && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/test-center/questions/${questionDetail.id}/edit`)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    编辑
                  </Button>
                  <Button
                    variant={selectedRowKeys.includes(questionDetail.id) ? 'outline' : 'default'}
                    size="sm"
                    onClick={handleAddFromDetail}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    {selectedRowKeys.includes(questionDetail.id) ? '取消' : '组卷'}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-4">
            {detailLoading ? (
              <div className="flex items-center justify-center py-10">
                <Spinner />
              </div>
            ) : questionDetail ? (
              <div>
                {/* 题干 */}
                <div className="mb-5">
                  <span className="block text-xs text-gray-500 mb-2 font-medium">题干</span>
                  <p className="text-sm leading-relaxed">{questionDetail.content}</p>
                </div>

                {/* 选项 */}
                {questionDetail.options && questionDetail.options.length > 0 && (
                  <div className="mb-5">
                    <span className="block text-xs text-gray-500 mb-2 font-medium">选项</span>
                    {questionDetail.options.map((option) => {
                      const isCorrect = isCorrectAnswer(option.key, questionDetail.answer);
                      return (
                        <div
                          key={option.key}
                          className={cn(
                            'p-2 px-3 mb-2 rounded-md border border-gray-200 flex items-center gap-2 text-sm',
                            isCorrect && 'border-success-500 bg-success-50/50'
                          )}
                        >
                          <span className={cn('font-semibold text-gray-600', isCorrect && 'text-success-500')}>
                            {option.key}.
                          </span>
                          <span>{option.value}</span>
                          {isCorrect && (
                            <Check className="h-4 w-4 text-success-500 ml-auto" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 判断题答案 */}
                {questionDetail.question_type === 'TRUE_FALSE' && questionDetail.answer && (
                  <div className="mb-5">
                    <span className="block text-xs text-gray-500 mb-2 font-medium">答案</span>
                    <Badge variant={questionDetail.answer === 'true' || questionDetail.answer === 'TRUE' ? 'success' : 'error'}>
                      {questionDetail.answer === 'true' || questionDetail.answer === 'TRUE' ? '正确' : '错误'}
                    </Badge>
                  </div>
                )}

                {/* 简答题答案 */}
                {questionDetail.question_type === 'SHORT_ANSWER' && questionDetail.answer && (
                  <div className="mb-5">
                    <span className="block text-xs text-gray-500 mb-2 font-medium">参考答案</span>
                    <div className="bg-gray-50 p-3 rounded-md text-sm">
                      {questionDetail.answer}
                    </div>
                  </div>
                )}

                <Separator className="my-4" />

                {/* 元信息 */}
                <div className="mb-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-xs text-gray-500 mb-2 font-medium">更新人</span>
                      <span className="text-[13px]">{questionDetail.created_by_name || '-'}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500 mb-2 font-medium">更新时间</span>
                      <span className="text-[13px]">{dayjs(questionDetail.updated_at).format('YYYY-MM-DD HH:mm')}</span>
                    </div>
                  </div>
                </div>

                {/* 题目解析 */}
                {questionDetail.explanation && (
                  <div className="mb-5">
                    <span className="block text-xs text-gray-500 mb-2 font-medium">题目解析</span>
                    <div className="bg-gray-50 p-3 rounded-md text-sm">
                      {questionDetail.explanation}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-10 text-gray-500">
                请选择一道题目查看详情
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 底部操作栏 */}
      {selectedRowKeys.length > 0 && (
        <Card className="mt-4">
          <CardContent className="py-3 px-4">
            <div className="flex justify-between items-center">
              <span className="text-[13px]">
                已选 <span className="font-semibold text-primary-500">{selectedRowKeys.length}</span> 道题目
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearSelection}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  清空
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateQuiz}
                >
                  立即组卷
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QuestionTab;
