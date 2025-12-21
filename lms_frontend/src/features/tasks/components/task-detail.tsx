import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Typography, Tag, Spin, List, Descriptions, message, Modal, Space, Divider } from 'antd';
import { CheckCircleOutlined, PlayCircleOutlined, BookOutlined, FileTextOutlined } from '@ant-design/icons';
import { useStudentTaskDetail } from '../api/get-task-detail';
import { useCompleteLearning } from '../api/complete-learning';
import type { KnowledgeSnapshot, QuizSnapshot } from '@/types/api';
import dayjs from '@/lib/dayjs';

const { Title, Text } = Typography;

/**
 * 任务详情组件
 */
export const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useStudentTaskDetail(Number(id));
  const completeLearning = useCompleteLearning();
  const [previewKnowledge, setPreviewKnowledge] = useState<KnowledgeSnapshot | null>(null);
  const [previewQuiz, setPreviewQuiz] = useState<QuizSnapshot | null>(null);

  if (isLoading) {
    return <Spin />;
  }

  if (!data) {
    return <div>任务不存在</div>;
  }

  const handleCompleteLearning = async () => {
    const assignment = data.assignments.find((a) => a.status === 'IN_PROGRESS');
    if (assignment) {
      try {
        await completeLearning.mutateAsync(assignment.id);
        message.success('学习任务已完成');
      } catch (error) {
        message.error('操作失败');
      }
    }
  };

  const handleStartQuiz = (quizId: number) => {
    const assignment = data.assignments.find((a) => a.status === 'IN_PROGRESS');
    if (assignment) {
      navigate(`/quiz/${quizId}?assignment=${assignment.id}`);
    }
  };

  const renderTagList = (tags?: KnowledgeSnapshot['system_tags']) => {
    if (!tags || tags.length === 0) {
      return '—';
    }
    return (
      <Space size={[4, 8]} wrap>
        {tags.map((tag) => (
          <Tag key={`${tag.id ?? tag.name}`}>{tag.name}</Tag>
        ))}
      </Space>
    );
  };

  const renderStructuredSection = (label: string, value?: string) => {
    if (!value) return null;
    return (
      <div style={{ marginBottom: 12 }}>
        <Text strong>{label}</Text>
        <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{value}</div>
      </div>
    );
  };

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Tag color={data.task_type === 'EXAM' ? 'red' : data.task_type === 'PRACTICE' ? 'blue' : 'green'}>
            {data.task_type_display}
          </Tag>
        </div>
        <Title level={2}>{data.title}</Title>
        <Descriptions column={2}>
          <Descriptions.Item label="创建人">{data.created_by_name}</Descriptions.Item>
          <Descriptions.Item label="截止时间">{dayjs(data.deadline).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          {data.task_type === 'EXAM' && data.start_time && (
            <>
              <Descriptions.Item label="考试开始时间">{dayjs(data.start_time).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="考试时长">{data.duration} 分钟</Descriptions.Item>
            </>
          )}
        </Descriptions>
        {data.description && (
          <Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
            {data.description}
          </Text>
        )}
      </Card>

      {/* 学习任务 - 知识列表 */}
      {data.task_type === 'LEARNING' && data.knowledge_items.length > 0 && (
        <Card title="学习内容" style={{ marginTop: 16 }}>
          <List
            dataSource={data.knowledge_items}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    icon={<BookOutlined />}
                    onClick={() => setPreviewKnowledge(item.snapshot)}
                  >
                    查看快照
                  </Button>,
                ]}
                key={item.id}
              >
                <List.Item.Meta
                  title={
                    <Space size={8}>
                      <span>{item.snapshot.title || item.knowledge_title}</span>
                      <Tag color="geekblue">V{item.version_number}</Tag>
                    </Space>
                  }
                  description={
                    <span style={{ color: 'rgba(0,0,0,0.65)' }}>
                      {item.snapshot.knowledge_type_display ?? item.knowledge_type}
                      {item.snapshot.summary ? ` · ${item.snapshot.summary}` : ''}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleCompleteLearning}
            loading={completeLearning.isPending}
            style={{ marginTop: 16 }}
          >
            我已学习掌握
          </Button>
        </Card>
      )}

      {/* 练习/考试任务 - 试卷列表 */}
      {(data.task_type === 'PRACTICE' || data.task_type === 'EXAM') && data.quizzes.length > 0 && (
        <Card title="试卷" style={{ marginTop: 16 }}>
          <List
            dataSource={data.quizzes}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                actions={[
                  <Space size={8}>
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={() => handleStartQuiz(item.quiz)}
                    >
                      {data.task_type === 'EXAM' ? '开始考试' : '开始练习'}
                    </Button>
                    <Button
                      type="link"
                      icon={<FileTextOutlined />}
                      onClick={() => setPreviewQuiz(item.snapshot)}
                    >
                      查看版本
                    </Button>
                  </Space>,
                ]}
              >
                <List.Item.Meta
                  avatar={<FileTextOutlined style={{ fontSize: 24 }} />}
                  title={
                    <Space size={8}>
                      <span>{item.snapshot.title || item.quiz_title}</span>
                      <Tag color="geekblue">V{item.version_number}</Tag>
                    </Space>
                  }
                  description={
                    <div style={{ color: 'rgba(0,0,0,0.65)' }}>
                      <div>题目数：{item.snapshot.question_count} · 总分 {item.snapshot.total_score}</div>
                      <div>
                        主观题：{item.snapshot.subjective_question_count} · 客观题：{item.snapshot.objective_question_count}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      <Modal
        open={!!previewKnowledge}
        width={800}
        onCancel={() => setPreviewKnowledge(null)}
        footer={null}
        title={previewKnowledge ? `知识快照 · V${previewKnowledge.version_number}` : '知识快照'}
      >
        {previewKnowledge && (
          <>
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="标题">{previewKnowledge.title}</Descriptions.Item>
              <Descriptions.Item label="类型">
                {previewKnowledge.knowledge_type_display ?? previewKnowledge.knowledge_type}
              </Descriptions.Item>
              <Descriptions.Item label="所属条线">
                {previewKnowledge.line_type?.name ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="版本号">V{previewKnowledge.version_number}</Descriptions.Item>
              <Descriptions.Item label="系统标签" span={2}>
                {renderTagList(previewKnowledge.system_tags)}
              </Descriptions.Item>
              <Descriptions.Item label="操作标签" span={2}>
                {renderTagList(previewKnowledge.operation_tags)}
              </Descriptions.Item>
            </Descriptions>
            <Divider />
            {previewKnowledge.knowledge_type === 'EMERGENCY' ? (
              <>
                {renderStructuredSection('故障场景', previewKnowledge.fault_scenario)}
                {renderStructuredSection('触发流程', previewKnowledge.trigger_process)}
                {renderStructuredSection('解决方案', previewKnowledge.solution)}
                {renderStructuredSection('验证方案', previewKnowledge.verification_plan)}
                {renderStructuredSection('恢复方案', previewKnowledge.recovery_plan)}
              </>
            ) : (
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {previewKnowledge.content || '暂无正文'}
              </div>
            )}
          </>
        )}
      </Modal>

      <Modal
        open={!!previewQuiz}
        width={840}
        onCancel={() => setPreviewQuiz(null)}
        footer={null}
        title={previewQuiz ? `试卷快照 · V${previewQuiz.version_number}` : '试卷快照'}
      >
        {previewQuiz && (
          <>
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="标题">{previewQuiz.title}</Descriptions.Item>
              <Descriptions.Item label="总分">{previewQuiz.total_score}</Descriptions.Item>
              <Descriptions.Item label="题目数">{previewQuiz.question_count}</Descriptions.Item>
              <Descriptions.Item label="主观/客观">
                {previewQuiz.subjective_question_count} / {previewQuiz.objective_question_count}
              </Descriptions.Item>
            </Descriptions>
            <Divider />
            {previewQuiz.questions && previewQuiz.questions.length > 0 ? (
              <List
                size="small"
                dataSource={previewQuiz.questions}
                bordered
                style={{ maxHeight: 320, overflowY: 'auto' }}
                renderItem={(question) => (
                  <List.Item key={`${question.id}-${question.order}`}>
                    <List.Item.Meta
                      title={`Q${question.order} · ${question.question_type}`}
                      description={`分值 ${question.score}`}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Text type="secondary">暂无题目快照</Text>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};


