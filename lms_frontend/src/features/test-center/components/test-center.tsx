"use client"

import React, { useCallback, useState } from 'react';
import { Plus, Search, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QuizTab } from './quiz-tab';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/config/routes';
import { ContentPanel, PageHeader } from '@/components/ui';

/**
 * 测试治理中心 - 扁平设计系统版本
 * 采用零阴影、颜色块结构、几何纯度设计原则
 */
export const TestCenter: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleQuickPublish = useCallback((quizIds: number[]) => {
    const quizIdsParam = quizIds.join(',');
    navigate(`/tasks/create?quiz_ids=${quizIdsParam}`);
  }, [navigate]);

  const handleAdd = () => {
    navigate(`${ROUTES.TEST_CENTER_QUIZZES}/create`);
  };

  return (
    <div className="flex-1 flex flex-col gap-10 animate-fadeIn pb-12">
      <PageHeader
        title="试卷中心"
        subtitle="Quiz Management & Assessment Engine"
        icon={<Activity />}
        extra={
          <Button
            onClick={handleAdd}
            className="bg-blue-600 text-white font-semibold hover:bg-blue-700 hover:scale-105 transition-all duration-200 shadow-none"
          >
            <Plus className="mr-2 h-5 w-5" />
            构建全新试卷
          </Button>
        }
      />

      {/* 搜索区域 */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="relative group flex-1 max-w-lg">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9CA3AF] group-focus-within:text-blue-600 transition-colors" />
          <Input
            className="pl-14 bg-white border-2 border-gray-100 rounded-md focus:border-blue-600 text-base font-medium shadow-none transition-all"
            placeholder="搜索试卷标题或编号..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 flex flex-col min-h-0">
        <ContentPanel padding="md" className="flex-1 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#3B82F6]/5 rounded-full -mr-32 -mt-32 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#10B981]/5 rounded-full -ml-24 -mb-24 pointer-events-none" />

          <QuizTab onQuickPublish={handleQuickPublish} search={search} />
        </ContentPanel>
      </div>
    </div>
  );
};

export default TestCenter;
