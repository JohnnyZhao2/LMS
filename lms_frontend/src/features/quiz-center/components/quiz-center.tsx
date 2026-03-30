import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from 'lucide-react';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { QuizTab } from '../quizzes/components/quiz-tab';
import { ROUTES } from '@/config/routes';
import { PageHeader } from '@/components/ui/page-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuestionTab } from '../questions/components/question-tab';
import { SearchInput } from '@/components/ui/search-input';
import { CircleButton } from '@/components/ui/circle-button';

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
      />

      {/* 内容区域 */}
      <div className="flex flex-1 min-h-0 flex-col reveal-item stagger-delay-2">
        <div className="flex flex-1 min-h-0 flex-col">
          <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
              <Tabs
                value={activeTab}
                onValueChange={(v) => {
                  const nextTab = v as 'quizzes' | 'questions';
                  setSearch('');
                  const nextParams = new URLSearchParams(searchParams);
                  nextParams.set('tab', nextTab);
                  setSearchParams(nextParams, { replace: true });
                }}
              >
                <TabsList className="shrink-0">
                  <TabsTrigger value="quizzes">试卷列表</TabsTrigger>
                  <TabsTrigger value="questions">题库管理</TabsTrigger>
                </TabsList>
              </Tabs>

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
                  className="w-full xl:w-auto xl:shrink-0"
                />
              )}
            </div>

            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-end">
              <SearchInput
                className="w-full xl:w-80"
                placeholder={activeTab === 'quizzes' ? "搜索试卷标题..." : "搜索题目内容..."}
                value={search}
                onChange={setSearch}
              />

              <CircleButton
                onClick={handleAdd}
                label={activeTab === 'quizzes' ? '构建全新试卷' : '新建题目'}
                className="self-end xl:self-auto"
              />
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
