import React, { useCallback, useState } from 'react';
import { Button, Card, Input, Space, Row, Col } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QuestionTab } from './question-tab';
import { QuizTab } from './quiz-tab';

/**
 * 测试中心统一页面
 * 包含题目管理和试卷管理两个标签页
 * 采用固定导航栏 + 分屏布局
 */
export const TestCenter: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'questions';
  const [search, setSearch] = useState('');

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
      <Card styles={{ body: { padding: '16px 24px' } }} style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="middle">
              <Button
                type={activeTab === 'questions' ? 'primary' : 'default'}
                onClick={() => handleTabChange('questions')}
              >
                题库治理
              </Button>
              <Button
                type={activeTab === 'quizzes' ? 'primary' : 'default'}
                onClick={() => handleTabChange('quizzes')}
              >
                试卷管理
              </Button>
            </Space>
          </Col>
          <Col>
            <Space>
              <Input
                placeholder={activeTab === 'questions' ? '搜索题目...' : '搜索试卷...'}
                prefix={<SearchOutlined />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: 250 }}
                allowClear
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                {activeTab === 'questions' ? '新建题目' : '新建试卷'}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 内容区域 */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {activeTab === 'questions' ? (
          <QuestionTab
            onQuickCreateQuiz={handleQuickCreateQuiz}
            search={search}
          />
        ) : (
          <QuizTab onQuickPublish={handleQuickPublish} search={search} />
        )}
      </div>
    </div>
  );
};
