import React, { useState } from 'react';
import { Plus, Search, Layout, FileText, CheckCircle } from 'lucide-react';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { QuizTab } from '../quizzes/components/quiz-tab';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/config/routes';
import { ContentPanel } from '@/components/ui/content-panel';
import { PageHeader } from '@/components/ui/page-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StatCard } from '@/components/ui/stat-card';
import { QuestionTab } from '../questions/components/question-tab';
import { useQuizzes } from '../quizzes/api/get-quizzes';
import { useQuestions } from '../questions/api/get-questions';

/**
 * 试卷中心 - 扁平设计系统版本
 * 采用零阴影、颜色块结构、几何纯度设计原则
 */
export const QuizCenter: React.FC = () => {
  const { roleNavigate } = useRoleNavigate();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'quizzes' | 'questions'>('quizzes');
  const [quizType, setQuizType] = useState<'ALL' | 'EXAM' | 'PRACTICE'>('ALL');

  const { data: quizzesData } = useQuizzes({ page: 1, pageSize: 1 });
  const { data: questionsData } = useQuestions({ page: 1, pageSize: 1 });

  const stats = React.useMemo(() => ({
    totalQuizzes: quizzesData?.count || 0,
    totalQuestions: questionsData?.count || 0,
  }), [quizzesData, questionsData]);

  const handleAdd = () => {
    roleNavigate(`${ROUTES.QUIZ_CENTER_QUIZZES}/create`);
  };

  return (
    <div className="space-y-10 pb-10">
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
          accentClassName="bg-primary"
          gradient=""
          delay="stagger-delay-1"
        />
        <StatCard
          title="题库总量"
          value={stats.totalQuestions}
          icon={FileText}
          accentClassName="bg-secondary"
          gradient=""
          delay="stagger-delay-2"
        />
        <StatCard
          title="及格标准"
          value="60%"
          icon={CheckCircle}
          accentClassName="bg-warning"
          gradient=""
          delay="stagger-delay-3"
        />
      </div>

      {/* 内容区域 */}
      <div className="flex-1 flex flex-col min-h-0 reveal-item stagger-delay-2">
        <ContentPanel className="flex-1 flex flex-col overflow-hidden">
          {/* 选项卡搜索与切换区域 */}
          <div className="flex flex-col gap-6 mb-8">
            {/* 顶层行：搜索框 + 这里的 Tab 切换（试卷/题库） */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 max-w-2xl flex flex-col md:flex-row items-start md:items-center gap-4">
                {/* 搜索框 */}
                <div className="relative group w-full md:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted group-focus-within:text-primary-600 transition-colors" />
                  <Input
                    className="pl-12 h-12 bg-muted border-0 rounded-lg focus:bg-background focus:ring-2 focus:ring-primary-500 text-sm font-medium  transition-all"
                    placeholder={activeTab === 'quizzes' ? "搜索试卷标题..." : "搜索题目内容..."}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

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
                    variant="premium"
                    activeColor="white"
                    className="w-full md:w-auto"
                  />
                )}
              </div>

              {/* 右侧：主维度切换 */}
              <SegmentedControl
                value={activeTab}
                onChange={(v: string) => {
                  setActiveTab(v as 'quizzes' | 'questions');
                  setSearch('');
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
          </div>

          {activeTab === 'quizzes' ? (
            <QuizTab search={search} quizType={quizType === 'ALL' ? undefined : quizType} />
          ) : (
            <QuestionTab search={search} />
          )}
        </ContentPanel>
      </div>
    </div>
  );
};

export default QuizCenter;
