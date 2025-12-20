import { useState, useCallback } from 'react';
import { Tabs, Typography } from 'antd';
import { FileTextOutlined, FormOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QuestionTab } from './question-tab';
import { QuizTab } from './quiz-tab';

const { Title } = Typography;

/**
 * 测试中心统一页面
 * 包含题目管理和试卷管理两个标签页
 */
export const TestCenter: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'questions';

  /**
   * 快速组卷完成后的回调
   * 跳转到任务创建流程
   */
  const handleQuickCreateQuiz = useCallback((quizId: number, taskType: 'PRACTICE' | 'EXAM') => {
    navigate(`/tasks/create?quiz_id=${quizId}&task_type=${taskType}`);
  }, [navigate]);

  /**
   * 快速发布完成后的回调
   * 跳转到任务创建流程
   */
  const handleQuickPublish = useCallback((quizIds: number[], taskType: 'PRACTICE' | 'EXAM') => {
    const quizIdsParam = quizIds.join(',');
    navigate(`/tasks/create?quiz_ids=${quizIdsParam}&task_type=${taskType}`);
  }, [navigate]);

  const handleTabChange = (key: string) => {
    setSearchParams({ tab: key });
  };

  const tabItems = [
    {
      key: 'questions',
      label: (
        <span>
          <FormOutlined />
          题目管理
        </span>
      ),
      children: <QuestionTab onQuickCreateQuiz={handleQuickCreateQuiz} />,
    },
    {
      key: 'quizzes',
      label: (
        <span>
          <FileTextOutlined />
          试卷管理
        </span>
      ),
      children: <QuizTab onQuickPublish={handleQuickPublish} />,
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>测试中心</Title>
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        size="large"
      />
    </div>
  );
};

