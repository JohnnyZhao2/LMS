import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Layout } from 'lucide-react';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { QuizTab } from '../quizzes/components/quiz-tab';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import { PageHeader } from '@/components/ui/page-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuestionTab } from '../questions/components/question-tab';
import { SearchInput } from '@/components/ui/search-input';

/**
 * 试卷中心 - 扁平设计系统版本
 * 采用零阴影、颜色块结构、几何纯度设计原则
 */
export const QuizCenter: React.FC = () => {
  const { roleNavigate } = useRoleNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [quizType, setQuizType] = useState<'ALL' | 'EXAM' | 'PRACTICE'>('ALL');
  const [questionCreateSignal, setQuestionCreateSignal] = useState(0);
  const activeTab = searchParams.get('tab') === 'questions' ? 'questions' : 'quizzes';

  const handleAdd = () => {
    if (activeTab === 'questions') {
      setQuestionCreateSignal(prev => prev + 1);
      return;
    }

    roleNavigate(`${ROUTES.QUIZ_CENTER_QUIZZES}/create`);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-10 pb-10">
      <PageHeader
        title="试卷中心"
        icon={<Layout />}
        extra={
          <div className="flex items-center gap-3">
            <Button
              onClick={handleAdd}
              className="h-10 px-4 rounded-md bg-primary text-white font-semibold hover:bg-primary-600 hover:scale-105 transition-all duration-200 shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              {activeTab === 'quizzes' ? '构建全新试卷' : '添加题目'}
            </Button>
          </div>
        }
      />

      {/* 内容区域 */}
      <div className="flex flex-1 min-h-0 flex-col reveal-item stagger-delay-2">
        <div className="flex flex-1 min-h-0 flex-col">
          {/* 选项卡搜索与切换区域 */}
          <div className="flex flex-col gap-6 mb-8">
            {/* 顶层行：搜索框 + 这里的 Tab 切换（试卷/题库） */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 max-w-2xl flex flex-col md:flex-row items-start md:items-center gap-4">
                {/* 搜索框 */}
                <SearchInput
                  className="w-full md:w-80"
                  placeholder={activeTab === 'quizzes' ? "搜索试卷标题..." : "搜索题目内容..."}
                  value={search}
                  onChange={setSearch}
                />

                {/* 类型筛选（仅试卷列表显示）- 现在与搜索框并排 */}
                {activeTab === 'quizzes' && (
                  <SegmentedControl
                    value={quizType}
                    onChange={(v: string) => setQuizType(v as 'ALL' | 'EXAM' | 'PRACTICE')}
                    options={[
                      { label: '全部', value: 'ALL' },
                      { label: '考试', value: 'EXAM' },
                      { label: '练习', value: 'PRACTICE' },
                    ]}
                    activeColor="white"
                    className="w-full md:w-auto"
                  />
                )}
              </div>

              {/* 右侧：主维度切换 */}
              <Tabs value={activeTab} onValueChange={(v) => {
                const nextTab = v as 'quizzes' | 'questions';
                setSearch('');
                const nextParams = new URLSearchParams(searchParams);
                nextParams.set('tab', nextTab);
                setSearchParams(nextParams, { replace: true });
              }}>
                <TabsList>
                  <TabsTrigger value="quizzes">试卷列表</TabsTrigger>
                  <TabsTrigger value="questions">题库管理</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="flex flex-1 min-h-0 flex-col">
            {activeTab === 'quizzes' ? (
              <QuizTab search={search} quizType={quizType === 'ALL' ? undefined : quizType} />
            ) : (
              <QuestionTab search={search} createSignal={questionCreateSignal} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizCenter;
