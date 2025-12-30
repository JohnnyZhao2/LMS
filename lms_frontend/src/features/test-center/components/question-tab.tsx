"use client"

import React, { useState, useMemo } from 'react';
import { Pencil, CheckCircle, Database, User, Clock, AlertCircle, Sparkles, ChevronLeft, ChevronRight, Box } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuestions, useQuestionDetail } from '@/features/questions/api/get-questions';
import { useLineTypeTags } from '@/features/knowledge/api/get-tags';
import type { QuestionType } from '@/types/api';
import dayjs from '@/lib/dayjs';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui';

const QUESTION_TYPE_FILTER_OPTIONS = [
  { label: '全部', value: 'ALL' },
  { label: '单选题', value: 'SINGLE_CHOICE' },
  { label: '多选题', value: 'MULTIPLE_CHOICE' },
  { label: '判断题', value: 'TRUE_FALSE' },
  { label: '简答题', value: 'SHORT_ANSWER' },
];

const QUESTION_TYPE_CONFIG: Record<QuestionType, { label: string; color: string; bg: string }> = {
  SINGLE_CHOICE: { label: '单选', color: 'text-primary-600', bg: 'bg-primary-50' },
  MULTIPLE_CHOICE: { label: '多选', color: 'text-success-600', bg: 'bg-success-50' },
  TRUE_FALSE: { label: '判断', color: 'text-orange-600', bg: 'bg-orange-50' },
  SHORT_ANSWER: { label: '简答', color: 'text-purple-600', bg: 'bg-purple-50' },
};

interface QuestionTabProps {
  search?: string;
}

