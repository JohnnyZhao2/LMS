import React, { useCallback, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QuestionTab } from './question-tab';
import { QuizTabNew } from './quiz-tab-new';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * 测试中心统一页面 - ShadCN UI 版本
 * 包含题目管理和试卷管理两个标签页
 * 采用固定导航栏 + 分屏布局
 */
export const TestCenterNew: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'questions';
  const [search, setSearch] = useState('');

  /**
   * 快速发布完成后的回调
   * 跳转到任务创建流程
   */
  const handleQuickPublish = useCallback((quizIds: number[]) => {
    const quizIdsParam = quizIds.join(',');
    navigate(`/tasks/create?quiz_ids=${quizIdsParam}`);
  }, [navigate]);

  /**
   * 切换 tab
   */
  const handleTabChange = (tab: 'questions' | 'quizzes') => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    setSearchParams(newParams);
    setSearch(''); // 切换时清空搜索
  };

  /**
   * 新增按钮点击
   */
  const handleAdd = () => {
    if (activeTab === 'questions') {
      navigate('/test-center/questions/create');
    } else {
      navigate('/test-center/quizzes/create');
    }
  };

  return (
    <div style={{ height: 'calc(100vh - var(--header-height) - 48px)', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部导航栏 */}
      <Card className="mb-4">
        <CardContent className="py-4 px-6">
          <div className="flex justify-between items-center">
            <div className="flex gap-3">
              <Button
                variant={activeTab === 'questions' ? 'default' : 'outline'}
                onClick={() => handleTabChange('questions')}
              >
                题库治理
              </Button>
              <Button
                variant={activeTab === 'quizzes' ? 'default' : 'outline'}
                onClick={() => handleTabChange('quizzes')}
              >
                试卷管理
              </Button>
            </div>
            <div className="flex gap-3">
              <div className="relative w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={activeTab === 'questions' ? '搜索题目...' : '搜索试卷...'}
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                )}
              </div>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                {activeTab === 'questions' ? '新建题目' : '新建试卷'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 内容区域 */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {activeTab === 'questions' ? (
          <QuestionTab search={search} />
        ) : (
          <QuizTabNew onQuickPublish={handleQuickPublish} search={search} />
        )}
      </div>
    </div>
  );
};

export default TestCenterNew;
