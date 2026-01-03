"use client"

import React, { useState, useMemo } from 'react';
import { Pencil, CheckCircle, Database, User, Clock, AlertCircle, Sparkles, Box } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuestions, useQuestionDetail } from '@/features/questions/api/get-questions';
import { useLineTypeTags } from '@/features/knowledge/api/get-tags';
import type { QuestionType } from '@/types/api';
import dayjs from '@/lib/dayjs';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton, Pagination } from '@/components/ui';

const QUESTION_TYPE_FILTER_OPTIONS = [
  { label: '全部', value: 'ALL' },
  { label: '单选题', value: 'SINGLE_CHOICE' },
  { label: '多选题', value: 'MULTIPLE_CHOICE' },
  { label: '判断题', value: 'TRUE_FALSE' },
  { label: '简答题', value: 'SHORT_ANSWER' },
];

const QUESTION_TYPE_CONFIG: Record<QuestionType, { label: string; color: string; bg: string }> = {
  SINGLE_CHOICE: { label: '单选', color: 'text-blue-600', bg: 'bg-blue-50' },
  MULTIPLE_CHOICE: { label: '多选', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  TRUE_FALSE: { label: '判断', color: 'text-amber-600', bg: 'bg-amber-50' },
  SHORT_ANSWER: { label: '简答', color: 'text-blue-600', bg: 'bg-blue-50' },
};

interface QuestionTabProps {
  search?: string;
}

export const QuestionTab: React.FC<QuestionTabProps> = ({ search = '' }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const pageSize = 7;
  const [questionTypeFilter, setQuestionTypeFilter] = useState<string>('ALL');
  const [lineTypeFilter, setLineTypeFilter] = useState<string>('ALL');
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  const questionType = questionTypeFilter === 'ALL' ? undefined : questionTypeFilter as QuestionType;
  const lineTypeId = lineTypeFilter === 'ALL' ? undefined : Number(lineTypeFilter);

  const { data, isLoading, isFetching } = useQuestions({
    page,
    pageSize,
    questionType,
    lineTypeId,
    search: search || undefined,
  });
  const { data: lineTypes } = useLineTypeTags();

  const lineTypeFilterOptions = useMemo(() => {
    const options = [{ label: '全部', value: 'ALL' }];
    if (lineTypes) lineTypes.forEach(tag => options.push({ label: tag.name, value: String(tag.id) }));
    return options;
  }, [lineTypes]);

  const { data: questionDetail, isLoading: detailLoading } = useQuestionDetail(selectedQuestionId || 0);

  const isCorrectAnswer = (optionKey: string, answer?: string | string[]) => {
    if (!answer) return false;
    return Array.isArray(answer) ? answer.includes(optionKey) : answer === optionKey;
  };

  return (
    <div className="flex flex-col gap-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* 顶部过滤器 */}
      <div className="flex flex-wrap gap-6 items-center bg-gray-100 p-6 rounded-lg shadow-none">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Question Structure</span>
          <div className="flex bg-white p-1 rounded-md shadow-none">
            {QUESTION_TYPE_FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setQuestionTypeFilter(opt.value)}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-md transition-all duration-200",
                  questionTypeFilter === opt.value 
                    ? "bg-gray-900 text-white shadow-none" 
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Logic Stream</span>
          <div className="flex bg-white p-1 rounded-md shadow-none overflow-x-auto max-w-lg no-scrollbar">
            {lineTypeFilterOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setLineTypeFilter(opt.value)}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-md transition-all duration-200 whitespace-nowrap",
                  lineTypeFilter === opt.value 
                    ? "bg-blue-600 text-white shadow-none" 
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 核心分屏 */}
      <div className="flex gap-6">
        {/* 左侧列表 */}
        <div className="flex-1 bg-white rounded-lg shadow-none flex flex-col">
          <div className="h-[57px] p-4 border-b-2 border-gray-100 flex justify-between items-center bg-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" strokeWidth={2} />
              <span className="text-sm font-bold text-gray-900 uppercase tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Governance Index
              </span>
            </div>
            <Badge variant="secondary" className="bg-gray-100 text-gray-600 font-bold px-3 shadow-none">
              {data?.count || 0}
            </Badge>
          </div>

          <div className="h-[560px] overflow-hidden flex flex-col relative">
            {isLoading && !data ? (
              <div className="p-6 space-y-4 h-full overflow-hidden">
                {[1, 2, 3, 4, 5, 6, 7].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg flex-shrink-0" />)}
              </div>
            ) : data?.results && data.results.length > 0 ? (
              <div className="h-full flex flex-col overflow-hidden">
                {/* 加载指示器 - 仅在后台获取时显示 */}
                {isFetching && data && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600/20 z-10">
                    <div className="h-full bg-blue-600 animate-pulse" style={{ width: '40%' }} />
                  </div>
                )}
                {data.results.map(q => {
                const config = QUESTION_TYPE_CONFIG[q.question_type] || { label: '未知', color: 'text-gray-600', bg: 'bg-gray-100' };
                const isSelected = selectedQuestionId === q.id;
                return (
                  <div
                    key={q.id}
                    onClick={() => setSelectedQuestionId(q.id)}
                    className={cn(
                      "h-[80px] p-4 border-b border-gray-100 cursor-pointer transition-all duration-200 group flex items-start gap-4 hover:bg-gray-50 hover:scale-[1.01] flex-shrink-0",
                      isSelected && "bg-blue-50 border-l-4 border-l-blue-600"
                    )}
                  >
                    <Checkbox
                      className="mt-1.5"
                      checked={selectedRowKeys.includes(q.id)}
                      onCheckedChange={() => {
                        setSelectedRowKeys(prev => prev.includes(q.id) ? prev.filter(k => k !== q.id) : [...prev, q.id])
                      }}
                      onClick={e => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={cn("border-none px-2 py-0.5 text-[10px] font-bold uppercase shadow-none", config.bg, config.color)}>
                          {config.label}
                        </Badge>
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-tight">
                          {q.line_type?.name || 'General'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 line-clamp-2 leading-relaxed" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        {q.content}
                      </h4>
                    </div>
                    <div className="text-[10px] font-semibold text-gray-400 mt-1 uppercase whitespace-nowrap">
                      {dayjs(q.updated_at).format('MM.DD')}
                    </div>
                  </div>
                )
              })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <AlertCircle className="w-10 h-10 opacity-30 mb-3" strokeWidth={2} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Repository Empty
                </span>
              </div>
            )}
          </div>

          {/* 分页 */}
          {data && data.count > pageSize && (
            <div className="p-4 border-t-2 border-gray-100 bg-gray-50 flex justify-center flex-shrink-0">
              <Pagination
                current={page}
                total={data.count}
                pageSize={pageSize}
                onChange={(newPage) => setPage(newPage)}
              />
            </div>
          )}
        </div>

        {/* 右侧详情 */}
        <div className="flex-1 bg-white rounded-lg shadow-none flex flex-col overflow-hidden">
          <div className="h-[57px] p-4 border-b-2 border-gray-100 flex justify-between items-center bg-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" strokeWidth={2} />
              <span className="text-sm font-bold text-gray-900 uppercase tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Intelligence Preview
              </span>
            </div>
            <div className="flex items-center gap-2 h-full">
              {questionDetail ? (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 rounded-md font-bold text-blue-600 hover:bg-blue-50 shadow-none px-3" 
                    onClick={() => navigate(`/test-center/questions/${questionDetail.id}/edit`)}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                  </Button>
                  <Button
                    className={cn(
                      "h-8 rounded-md font-bold text-xs uppercase shadow-none transition-all duration-200 hover:scale-105 px-3",
                      selectedRowKeys.includes(questionDetail.id) 
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
                        : "bg-gray-900 hover:bg-gray-800 text-white"
                    )}
                    size="sm"
                    onClick={() => {
                      const id = questionDetail.id;
                      setSelectedRowKeys(prev => prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id])
                    }}
                  >
                    {selectedRowKeys.includes(questionDetail.id) ? <><CheckCircle className="w-3.5 h-3.5 mr-2" /> In Quiz</> : 'Add to Quiz'}
                  </Button>
                </>
              ) : (
                <Badge variant="secondary" className="bg-gray-100 text-gray-600 font-bold px-3 shadow-none opacity-0 pointer-events-none">
                  0
                </Badge>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
            {detailLoading ? (
              <div className="space-y-6">
                <Skeleton className="h-20 w-full rounded-lg" />
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
                </div>
              </div>
            ) : questionDetail ? (
              <div>
                {/* 题干内容 */}
                <div className="mb-6 p-6 bg-gray-100 rounded-lg shadow-none">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    Prompt Body
                  </span>
                  <p className="text-base font-bold text-gray-900 leading-relaxed" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {questionDetail.content}
                  </p>
                </div>

                {/* 选项渲染 */}
                {questionDetail.options && questionDetail.options.length > 0 && (
                  <div className="space-y-3 mb-6">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block px-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      Mapping Options
                    </span>
                    {questionDetail.options.map(opt => {
                      const isCorrect = isCorrectAnswer(opt.key, questionDetail.answer);
                      return (
                        <div
                          key={opt.key}
                          className={cn(
                            "p-4 rounded-lg border-2 flex items-center gap-4 transition-all duration-200 shadow-none",
                            isCorrect 
                              ? "bg-emerald-50 border-emerald-500" 
                              : "bg-white border-gray-200"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-md flex items-center justify-center font-bold text-sm shadow-none",
                            isCorrect ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500"
                          )}>
                            {opt.key}
                          </div>
                          <span className={cn("text-sm font-semibold", isCorrect ? "text-emerald-700" : "text-gray-700")} style={{ fontFamily: "'Outfit', sans-serif" }}>
                            {opt.value}
                          </span>
                          {isCorrect && <CheckCircle className="w-5 h-5 text-emerald-500 ml-auto" strokeWidth={2.5} />}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* 特殊类型答案 */}
                {questionDetail.question_type === 'TRUE_FALSE' && (
                  <div className="mb-6">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-3 px-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      Boolean State
                    </span>
                    <div className={cn(
                      "inline-flex items-center gap-3 px-6 py-3 rounded-lg font-bold shadow-none",
                      questionDetail.answer?.toLowerCase() === 'true' 
                        ? "bg-emerald-50 text-emerald-600 border-2 border-emerald-500" 
                        : "bg-red-50 text-red-600 border-2 border-red-500"
                    )} style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {questionDetail.answer?.toLowerCase() === 'true' ? 'CORRECT / 正确' : 'WRONG / 错误'}
                    </div>
                  </div>
                )}

                {questionDetail.question_type === 'SHORT_ANSWER' && (
                  <div className="mb-6">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-3 px-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      Reference Model
                    </span>
                    <div className="p-6 bg-blue-50 rounded-lg border-2 border-blue-200 text-sm font-semibold text-blue-900 leading-relaxed shadow-none" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {questionDetail.answer || 'No reference model provided.'}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6 pt-6 border-t-2 border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center text-gray-500 shadow-none">
                      <User className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        Architect
                      </span>
                      <span className="text-xs font-semibold text-gray-700" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        {questionDetail.created_by_name || 'System Auto'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center text-gray-500 shadow-none">
                      <Clock className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        Deployment
                      </span>
                      <span className="text-xs font-semibold text-gray-700" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        {dayjs(questionDetail.updated_at).format('YYYY.MM.DD HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                <Box className="w-16 h-16 opacity-20 mb-4" strokeWidth={1.5} />
                <h3 className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Select an Asset
                </h3>
                <p className="text-[10px] font-semibold text-gray-400 mt-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Waiting for intelligence selection...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部悬浮动作条 */}
      {selectedRowKeys.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-gray-900 text-white px-8 py-4 rounded-lg shadow-none flex items-center gap-8 border-none">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold text-lg shadow-none">
                {selectedRowKeys.length}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Question Payload
                </span>
                <span className="text-sm font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Assets Ready for Assembly
                </span>
              </div>
            </div>
            <div className="w-[1px] h-10 bg-white/20" />
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setSelectedRowKeys([])}
                className="text-gray-300 hover:text-white font-bold text-xs uppercase shadow-none"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Reset Build
              </Button>
              <Button
                onClick={() => {
                  const ids = selectedRowKeys.join(',');
                  navigate(`/test-center/quizzes/create?question_ids=${ids}`);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold text-xs px-6 h-12 shadow-none hover:scale-105 transition-all duration-200"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Construct Quiz Engine
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionTab;
