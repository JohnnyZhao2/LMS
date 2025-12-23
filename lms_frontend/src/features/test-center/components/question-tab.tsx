import { useState } from 'react';
import { 
  Button, Space, Select, Tag, Checkbox, Typography, Card, Empty, Spin, 
  Pagination, Divider, Row, Col
} from 'antd';
import { 
  EditOutlined, CheckCircleOutlined, ClearOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuestions, useQuestionDetail } from '@/features/questions/api/get-questions';
import { useLineTypeTags } from '@/features/knowledge/api/get-tags';
import type { Question, QuestionType } from '@/types/api';
import dayjs from '@/lib/dayjs';

const { Option } = Select;
const { Text, Paragraph } = Typography;

interface QuestionTabProps {
  onQuickCreateQuiz?: (quizId: number, taskType: 'PRACTICE' | 'EXAM') => void;
  search?: string;
}

/**
 * 题目管理标签页
 * 采用分屏布局：左侧题目列表，右侧题目详情
 */
export const QuestionTab: React.FC<QuestionTabProps> = ({ search = '' }) => {
  const navigate = useNavigate();
  
  const [page, setPage] = useState(1);
  const [questionType, setQuestionType] = useState<QuestionType | undefined>();
  const [lineTypeId, setLineTypeId] = useState<number | undefined>();
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  const { data, isLoading } = useQuestions({ 
    page, 
    questionType, 
    lineTypeId,
    search: search || undefined,
  });
  const { data: lineTypes } = useLineTypeTags();
  const { data: questionDetail, isLoading: detailLoading } = useQuestionDetail(
    selectedQuestionId || 0
  );

  /**
   * 立即组卷
   */
  const handleCreateQuiz = () => {
    if (selectedRowKeys.length === 0) return;
    const questionIds = selectedRowKeys.join(',');
    navigate(`/test-center/quizzes/create?question_ids=${questionIds}`);
  };

  /**
   * 一键移除所有选中
   */
  const handleClearSelection = () => {
    setSelectedRowKeys([]);
  };

  /**
   * 切换题目选中状态
   */
  const handleToggleSelection = (questionId: number) => {
    setSelectedRowKeys(prev => {
      if (prev.includes(questionId)) {
        return prev.filter(id => id !== questionId);
      } else {
        return [...prev, questionId];
      }
    });
  };

  /**
   * 点击题目查看详情
   */
  const handleQuestionClick = (questionId: number) => {
    setSelectedQuestionId(questionId);
  };

  /**
   * 从详情面板勾选加入/取消
   */
  const handleAddFromDetail = () => {
    if (!selectedQuestionId) return;
    handleToggleSelection(selectedQuestionId);
  };

  /**
   * 获取题型标签
   */
  const getTypeTag = (type: QuestionType) => {
    const colors: Record<QuestionType, string> = {
      SINGLE_CHOICE: 'blue',
      MULTIPLE_CHOICE: 'green',
      TRUE_FALSE: 'orange',
      SHORT_ANSWER: 'purple',
    };
    const labels: Record<QuestionType, string> = {
      SINGLE_CHOICE: '单选',
      MULTIPLE_CHOICE: '多选',
      TRUE_FALSE: '判断',
      SHORT_ANSWER: '简答',
    };
    return <Tag color={colors[type]}>{labels[type]}</Tag>;
  };

  /**
   * 判断选项是否是正确答案
   */
  const isCorrectAnswer = (optionKey: string, answer?: string | string[]) => {
    if (!answer) return false;
    if (Array.isArray(answer)) {
      return answer.includes(optionKey);
    }
    return answer === optionKey;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 筛选栏 */}
      <Card bodyStyle={{ padding: '12px 24px' }} style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Text>题型：</Text>
              <Select
                style={{ width: 120 }}
                placeholder="全部"
                allowClear
                value={questionType}
                onChange={(value) => setQuestionType(value)}
              >
                <Option value="SINGLE_CHOICE">单选题</Option>
                <Option value="MULTIPLE_CHOICE">多选题</Option>
                <Option value="TRUE_FALSE">判断题</Option>
                <Option value="SHORT_ANSWER">简答题</Option>
              </Select>
            </Space>
          </Col>
          <Col>
            <Space>
              <Text>条线类型：</Text>
              <Select
                style={{ width: 150 }}
                placeholder="全部"
                allowClear
                value={lineTypeId}
                onChange={(value) => setLineTypeId(value)}
              >
                {lineTypes?.map((tag) => (
                  <Option key={tag.id} value={tag.id}>
                    {tag.name}
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 分屏布局 */}
      <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>
        {/* 左侧：题目列表 */}
        <Card 
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          bodyStyle={{ flex: 1, overflow: 'auto', padding: 0 }}
          title="题目列表"
          extra={<Text type="secondary">共 {data?.count || 0} 条</Text>}
        >
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
            </div>
          ) : data?.results && data.results.length > 0 ? (
            <div>
              {data.results.map((question) => (
                <div
                  key={question.id}
                  onClick={() => handleQuestionClick(question.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    background: selectedQuestionId === question.id ? 'var(--color-primary-bg)' : 'transparent',
                  }}
                >
                  <Checkbox
                    checked={selectedRowKeys.includes(question.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleToggleSelection(question.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Space size="small" style={{ marginBottom: 4 }}>
                      <Tag>{question.line_type?.name || '未分类'}</Tag>
                      {getTypeTag(question.question_type)}
                    </Space>
                    <Paragraph 
                      ellipsis={{ rows: 2 }} 
                      style={{ margin: 0, color: 'var(--color-text)' }}
                    >
                      {question.content}
                    </Paragraph>
                  </div>
                  <Text type="secondary" style={{ flexShrink: 0 }}>
                    {dayjs(question.updated_at).format('MM-DD')}
                  </Text>
                </div>
              ))}
              <div style={{ padding: 16, textAlign: 'center' }}>
                <Pagination
                  current={page}
                  total={data.count || 0}
                  pageSize={10}
                  onChange={setPage}
                  size="small"
                  showSizeChanger={false}
                />
              </div>
            </div>
          ) : (
            <Empty description="暂无题目" style={{ marginTop: 40 }} />
          )}
        </Card>

        {/* 右侧：题目详情 */}
        <Card 
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          bodyStyle={{ flex: 1, overflow: 'auto' }}
          title="题目详情"
          extra={
            questionDetail && (
              <Space>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/test-center/questions/${questionDetail.id}/edit`)}
                >
                  编辑
                </Button>
                <Button
                  type={selectedRowKeys.includes(questionDetail.id) ? 'default' : 'primary'}
                  icon={<CheckCircleOutlined />}
                  onClick={handleAddFromDetail}
                >
                  {selectedRowKeys.includes(questionDetail.id) ? '取消选择' : '加入组卷'}
                </Button>
              </Space>
            )
          }
        >
          {detailLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
            </div>
          ) : questionDetail ? (
            <div>
              {/* 1. 题干 */}
              <div style={{ marginBottom: 24 }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>题干</Text>
                <Paragraph style={{ fontSize: 15 }}>
                  {questionDetail.content}
                </Paragraph>
              </div>

              {/* 2. 选项 */}
              {questionDetail.options && questionDetail.options.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>选项</Text>
                  {questionDetail.options.map((option) => {
                    const isCorrect = isCorrectAnswer(option.key, questionDetail.answer);
                    return (
                      <div
                        key={option.key}
                        style={{
                          padding: '8px 12px',
                          marginBottom: 8,
                          borderRadius: 6,
                          border: isCorrect ? '1px solid var(--color-success)' : '1px solid var(--color-border)',
                          background: isCorrect ? 'var(--color-success-bg)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <Text strong style={{ color: isCorrect ? 'var(--color-success)' : undefined }}>
                          {option.key}.
                        </Text>
                        <Text style={{ color: isCorrect ? 'var(--color-success)' : undefined }}>
                          {option.value}
                        </Text>
                        {isCorrect && (
                          <CheckCircleOutlined style={{ color: 'var(--color-success)', marginLeft: 'auto' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 判断题答案 */}
              {questionDetail.question_type === 'TRUE_FALSE' && questionDetail.answer && (
                <div style={{ marginBottom: 24 }}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>答案</Text>
                  <Tag color={questionDetail.answer === 'true' ? 'green' : 'red'}>
                    {questionDetail.answer === 'true' ? '正确' : '错误'}
                  </Tag>
                </div>
              )}

              {/* 简答题答案 */}
              {questionDetail.question_type === 'SHORT_ANSWER' && questionDetail.answer && (
                <div style={{ marginBottom: 24 }}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>参考答案</Text>
                  <Paragraph style={{ 
                    background: 'var(--color-bg-layout)', 
                    padding: 12, 
                    borderRadius: 6 
                  }}>
                    {questionDetail.answer}
                  </Paragraph>
                </div>
              )}

              <Divider />

              {/* 3. 最后更新人和更新时间 */}
              <div style={{ marginBottom: 24 }}>
                <Row gutter={24}>
                  <Col span={12}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>更新人</Text>
                    <Text>{questionDetail.created_by_name || '-'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>更新时间</Text>
                    <Text>{dayjs(questionDetail.updated_at).format('YYYY-MM-DD HH:mm')}</Text>
                  </Col>
                </Row>
              </div>

              {/* 4. 题目解析 */}
              {questionDetail.explanation && (
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>题目解析</Text>
                  <Paragraph style={{ 
                    background: 'var(--color-bg-layout)', 
                    padding: 12, 
                    borderRadius: 6 
                  }}>
                    {questionDetail.explanation}
                  </Paragraph>
                </div>
              )}
            </div>
          ) : (
            <Empty description="请选择一道题目查看详情" style={{ marginTop: 40 }} />
          )}
        </Card>
      </div>

      {/* 底部操作栏 */}
      {selectedRowKeys.length > 0 && (
        <Card bodyStyle={{ padding: '12px 24px' }} style={{ marginTop: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <Text>已选 <Text strong>{selectedRowKeys.length}</Text> 道题目</Text>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button
                  icon={<ClearOutlined />}
                  onClick={handleClearSelection}
                >
                  一键移除
                </Button>
                <Button
                  type="primary"
                  onClick={handleCreateQuiz}
                >
                  立即组卷
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );
};
