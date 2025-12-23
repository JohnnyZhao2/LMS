import { useMemo, useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Typography, Tag, Spin, List, Descriptions, message, Modal, Space, Divider, Dropdown } from 'antd';
import {
  CheckCircleOutlined,
  PlayCircleOutlined,
  BookOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  EditOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { useTaskDetail, useStudentLearningTaskDetail } from '../api/get-task-detail';
import { useCompleteLearning } from '../api/complete-learning';
import { Card, StatusBadge } from '@/components/ui';
import type { KnowledgeSnapshot, QuizSnapshot } from '@/types/api';
import dayjs from '@/lib/dayjs';
import { useAuth } from '@/features/auth/hooks/use-auth';

const { Title, Text } = Typography;

/**
 * 任务类型配置
 */
const taskTypeConfig = {
  LEARNING: {
    color: 'var(--color-success-500)',
    bg: 'var(--color-success-50)',
    gradient: 'linear-gradient(135deg, var(--color-success-500) 0%, var(--color-cyan-500) 100%)',
  },
  PRACTICE: {
    color: 'var(--color-primary-500)',
    bg: 'var(--color-primary-50)',
    gradient: 'linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-purple-500) 100%)',
  },
  EXAM: {
    color: 'var(--color-error-500)',
    bg: 'var(--color-error-50)',
    gradient: 'linear-gradient(135deg, var(--color-error-500) 0%, var(--color-pink-500) 100%)',
  },
};

const assignmentStatusMap: Record<string, 'default' | 'success' | 'warning' | 'error' | 'processing'> = {
  IN_PROGRESS: 'processing',
  PENDING_EXAM: 'warning',
  COMPLETED: 'success',
  OVERDUE: 'error',
};

const assignmentStatusLabelMap: Record<string, string> = {
  IN_PROGRESS: '进行中',
  PENDING_EXAM: '待考试',
  COMPLETED: '已完成',
  OVERDUE: '已逾期',
};
interface KnowledgeListViewItem {
  id: number;
  knowledgeId?: number;
  title?: string;
  summary?: string;
  knowledgeType?: string;
  knowledgeTypeDisplay?: string;
  version?: number;
  snapshot?: KnowledgeSnapshot;
  isCompleted?: boolean;
  completedAt?: string | null;
}

/**
 * 任务详情组件
 */
export const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentRole, user } = useAuth();
  const isStudent = currentRole === 'STUDENT';
  const taskId = Number(id);
  const isValidTaskId = Number.isFinite(taskId) && taskId > 0;
  const {
    data: task,
    isLoading: taskLoading,
    isError: taskError,
  } = useTaskDetail(taskId, { enabled: isValidTaskId });
  const shouldFetchLearningDetail = isStudent && task?.task_type === 'LEARNING';
  const {
    data: learningDetail,
    isLoading: learningLoading,
  } = useStudentLearningTaskDetail(taskId, {
    enabled: Boolean(taskId) && shouldFetchLearningDetail,
  });
  const completeLearning = useCompleteLearning();
  const [previewKnowledge, setPreviewKnowledge] = useState<KnowledgeSnapshot | null>(null);
  const [previewQuiz, setPreviewQuiz] = useState<QuizSnapshot | null>(null);
  const isLoading = !isValidTaskId || taskLoading || (shouldFetchLearningDetail && learningLoading);

  const knowledgeSnapshotMap = useMemo(() => {
    const map = new Map<number, KnowledgeSnapshot>();
    task?.knowledge_items?.forEach((item) => {
      const snapshotId = item.snapshot?.id ?? item.knowledge;
      if (snapshotId) {
        map.set(snapshotId, item.snapshot);
      }
    });
    return map;
  }, [task]);

  const knowledgeVersionMap = useMemo(() => {
    const map = new Map<number, number>();
    task?.knowledge_items?.forEach((item) => {
      const snapshotId = item.snapshot?.id ?? item.knowledge;
      if (snapshotId) {
        map.set(snapshotId, item.version_number);
      }
    });
    return map;
  }, [task]);

  const knowledgeList: KnowledgeListViewItem[] = useMemo(() => {
    if (!task || task.task_type !== 'LEARNING') {
      return [];
    }
    if (isStudent && learningDetail) {
      return learningDetail.knowledge_items.map((item) => {
        const snapshot = item.knowledge_id ? knowledgeSnapshotMap.get(item.knowledge_id) : undefined;
        const version = item.knowledge_id ? knowledgeVersionMap.get(item.knowledge_id) : undefined;
        return {
          id: item.id,
          knowledgeId: item.knowledge_id,
          title: snapshot?.title || item.title,
          summary: snapshot?.summary,
          knowledgeType: item.knowledge_type,
          knowledgeTypeDisplay: snapshot?.knowledge_type_display ?? item.knowledge_type_display,
          version,
          snapshot,
          isCompleted: item.is_completed,
          completedAt: item.completed_at,
        };
      });
    }
    return (task.knowledge_items ?? []).map((item) => ({
      id: item.id,
      knowledgeId: item.snapshot?.id ?? item.knowledge,
      title: item.snapshot?.title || item.knowledge_title,
      summary: item.snapshot?.summary,
      knowledgeType: item.snapshot?.knowledge_type ?? item.knowledge_type,
      knowledgeTypeDisplay: item.snapshot?.knowledge_type_display ?? item.knowledge_type,
      version: item.version_number,
      snapshot: item.snapshot,
      isCompleted: false,
      completedAt: undefined,
    }));
  }, [isStudent, knowledgeSnapshotMap, knowledgeVersionMap, learningDetail, task]);

  if (!isValidTaskId) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-12)' }}>
        <Text type="secondary">任务 ID 无效</Text>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (taskError || !task) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-12)' }}>
        <Text type="secondary">任务不存在</Text>
      </div>
    );
  }

  const typeConfig = taskTypeConfig[task.task_type as keyof typeof taskTypeConfig] || taskTypeConfig.LEARNING;

  const myAssignment = task.assignments?.find((assignment) => assignment.assignee === user?.id);
  const canStartQuiz =
    !!myAssignment && ['IN_PROGRESS', 'PENDING_EXAM'].includes(myAssignment.status);
  const assignmentStatusLabel =
    myAssignment && assignmentStatusLabelMap[myAssignment.status]
      ? assignmentStatusLabelMap[myAssignment.status]
      : myAssignment?.status;

  // 检查是否有编辑权限（管理员或创建者，且任务未关闭）
  // 注意：TaskDetail 中没有 created_by 字段，需要通过其他方式判断
  // 这里假设只有管理员、导师和室经理可以编辑，且任务未关闭
  const isAdmin = currentRole === 'ADMIN';
  const isMentorOrManager = currentRole === 'MENTOR' || currentRole === 'DEPT_MANAGER';
  const canEditTask = !isStudent && (isAdmin || isMentorOrManager) && !task.is_closed;

  const handleCompleteLearning = async (knowledgeId?: number) => {
    if (!knowledgeId) {
      message.warning('无法获取知识文档信息');
      return;
    }
    try {
      await completeLearning.mutateAsync({ taskId, knowledgeId });
      message.success('已标记为完成');
    } catch {
      message.error('操作失败，请稍后重试');
    }
  };

  const handleStartQuiz = (quizId: number) => {
    if (!isStudent) {
      return;
    }
    if (!myAssignment) {
      message.warning('您尚未被分配该任务');
      return;
    }
    if (!canStartQuiz) {
      message.warning('当前任务状态不可操作');
      return;
    }
    const basePath = task.task_type === 'EXAM' ? '/exam' : '/quiz';
    navigate(`${basePath}/${quizId}?assignment=${myAssignment.id}&task=${taskId}`);
  };

  const renderTagList = (tags?: KnowledgeSnapshot['system_tags']) => {
    if (!tags || tags.length === 0) {
      return '—';
    }
    return (
      <Space size={[4, 8]} wrap>
        {tags.map((tag) => (
          <Tag key={`${tag.id ?? tag.name}`} style={{ margin: 0, borderRadius: 'var(--radius-sm)' }}>
            {tag.name}
          </Tag>
        ))}
      </Space>
    );
  };

  const renderStructuredSection = (label: string, value?: string) => {
    if (!value) return null;
    return (
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <Text strong style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>{label}</Text>
        <div
          style={{
            whiteSpace: 'pre-wrap',
            padding: 'var(--spacing-4)',
            background: 'var(--color-gray-50)',
            borderRadius: 'var(--radius-lg)',
            lineHeight: 1.6,
          }}
        >
          {value}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fadeIn">
      {/* 返回按钮 */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ color: 'var(--color-gray-600)', fontWeight: 500 }}
        >
          返回列表
        </Button>
      </div>

      {/* 任务信息卡片 */}
      <Card style={{ marginBottom: 'var(--spacing-6)', position: 'relative' }}>
        {/* 编辑按钮 - 仅在有权限时显示 */}
        {canEditTask && (
          <div
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 10,
            }}
          >
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'edit',
                    label: '编辑任务',
                    icon: <EditOutlined />,
                    onClick: () => navigate(`/tasks/${taskId}/edit`),
                  },
                ],
              }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button
                type="text"
                icon={<MoreOutlined />}
                size="small"
                style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  background: 'white',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                }}
              />
            </Dropdown>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-5)' }}>
          {/* 类型图标 */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 'var(--radius-xl)',
              background: typeConfig.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 24,
              boxShadow: `0 4px 14px ${typeConfig.color}40`,
              flexShrink: 0,
            }}
          >
            {task.task_type === 'LEARNING' ? <BookOutlined /> : <FileTextOutlined />}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-2)', flexWrap: 'wrap' }}>
              <StatusBadge
                status={task.task_type === 'EXAM' ? 'error' : task.task_type === 'PRACTICE' ? 'info' : 'success'}
                text={task.task_type_display}
              />
              {task.is_closed && (
                <Tag color="default" icon={<CheckCircleOutlined />}>
                  已关闭
                </Tag>
              )}
            </div>
            
            <Title level={3} style={{ margin: 0, marginBottom: 'var(--spacing-3)' }}>
              {task.title}
            </Title>

            {task.description && (
              <Text type="secondary" style={{ display: 'block', marginBottom: 'var(--spacing-4)' }}>
                {task.description}
              </Text>
            )}

            {/* 元信息 */}
            <div
              style={{
                display: 'flex',
                gap: 'var(--spacing-6)',
                flexWrap: 'wrap',
                padding: 'var(--spacing-4)',
                background: 'var(--color-gray-50)',
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', color: 'var(--color-gray-600)' }}>
                <UserOutlined />
                <span>创建人：{task.created_by_name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', color: 'var(--color-gray-600)' }}>
                <CalendarOutlined />
                <span>截止时间：{dayjs(task.deadline).format('YYYY-MM-DD HH:mm')}</span>
              </div>
              {task.task_type === 'EXAM' && task.start_time && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', color: 'var(--color-gray-600)' }}>
                    <ClockCircleOutlined />
                    <span>考试开始：{dayjs(task.start_time).format('YYYY-MM-DD HH:mm')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', color: 'var(--color-gray-600)' }}>
                    <ClockCircleOutlined />
                    <span>考试时长：{task.duration} 分钟</span>
                  </div>
                </>
              )}
            </div>
            {shouldFetchLearningDetail && learningDetail && (
              <div
                style={{
                  marginTop: 'var(--spacing-4)',
                  padding: 'var(--spacing-4)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-white)',
                  boxShadow: 'var(--shadow-xs)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 'var(--spacing-3)',
                }}
              >
                <div>
                  <Text type="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                    学习进度
                  </Text>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>
                    {learningDetail.progress.completed}/{learningDetail.progress.total}（
                    {learningDetail.progress.percentage}%）
                  </div>
                </div>
                {assignmentStatusLabel && myAssignment && (
                  <StatusBadge
                    status={assignmentStatusMap[myAssignment.status] ?? 'default'}
                    text={`当前状态：${assignmentStatusLabel}`}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 学习任务 - 知识列表 */}
      {task.task_type === 'LEARNING' && knowledgeList.length > 0 && (
        <Card style={{ marginBottom: 'var(--spacing-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-5)' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-lg)',
                background: 'var(--color-success-50)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-success-500)',
                fontSize: 18,
              }}
            >
              <BookOutlined />
            </div>
            <Text strong style={{ fontSize: 'var(--font-size-lg)' }}>
              学习内容
            </Text>
          </div>

          <List
            dataSource={knowledgeList}
            renderItem={(item) => {
              const actions: ReactNode[] = [];
              if (item.snapshot) {
                actions.push(
                  <Button
                    key="preview"
                    type="link"
                    icon={<BookOutlined />}
                    onClick={() => setPreviewKnowledge(item.snapshot ?? null)}
                  >
                    查看快照
                  </Button>
                );
              }
              if (shouldFetchLearningDetail && isStudent) {
                if (item.isCompleted) {
                  actions.push(
                    <Tag key="completed" color="success" style={{ borderRadius: 'var(--radius-sm)' }}>
                      已完成
                    </Tag>
                  );
                } else {
                  actions.push(
                    <Button
                      key="complete"
                      type="primary"
                      size="small"
                      icon={<CheckCircleOutlined />}
                      loading={completeLearning.isPending}
                      onClick={() => handleCompleteLearning(item.knowledgeId)}
                    >
                      我已学习掌握
                    </Button>
                  );
                }
              }

              return (
                <List.Item
                  key={item.id}
                  style={{
                    padding: 'var(--spacing-4)',
                    background: 'var(--color-gray-50)',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: 'var(--spacing-3)',
                    border: 'none',
                  }}
                  actions={actions}
                >
                  <List.Item.Meta
                    title={
                      <Space size={8}>
                        <Text strong>{item.title}</Text>
                        {item.version && (
                          <Tag color="geekblue" style={{ borderRadius: 'var(--radius-sm)' }}>
                            V{item.version}
                          </Tag>
                        )}
                      </Space>
                    }
                    description={
                      <Text type="secondary">
                        {item.knowledgeTypeDisplay ?? item.knowledgeType}
                        {item.summary ? ` · ${item.summary}` : ''}
                      </Text>
                    }
                  />
                  {item.isCompleted && item.completedAt && (
                    <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
                      完成于 {dayjs(item.completedAt).format('YYYY-MM-DD HH:mm')}
                    </Text>
                  )}
                </List.Item>
              );
            }}
          />
        </Card>
      )}

      {/* 练习/考试任务 - 试卷列表 */}
      {(task.task_type === 'PRACTICE' || task.task_type === 'EXAM') && task.quizzes.length > 0 && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-5)' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-lg)',
                background: task.task_type === 'EXAM' ? 'var(--color-error-50)' : 'var(--color-primary-50)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: task.task_type === 'EXAM' ? 'var(--color-error-500)' : 'var(--color-primary-500)',
                fontSize: 18,
              }}
            >
              <FileTextOutlined />
            </div>
            <Text strong style={{ fontSize: 'var(--font-size-lg)' }}>
              {task.task_type === 'EXAM' ? '考试试卷' : '练习试卷'}
            </Text>
          </div>

          <List
            dataSource={task.quizzes}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                style={{
                  padding: 'var(--spacing-4)',
                  background: 'var(--color-gray-50)',
                  borderRadius: 'var(--radius-lg)',
                  marginBottom: 'var(--spacing-3)',
                  border: 'none',
                }}
                actions={[
                  <Space size={8}>
                    {isStudent && (
                      <Button
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        onClick={() => handleStartQuiz(item.quiz)}
                        style={{ fontWeight: 600 }}
                        disabled={!canStartQuiz}
                      >
                        {task.task_type === 'EXAM' ? '开始考试' : '开始练习'}
                      </Button>
                    )}
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
                  avatar={
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 'var(--radius-lg)',
                        background: typeConfig.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: 20,
                      }}
                    >
                      <FileTextOutlined />
                    </div>
                  }
                  title={
                    <Space size={8}>
                      <Text strong>{item.snapshot.title || item.quiz_title}</Text>
                      <Tag color="geekblue" style={{ borderRadius: 'var(--radius-sm)' }}>
                        V{item.version_number}
                      </Tag>
                    </Space>
                  }
                  description={
                    <div style={{ color: 'var(--color-gray-600)' }}>
                      <div>题目数：{item.snapshot.question_count} · 总分 {item.snapshot.total_score}</div>
                      <div>主观题：{item.snapshot.subjective_question_count} · 客观题：{item.snapshot.objective_question_count}</div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* 知识快照预览弹窗 */}
      <Modal
        open={!!previewKnowledge}
        width={800}
        onCancel={() => setPreviewKnowledge(null)}
        footer={null}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
            <BookOutlined style={{ color: 'var(--color-primary-500)' }} />
            <span>知识快照 · V{previewKnowledge?.version_number}</span>
          </div>
        }
      >
        {previewKnowledge && (
          <>
            <Descriptions column={2} size="small" style={{ marginBottom: 'var(--spacing-4)' }}>
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

      {/* 试卷快照预览弹窗 */}
      <Modal
        open={!!previewQuiz}
        width={840}
        onCancel={() => setPreviewQuiz(null)}
        footer={null}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
            <FileTextOutlined style={{ color: 'var(--color-primary-500)' }} />
            <span>试卷快照 · V{previewQuiz?.version_number}</span>
          </div>
        }
      >
        {previewQuiz && (
          <>
            <Descriptions column={2} size="small" style={{ marginBottom: 'var(--spacing-4)' }}>
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
                style={{ maxHeight: 320, overflowY: 'auto' }}
                renderItem={(question) => (
                  <List.Item
                    key={`${question.id}-${question.order}`}
                    style={{
                      padding: 'var(--spacing-3)',
                      background: 'var(--color-gray-50)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: 'var(--spacing-2)',
                      border: 'none',
                    }}
                  >
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
