"use client"

import React, { useState } from 'react';
import { Plus, Search, Layout, FileText, CheckCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QuizTab } from '../quizzes/components/quiz-tab';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/config/routes';
import { ContentPanel, PageHeader, SegmentedControl, StatCard } from '@/components/ui';
import { QuestionTab } from '../questions/components/question-tab';
import { useQuizzes } from '../quizzes/api/get-quizzes';
import { useQuestions } from '../questions/api/get-questions';

/**
 * 试卷中心 - 扁平设计系统版本
 * 采用零阴影、颜色块结构、几何纯度设计原则
 */
export const QuizCenter: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'quizzes' | 'questions'>('quizzes');

  const { data: quizzesData, refetch: refetchQuizzes } = useQuizzes({ page: 1, pageSize: 1 });
  const { data: questionsData, refetch: refetchQuestions } = useQuestions({ page: 1, pageSize: 1 });

  const stats = React.useMemo(() => ({
    totalQuizzes: quizzesData?.count || 0,
    totalQuestions: questionsData?.count || 0,
    activeQuizzes: quizzesData?.count || 0, // Placeholder since backend doesn't seem to have is_closed for quizzes yet
  }), [quizzesData, questionsData]);

  const handleAdd = () => {
    navigate(`${ROUTES.QUIZ_CENTER_QUIZZES}/create`);
  };

  return (
    <div className="flex-1 flex flex-col gap-10 animate-fadeIn pb-12">
      <PageHeader
        title="试卷中心"
        subtitle="管理题目资源与评估引擎"
        icon={<Layout />}
        extra={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="h-14 py-3 px-6 rounded-md border-4 border-[#E5E7EB] font-semibold text-[#6B7280] hover:bg-[#F3F4F6] flex items-center gap-2 shadow-none"
              onClick={() => {
                refetchQuizzes();
                refetchQuestions();
              }}
            >
              <RefreshCw className="h-4 w-4" />
              刷新
            </Button>
            <Button
              onClick={handleAdd}
              className="h-14 px-8 rounded-md bg-[#3B82F6] text-white font-semibold hover:bg-[#2563EB] hover:scale-105 transition-all duration-200 shadow-none"
            >
              <Plus className="mr-2 h-5 w-5" />
              构建全新试卷
            </Button>
          </div>
        }
      />

      {/* 统计网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="总试卷数"
          value={stats.totalQuizzes}
          icon={Layout}
          color="#3B82F6"
          gradient=""
          delay="stagger-delay-1"
        />
        <StatCard
          title="题库总量"
          value={stats.totalQuestions}
          icon={FileText}
          color="#10B981"
          gradient=""
          delay="stagger-delay-2"
        />
        <StatCard
          title="及格标准"
          value="60%"
          icon={CheckCircle}
          color="#F59E0B"
          gradient=""
          delay="stagger-delay-3"
        />
      </div>

      {/* 内容区域 */}
      <div className="flex-1 flex flex-col min-h-0 reveal-item stagger-delay-2">
        <ContentPanel className="flex-1 flex flex-col overflow-hidden">
          {/* 选项卡搜索与切换区域 */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
            <div className="flex-1 max-w-lg transition-all duration-300">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9CA3AF] group-focus-within:text-blue-600 transition-colors" />
                <Input
                  className="pl-14 h-14 bg-[#F3F4F6] border-0 rounded-md focus:bg-white focus:border-2 focus:border-blue-600 text-base font-medium shadow-none transition-all"
                  placeholder={activeTab === 'quizzes' ? "搜索试卷标题或编号..." : "搜索题目内容..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <SegmentedControl
              value={activeTab}
              onChange={(v: string) => {
                setActiveTab(v as 'quizzes' | 'questions');
                setSearch(''); // 切换时清空搜索
              }}
              options={[
                { label: '试卷列表', value: 'quizzes' },
                { label: '题库管理', value: 'questions' },
              ]}
              variant="premium"
              activeColor="white"
              className="w-full md:w-auto"
            />
          </div>

          {activeTab === 'quizzes' ? (
            <QuizTab search={search} />
          ) : (
            <QuestionTab search={search} />
          )}
        </ContentPanel>
      </div>
    </div>
  );
};

export default QuizCenter;
