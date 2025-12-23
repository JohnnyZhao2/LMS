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
import type { QuestionType } from '@/types/api';
import dayjs from '@/lib/dayjs';
import styles from './question-tab.module.css';

const { Option } = Select;
const { Text, Paragraph } = Typography;

interface QuestionTabProps {
  onQuickCreateQuiz?: (quizId: number, taskType: 'PRACTICE' | 'EXAM') => void;
  search?: string;
}

/**
 * 题型配置
 */
const QUESTION_TYPE_CONFIG: Record<QuestionType, { label: string; color: string }> = {
  SINGLE_CHOICE: { label: '单选', color: 'blue' },
  MULTIPLE_CHOICE: { label: '多选', color: 'green' },
  TRUE_FALSE: { label: '判断', color: 'orange' },
  SHORT_ANSWER: { label: '简答', color: 'purple' },
};

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
    <div className={styles.container}>
      {/* 筛选栏 */}
      <Card className={styles.filterBar}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="small">
              <Text type="secondary" style={{ fontSize: 12 }}>题型</Text>
              <Select
                style={{ width: 100 }}
                placeholder="全部"
                allowClear
                size="small"
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
            <Space size="small">
              <Text type="secondary" style={{ fontSize: 12 }}>条线</Text>
              <Select
                style={{ width: 120 }}
                placeholder="全部"
                allowClear
                size="small"
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
      <div className={styles.splitView}>
        {/* 左侧：题目列表 */}
        <Card 
          className={styles.listCard}
          title="题目列表"
          extra={<Text type="secondary" style={{ fontSize: 11 }}>共 {data?.count || 0} 条</Text>}
        >
          {isLoading ? (
            <div className={styles.loadingState}>
              <Spin size="default" />
            </div>
          ) : data?.results && data.results.length > 0 ? (
            <>
              <div>
                {data.results.map((question) => {
                  const typeConfig = QUESTION_TYPE_CONFIG[question.question_type];
                  return (
                    <div
                      key={question.id}
                      className={`${styles.questionItem} ${selectedQuestionId === question.id ? styles.selected : ''}`}
                      onClick={() => handleQuestionClick(question.id)}
                    >
                      <Checkbox
                        className={styles.questionCheckbox}
                        checked={selectedRowKeys.includes(question.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleSelection(question.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className={styles.questionContent}>
                        <div className={styles.questionMeta}>
                          <Tag className={styles.lineTypeTag}>
                            {question.line_type?.name || '未分类'}
                          </Tag>
                          <Tag color={typeConfig.color} className={styles.typeTag}>
                            {typeConfig.label}
                          </Tag>
                        </div>
                        <Paragraph 
                          ellipsis={{ rows: 2 }} 
                          className={styles.questionText}
                        >
                          {question.content}
                        </Paragraph>
                      </div>
                      <span className={styles.questionDate}>
                        {dayjs(question.updated_at).format('MM-DD')}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className={styles.paginationWrapper}>
                <Pagination
                  current={page}
                  total={data.count || 0}
                  pageSize={10}
                  onChange={setPage}
                  size="small"
                  showSizeChanger={false}
                  showTotal={(total) => `${total} 条`}
                />
              </div>
            </>
          ) : (
            <Empty description="暂无题目" className={styles.emptyState} />
          )}
        </Card>

        {/* 右侧：题目详情 */}
        <Card 
          className={styles.detailCard}
          title="题目详情"
          extra={
            questionDetail && (
              <Space size="small">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/test-center/questions/${questionDetail.id}/edit`)}
                >
                  编辑
                </Button>
                <Button
                  size="small"
                  type={selectedRowKeys.includes(questionDetail.id) ? 'default' : 'primary'}
                  icon={<CheckCircleOutlined />}
                  onClick={handleAddFromDetail}
                >
                  {selectedRowKeys.includes(questionDetail.id) ? '取消' : '组卷'}
                </Button>
              </Space>
            )
          }
        >
          {detailLoading ? (
            <div className={styles.loadingState}>
              <Spin size="default" />
            </div>
          ) : questionDetail ? (
            <div>
              {/* 题干 */}
              <div className={styles.detailSection}>
                <span className={styles.detailLabel}>题干</span>
                <Paragraph className={styles.detailContent}>
                  {questionDetail.content}
                </Paragraph>
              </div>

              {/* 选项 */}
              {questionDetail.options && questionDetail.options.length > 0 && (
                <div className={styles.detailSection}>
                  <span className={styles.detailLabel}>选项</span>
                  {questionDetail.options.map((option) => {
                    const isCorrect = isCorrectAnswer(option.key, questionDetail.answer);
                    return (
                      <div
                        key={option.key}
                        className={`${styles.optionItem} ${isCorrect ? styles.correct : ''}`}
                      >
                        <span className={styles.optionKey}>{option.key}.</span>
                        <span>{option.value}</span>
                        {isCorrect && (
                          <CheckCircleOutlined style={{ color: 'var(--color-success-500)', marginLeft: 'auto' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 判断题答案 */}
              {questionDetail.question_type === 'TRUE_FALSE' && questionDetail.answer && (
                <div className={styles.detailSection}>
                  <span className={styles.detailLabel}>答案</span>
                  <Tag color={questionDetail.answer === 'true' || questionDetail.answer === 'TRUE' ? 'green' : 'red'}>
                    {questionDetail.answer === 'true' || questionDetail.answer === 'TRUE' ? '正确' : '错误'}
                  </Tag>
                </div>
              )}

              {/* 简答题答案 */}
              {questionDetail.question_type === 'SHORT_ANSWER' && questionDetail.answer && (
                <div className={styles.detailSection}>
                  <span className={styles.detailLabel}>参考答案</span>
                  <div style={{ 
                    background: 'var(--color-gray-50)', 
                    padding: 'var(--spacing-3)', 
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-sm)'
                  }}>
                    {questionDetail.answer}
                  </div>
                </div>
              )}

              <Divider style={{ margin: 'var(--spacing-4) 0' }} />

              {/* 元信息 */}
              <div className={styles.detailSection}>
                <Row gutter={16}>
                  <Col span={12}>
                    <span className={styles.detailLabel}>更新人</span>
                    <Text style={{ fontSize: 13 }}>{questionDetail.created_by_name || '-'}</Text>
                  </Col>
                  <Col span={12}>
                    <span className={styles.detailLabel}>更新时间</span>
                    <Text style={{ fontSize: 13 }}>{dayjs(questionDetail.updated_at).format('YYYY-MM-DD HH:mm')}</Text>
                  </Col>
                </Row>
              </div>

              {/* 题目解析 */}
              {questionDetail.explanation && (
                <div className={styles.detailSection}>
                  <span className={styles.detailLabel}>题目解析</span>
                  <div style={{ 
                    background: 'var(--color-gray-50)', 
                    padding: 'var(--spacing-3)', 
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-sm)'
                  }}>
                    {questionDetail.explanation}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Empty description="请选择一道题目查看详情" className={styles.emptyState} />
          )}
        </Card>
      </div>

      {/* 底部操作栏 */}
      {selectedRowKeys.length > 0 && (
        <Card className={styles.actionBar}>
          <Row justify="space-between" align="middle">
            <Col>
              <Text style={{ fontSize: 13 }}>
                已选 <Text strong style={{ color: 'var(--color-primary-500)' }}>{selectedRowKeys.length}</Text> 道题目
              </Text>
            </Col>
            <Col>
              <Space size="small">
                <Button
                  size="small"
                  icon={<ClearOutlined />}
                  onClick={handleClearSelection}
                >
                  清空
                </Button>
                <Button
                  size="small"
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
