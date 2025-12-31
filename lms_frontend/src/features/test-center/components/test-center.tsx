"use client"

import React, { useCallback, useState } from 'react';
import { Plus, Search, Database, Layout, Activity } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QuestionTab } from './question-tab';
import { QuizTab } from './quiz-tab';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ContentPanel } from '@/components/ui';

/**
 * 测试治理中心 - 扁平设计系统版本
 * 采用零阴影、颜色块结构、几何纯度设计原则
 */
export const TestCenter: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'questions';
  const [search, setSearch] = useState('');

  const handleQuickPublish = useCallback((quizIds: number[]) => {
    const quizIdsParam = quizIds.join(',');
    navigate(`/tasks/create?quiz_ids=${quizIdsParam}`);
  }, [navigate]);

  const handleTabChange = (tab: 'questions' | 'quizzes') => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    setSearchParams(newParams);
    setSearch('');
  };

  const handleAdd = () => {
    if (activeTab === 'questions') {
      navigate('/test-center/questions/create');
    } else {
      navigate('/test-center/quizzes/create');
    }
  };

  return (
    <div
      className="flex flex-col gap-8"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* 顶部控制面板 */}
      <div className="flex flex-col gap-8">
        {/* 标题区域 */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-3">
            <h2
              className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-4"
              style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}
            >
              <div className="w-14 h-14 bg-gray-900 rounded-lg flex items-center justify-center text-white">
                <Activity className="w-7 h-7" strokeWidth={2.5} />
              </div>
              测试治理中心
            </h2>
            <p
              className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-3"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              <span className="w-8 h-[2px] bg-blue-500" />
              Intelligence Assessment Engine
            </p>
          </div>

          {/* 搜索和操作区域 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="relative group min-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
              <Input
                className="h-14 pl-12 pr-4 bg-gray-100 rounded-md border-none focus:bg-white focus:border-2 focus:border-blue-600 text-base font-medium shadow-none"
                placeholder={activeTab === 'questions' ? '搜索库内题目名称或类型...' : '搜索试卷标题或编号...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Button
              onClick={handleAdd}
              className="h-14 px-6 rounded-md bg-blue-600 text-white font-bold hover:bg-blue-700 hover:scale-105 transition-all duration-200 shadow-none"
            >
              <Plus className="mr-2 h-5 w-5" />
              {activeTab === 'questions' ? '新增治理题目' : '构建全新试卷'}
            </Button>
          </div>
        </div>

        {/* 核心导航切换器 */}
        <div className="flex items-center justify-center">
          <div className="bg-gray-100 p-1.5 rounded-lg flex gap-2 shadow-none">
            <button
              onClick={() => handleTabChange('questions')}
              className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-md text-sm font-bold transition-all duration-200",
                activeTab === 'questions'
                  ? "bg-white text-gray-900 shadow-none"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              <Database className={cn("w-5 h-5", activeTab === 'questions' ? "text-blue-600" : "text-gray-400")} strokeWidth={2} />
              题库治理
            </button>
            <button
              onClick={() => handleTabChange('quizzes')}
              className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-md text-sm font-bold transition-all duration-200",
                activeTab === 'quizzes'
                  ? "bg-white text-gray-900 shadow-none"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              <Layout className={cn("w-5 h-5", activeTab === 'quizzes' ? "text-blue-600" : "text-gray-400")} strokeWidth={2} />
              试卷管理
            </button>
          </div>
        </div>
      </div>

      {/* 动态内容区域 */}
      <div className="flex-1">
        <ContentPanel padding="lg" className="min-h-[600px] relative overflow-hidden">
          {/* 背景装饰几何形状 */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#3B82F6]/5 rounded-full -mr-32 -mt-32 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#10B981]/5 rounded-full -ml-24 -mb-24 pointer-events-none" />

          {activeTab === 'questions' ? (
            <QuestionTab search={search} />
          ) : (
            <QuizTab onQuickPublish={handleQuickPublish} search={search} />
          )}
        </ContentPanel>
      </div>
    </div>
  );
};

export default TestCenter;
