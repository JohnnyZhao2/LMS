"use client"

import React, { useCallback, useState } from 'react';
import { Plus, Search, Database, FileText, Layout, Activity, Filter, Box } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QuestionTab } from './question-tab';
import { QuizTab } from './quiz-tab';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * 测试治理中心 - 极致美学版
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
    <div className="flex flex-col gap-8 animate-fadeIn">
      {/* 顶部控制面板 */}
      <div className="reveal-item">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-gray-900 tracking-tight font-display flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-black/10">
                <Activity className="w-7 h-7" />
              </div>
              测试治理中心
            </h2>
            <p className="text-base font-bold text-gray-400 uppercase tracking-widest flex items-center gap-3">
              <span className="w-8 h-[2px] bg-primary-500/30 rounded-full" />
              Intelligence Assessment Engine
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group min-w-[320px]">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
              <Input
                className="h-16 pl-14 pr-8 bg-white rounded-[1.25rem] border-none shadow-premium focus:ring-4 ring-primary-50 text-base font-medium"
                placeholder={activeTab === 'questions' ? '搜索库内题目名称或类型...' : '搜索试卷标题或编号...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Button
              onClick={handleAdd}
              className="btn-gradient h-12 px-6 rounded-xl text-white font-bold shadow-md shadow-primary-500/20 hover:scale-105 transition-all duration-300"
            >
              <Plus className="mr-2 h-5 w-5" />
              {activeTab === 'questions' ? '新增治理题目' : '构建全新试卷'}
            </Button>
          </div>
        </div>

        {/* 核心导航 Switcher */}
        <div className="flex items-center justify-center mb-4">
          <div className="bg-gray-100/50 p-2 rounded-[1.5rem] flex gap-2 border border-white/40 shadow-inner">
            <button
              onClick={() => handleTabChange('questions')}
              className={cn(
                "flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-black transition-all duration-300",
                activeTab === 'questions' ? "bg-white text-gray-900 shadow-xl" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Database className={cn("w-5 h-5", activeTab === 'questions' ? "text-primary-500" : "")} />
              题库治理
            </button>
            <button
              onClick={() => handleTabChange('quizzes')}
              className={cn(
                "flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-black transition-all duration-300",
                activeTab === 'quizzes' ? "bg-white text-gray-900 shadow-xl" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Layout className={cn("w-5 h-5", activeTab === 'quizzes' ? "text-purple-500" : "")} />
              试卷管理
            </button>
          </div>
        </div>
      </div>

      {/* 动态内容区域 */}
      <div className="flex-1 reveal-item stagger-delay-1">
        <div className="glass-card rounded-[2.5rem] p-8 min-h-[600px] border-none overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

          {activeTab === 'questions' ? (
            <QuestionTab search={search} />
          ) : (
            <QuizTab onQuickPublish={handleQuickPublish} search={search} />
          )}
        </div>
      </div>
    </div>
  );
};

export default TestCenter;