export const QuestionTab: React.FC<QuestionTabProps> = ({ search = '' }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [questionTypeFilter, setQuestionTypeFilter] = useState<string>('ALL');
  const [lineTypeFilter, setLineTypeFilter] = useState<string>('ALL');
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  const questionType = questionTypeFilter === 'ALL' ? undefined : questionTypeFilter as QuestionType;
  const lineTypeId = lineTypeFilter === 'ALL' ? undefined : Number(lineTypeFilter);

  const { data, isLoading } = useQuestions({
    page,
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
    <div className="flex flex-col gap-6 h-[700px]">
      {/* 顶部过滤器 */}
      <div className="flex flex-wrap gap-8 items-center bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Question Structure</span>
          <div className="flex bg-white/80 p-1.5 rounded-2xl shadow-sm border border-white">
            {QUESTION_TYPE_FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setQuestionTypeFilter(opt.value)}
                className={cn(
                  "px-5 py-2 text-xs font-bold rounded-xl transition-all",
                  questionTypeFilter === opt.value ? "bg-gray-900 text-white shadow-lg" : "text-gray-400 hover:text-gray-600"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Logic Stream</span>
          <div className="flex bg-white/80 p-1.5 rounded-2xl shadow-sm border border-white overflow-x-auto max-w-lg no-scrollbar">
            {lineTypeFilterOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setLineTypeFilter(opt.value)}
                className={cn(
                  "px-5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap",
                  lineTypeFilter === opt.value ? "bg-primary-500 text-white shadow-lg shadow-primary-500/20" : "text-gray-400 hover:text-gray-600"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 核心分屏 */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* 左侧列表 */}
        <div className="flex-1 bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-black text-gray-900 uppercase tracking-tight">Governance Index</span>
            </div>
            <Badge variant="secondary" className="bg-gray-100 text-gray-500 font-bold px-3">{data?.count || 0}</Badge>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
              </div>
            ) : data?.results && data.results.length > 0 ? (
              data.results.map(q => {
                const config = QUESTION_TYPE_CONFIG[q.question_type] || { label: '未知', color: 'text-gray-600', bg: 'bg-gray-50' };
                const isSelected = selectedQuestionId === q.id;
                return (
                  <div
                    key={q.id}
                    onClick={() => setSelectedQuestionId(q.id)}
                    className={cn(
                      "p-6 border-b border-gray-50 cursor-pointer transition-all duration-300 group flex items-start gap-4 hover:bg-gray-50/50",
                      isSelected && "bg-primary-50/30 border-l-[6px] border-l-primary-500 pl-[1.125rem]"
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
                        <Badge className={cn("border-none px-2 py-0 text-[9px] font-black uppercase", config.bg, config.color)}>
                          {config.label}
                        </Badge>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                          {q.line_type?.name || 'General'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-800 line-clamp-2 leading-relaxed">
                        {q.content}
                      </h4>
                    </div>
                    <div className="text-[10px] font-bold text-gray-300 mt-1 uppercase whitespace-nowrap">
                      {dayjs(q.updated_at).format('MM.DD')}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <AlertCircle className="w-10 h-10 opacity-20 mb-3" />
                <span className="text-xs font-bold uppercase tracking-widest">Repository Empty</span>
              </div>
            )}
          </div>

          {/* 分页按钮 */}
          {data && data.count > 10 && (
            <div className="p-4 border-t border-gray-50 bg-gray-50/30 flex justify-center gap-4">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" disabled={page === 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2 text-sm font-black text-gray-900">
                {page} <span className="text-gray-300">/</span> {Math.ceil(data.count / 10)}
              </div>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" disabled={!data.next} onClick={() => setPage(page + 1)}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>

        {/* 右侧详情 */}
        <div className="flex-1 bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-white/50 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-black text-gray-900 uppercase tracking-tight">Intelligence Preview</span>
            </div>
            {questionDetail && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="rounded-xl font-bold text-primary-600 hover:bg-primary-50" onClick={() => navigate(`/test-center/questions/${questionDetail.id}/edit`)}>
                  <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                </Button>
                <Button
                  className={cn(
                    "rounded-xl font-bold text-xs uppercase shadow-lg shadow-primary-500/10 transition-all",
                    selectedRowKeys.includes(questionDetail.id) ? "bg-success-500 hover:bg-success-600 text-white" : "bg-gray-900 hover:bg-gray-800 text-white"
                  )}
                  size="sm"
                  onClick={() => {
                    const id = questionDetail.id;
                    setSelectedRowKeys(prev => prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id])
                  }}
                >
                  {selectedRowKeys.includes(questionDetail.id) ? <><CheckCircle className="w-3.5 h-3.5 mr-2" /> In Quiz</> : 'Add to Quiz'}
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
            {detailLoading ? (
              <div className="space-y-6">
                <Skeleton className="h-20 w-full rounded-2xl" />
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                </div>
              </div>
            ) : questionDetail ? (
              <div className="animate-fadeIn">
                {/* 题干内容 */}
                <div className="mb-8 p-6 bg-gray-50/50 rounded-3xl border border-gray-100">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Prompt Body</span>
                  <p className="text-lg font-bold text-gray-900 leading-relaxed">{questionDetail.content}</p>
                </div>

                {/* 选项渲染 */}
                {questionDetail.options && questionDetail.options.length > 0 && (
                  <div className="space-y-3 mb-8">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Mapping Options</span>
                    {questionDetail.options.map(opt => {
                      const isCorrect = isCorrectAnswer(opt.key, questionDetail.answer);
                      return (
                        <div
                          key={opt.key}
                          className={cn(
                            "p-4 rounded-2xl border-2 flex items-center gap-4 transition-all duration-500",
                            isCorrect ? "bg-success-50 border-success-200 shadow-lg shadow-success-500/5 translate-x-2" : "bg-white border-gray-100"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm",
                            isCorrect ? "bg-success-500 text-white" : "bg-gray-100 text-gray-400"
                          )}>
                            {opt.key}
                          </div>
                          <span className={cn("text-sm font-bold", isCorrect ? "text-success-700" : "text-gray-700")}>
                            {opt.value}
                          </span>
                          {isCorrect && <CheckCircle className="w-5 h-5 text-success-500 ml-auto" />}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* 特殊类型答案 */}
                {questionDetail.question_type === 'TRUE_FALSE' && (
                  <div className="mb-8">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3 px-1">Boolean State</span>
                    <div className={cn(
                      "inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-black italic",
                      questionDetail.answer?.toLowerCase() === 'true' ? "bg-success-50 text-success-600 border border-success-100" : "bg-error-50 text-error-600 border border-error-100"
                    )}>
                      {questionDetail.answer?.toLowerCase() === 'true' ? 'CORRECT / 正确' : 'WRONG / 错误'}
                    </div>
                  </div>
                )}

                {questionDetail.question_type === 'SHORT_ANSWER' && (
                  <div className="mb-8">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3 px-1">Reference Model</span>
                    <div className="p-6 bg-primary-50/30 rounded-3xl border border-primary-100 text-sm font-bold text-primary-900 leading-relaxed italic">
                      {questionDetail.answer || 'No reference model provided.'}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6 pt-8 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Architect</span>
                      <span className="text-xs font-bold text-gray-700">{questionDetail.created_by_name || 'System Auto'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Deployment</span>
                      <span className="text-xs font-bold text-gray-700">{dayjs(questionDetail.updated_at).format('YYYY.MM.DD HH:mm')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                <Box className="w-16 h-16 opacity-10 mb-4" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em]">Select an Asset</h3>
                <p className="text-[10px] font-bold text-gray-300 mt-2 italic">Waiting for intelligence selection...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部悬浮动作条 */}
      {selectedRowKeys.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-fadeInUp">
          <div className="bg-gray-900 text-white px-8 py-5 rounded-[2.5rem] shadow-2xl flex items-center gap-10 border border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center text-white font-black text-lg">
                {selectedRowKeys.length}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-primary-400 uppercase tracking-widest">Question Payload</span>
                <span className="text-sm font-black italic">Assets Ready for Assembly</span>
              </div>
            </div>
            <div className="w-[1px] h-10 bg-white/10" />
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setSelectedRowKeys([])}
                className="text-gray-400 hover:text-white font-black text-xs uppercase"
              >
                Reset Build
              </Button>
              <Button
                onClick={() => {
                  const ids = selectedRowKeys.join(',');
                  navigate(`/test-center/quizzes/create?question_ids=${ids}`);
                }}
                className="bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-black text-xs px-8 h-12 shadow-xl shadow-primary-500/20"
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
