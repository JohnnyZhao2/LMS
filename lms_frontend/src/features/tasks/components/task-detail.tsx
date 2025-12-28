import { useMemo, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Typography, Tag, Spin, List, Dropdown, Space, message, Progress, Divider } from 'antd';
import {
  CheckCircleOutlined,
  PlayCircleOutlined,
  BookOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
  ClockCircleOutlined,
  EditOutlined,
  MoreOutlined,
  InfoCircleOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { useTaskDetail, useStudentLearningTaskDetail } from '../api/get-task-detail';
import { useCompleteLearning } from '../api/complete-learning';
import { Card, StatusBadge } from '@/components/ui';
import dayjs from '@/lib/dayjs';
import { useAuth } from '@/features/auth/hooks/use-auth';

const { Title, Text } = Typography;

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
  knowledgeId: number;
  title: string;
  summary?: string;
  knowledgeType: string;
  knowledgeTypeDisplay?: string;
  version?: number;
  isCompleted?: boolean;
  completedAt?: string | null;
}

/**
 * 任务详情组件 - 兼容学员学习视图和管理详情视图
 */
export const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentRole, user } = useAuth();

  const isStudent = currentRole === 'STUDENT';
  const isAdmin = currentRole === 'ADMIN';
  const isMentorOrManager = currentRole === 'MENTOR' || currentRole === 'DEPT_MANAGER' || currentRole === 'TEAM_MANAGER';

  const taskId = Number(id);
  const isValidTaskId = Number.isFinite(taskId) && taskId > 0;

  const {
    data: task,
    isLoading: taskLoading,
    isError: taskError,
  } = useTaskDetail(taskId, { enabled: isValidTaskId });

  const hasKnowledge = (task?.knowledge_items?.length ?? 0) > 0;
  const shouldFetchLearningDetail = isStudent && hasKnowledge;

  const {
    data: learningDetail,
    isLoading: learningLoading,
  } = useStudentLearningTaskDetail(taskId, {
    enabled: Boolean(taskId) && shouldFetchLearningDetail,
  });

  const completeLearning = useCompleteLearning();
  const isLoading = !isValidTaskId || taskLoading || (shouldFetchLearningDetail && learningLoading);

  // 风格配置
  const appearance = useMemo(() => {
    const isExam = !!task?.pass_score || !!task?.start_time;
    if (isExam) {
      return {
        gradient: 'linear-gradient(135deg, #FF3D71 0%, #FF8C52 100%)',
        icon: <TrophyOutlined />,
        themeColor: 'var(--color-error-500)',
        bgSoft: 'var(--color-error-50)',
      };
    }
    return {
      gradient: 'linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-purple-500) 100%)',
      icon: <BookOutlined />,
      themeColor: 'var(--color-primary-500)',
      bgSoft: 'var(--color-primary-50)',
    };
  }, [task]);

  const knowledgeList: KnowledgeListViewItem[] = useMemo(() => {
    if (!task) return [];

    if (isStudent && learningDetail) {
      return learningDetail.knowledge_items.map((item) => ({
        id: item.id,
        knowledgeId: item.knowledge_id,
        title: item.title || '无标题',
        summary: item.summary,
        knowledgeType: item.knowledge_type,
        knowledgeTypeDisplay: item.knowledge_type_display,
        isCompleted: item.is_completed,
        completedAt: item.completed_at,
      }));
    }

    return (task.knowledge_items ?? []).map((item) => ({
      id: item.id,
      knowledgeId: item.knowledge,
      title: item.knowledge_title || '无标题',
      summary: item.summary,
      knowledgeType: item.knowledge_type,
      knowledgeTypeDisplay: item.knowledge_type_display,
      version: item.version_number,
      isCompleted: false,
    }));
  }, [isStudent, learningDetail, task]);

  if (!isValidTaskId) {
    return (
      <Card className="animate-fadeIn" style={{ textAlign: 'center', padding: 'var(--spacing-12)' }}>
        <Text type="secondary">任务 ID 无效</Text>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" tip="加载任务详情..." />
      </div>
    );
  }

  if (taskError || !task) {
    return (
      <Card className="animate-fadeIn" style={{ textAlign: 'center', padding: 'var(--spacing-12)' }}>
        <Text type="secondary">任务不存在或加载失败</Text>
      </Card>
    );
  }

  const isExam = !!task?.pass_score || !!task?.start_time;
  const myAssignment = task.assignments?.find((a) => a.assignee === user?.id);
  const canStartQuiz = !!myAssignment && ['IN_PROGRESS', 'PENDING_EXAM'].includes(myAssignment.status);
  const canEditTask = !isStudent && (isAdmin || isMentorOrManager) && !task.is_closed;

  const handleCompleteLearning = async (knowledgeId: number) => {
    try {
      await completeLearning.mutateAsync({ taskId, knowledgeId });
      message.success('已标记为完成');
    } catch {
      message.error('操作失败，请稍后重试');
    }
  };

  const handleStartQuiz = (quizId: number) => {
    if (!isStudent || !myAssignment || !canStartQuiz) return;
    const basePath = isExam ? '/exam' : '/quiz';
    navigate(`${basePath}/${quizId}?assignment=${myAssignment.id}&task=${taskId}`);
  };

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto' }}>
      {/* 顶部 Header 卡片 */}
      <div
        className="animate-fadeInDown"
        style={{
          borderRadius: 'var(--radius-xl)',
          background: appearance.gradient,
          color: 'var(--color-white)',
          padding: 'var(--spacing-8)',
          marginBottom: 'var(--spacing-6)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundImage: 'radial-gradient(circle at top right, rgba(255,255,255,0.15) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-6)' }}>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
              style={{
                color: 'white',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                backdropFilter: 'blur(4px)'
              }}
            >
              返回
            </Button>

            {canEditTask && (
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
                placement="bottomRight"
              >
                <Button
                  type="text"
                  icon={<MoreOutlined style={{ fontSize: 20, color: 'white' }} />}
                  style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-full)' }}
                />
              </Dropdown>
            )}
          </div>

          <div style={{ display: 'flex', gap: 'var(--spacing-6)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <Space direction="vertical" size="small">
                <Tag color="white" style={{ color: appearance.themeColor, fontWeight: 700, border: 'none' }}>
                  {isExam ? '考试任务' : '学习任务'}
                </Tag>
                <Title level={1} style={{ color: 'white', margin: 0, fontSize: 'var(--font-size-5xl)', letterSpacing: '-0.02em' }}>
                  {task.title}
                </Title>
                {task.description && (
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 'var(--font-size-lg)', display: 'block', maxWidth: 600 }}>
                    {task.description}
                  </Text>
                )}
              </Space>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--spacing-4) var(--spacing-6)',
              display: 'flex',
              gap: 'var(--spacing-8)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'var(--font-size-xs)', marginBottom: 4 }}>发布人</div>
                <div style={{ fontWeight: 600 }}>{task.created_by_name}</div>
              </div>
              <Divider type="vertical" style={{ height: 40, borderColor: 'rgba(255,255,255,0.2)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'var(--font-size-xs)', marginBottom: 4 }}>截止日期</div>
                <div style={{ fontWeight: 600 }}>{dayjs(task.deadline).format('MM月DD日 HH:mm')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isStudent ? '1fr 320px' : '1fr', gap: 'var(--spacing-6)' }}>
        <div style={{ display: 'flex', direction: 'vertical' as any, flexWrap: 'nowrap', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
          {/* 知识列表 */}
          {hasKnowledge && (
            <Card title={<Space><BookOutlined /> 学习章节</Space>} className="animate-fadeInUp stagger-1">
              <List
                dataSource={knowledgeList}
                renderItem={(item, index) => (
                  <List.Item
                    key={item.id}
                    className="stagger-item animate-fadeInUp"
                    style={{
                      padding: 'var(--spacing-4)',
                      background: 'var(--color-gray-50)',
                      borderRadius: 'var(--radius-lg)',
                      marginBottom: 'var(--spacing-3)',
                      border: 'none',
                      animationDelay: `${0.1 + index * 0.05}s`,
                      opacity: 1 // Override stagger-item initial opacity for direct visibility or use class
                    }}
                    actions={[
                      isStudent && (item.isCompleted ? (
                        <Tag color="success" icon={<CheckCircleOutlined />}>已掌握</Tag>
                      ) : (
                        <Button
                          type="primary"
                          size="small"
                          ghost
                          loading={completeLearning.isPending}
                          onClick={() => handleCompleteLearning(item.knowledgeId)}
                        >
                          标记掌握
                        </Button>
                      ))
                    ].filter(Boolean) as ReactNode[]}
                  >
                    <List.Item.Meta
                      avatar={
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%',
                          background: item.isCompleted ? 'var(--color-success-50)' : 'var(--color-primary-50)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: item.isCompleted ? 'var(--color-success-500)' : 'var(--color-primary-500)'
                        }}>
                          {index + 1}
                        </div>
                      }
                      title={<Text strong>{item.title}</Text>}
                      description={
                        <Space split={<Divider type="vertical" />}>
                          <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
                            {item.knowledgeTypeDisplay || item.knowledgeType}
                          </Text>
                          {item.summary && <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>{item.summary}</Text>}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          )}

          {/* 试卷列表 */}
          {task.quizzes.length > 0 && (
            <Card title={<Space><FileTextOutlined /> 考察评估</Space>} className="animate-fadeInUp stagger-2">
              <List
                dataSource={task.quizzes}
                renderItem={(item) => (
                  <List.Item
                    key={item.id}
                    style={{
                      padding: 'var(--spacing-5)',
                      background: 'var(--color-gray-50)',
                      borderRadius: 'var(--radius-lg)',
                      marginBottom: 'var(--spacing-3)',
                      border: 'none',
                    }}
                    actions={[
                      isStudent && (
                        <Button
                          type="primary"
                          icon={<PlayCircleOutlined />}
                          disabled={!canStartQuiz}
                          onClick={() => handleStartQuiz(item.quiz)}
                        >
                          开始考评
                        </Button>
                      )
                    ].filter(Boolean) as ReactNode[]}
                  >
                    <List.Item.Meta
                      title={<Title level={5} style={{ margin: 0 }}>{item.quiz_title}</Title>}
                      description={
                        <Space direction="vertical" size={2} style={{ marginTop: 8 }}>
                          <Space size="middle" style={{ color: 'var(--color-gray-600)', fontSize: 'var(--font-size-sm)' }}>
                            <span><InfoCircleOutlined /> 题量：{item.question_count}</span>
                            <span><TrophyOutlined /> 总分：{item.total_score}分</span>
                          </Space>
                          {isExam && task.duration && (
                            <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
                              <ClockCircleOutlined /> 考试限时：{task.duration} 分钟
                            </Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          )}
        </div>

        {/* 学员侧边栏 - 进度与状态 */}
        {isStudent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
            <Card className="animate-slideInRight stagger-1">
              <Title level={5} style={{ marginBottom: 'var(--spacing-4)' }}>任务进度</Title>
              {learningDetail ? (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-2) 0' }}>
                  <Progress
                    type="dashboard"
                    percent={learningDetail.progress.percentage}
                    strokeColor={appearance.gradient}
                    size={160}
                    format={(percent) => (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>{percent}%</span>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', fontWeight: 400 }}>已学习</span>
                      </div>
                    )}
                  />
                  <div style={{ marginTop: 'var(--spacing-4)', display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">完成章节</Text>
                    <Text strong>{learningDetail.progress.completed} / {learningDetail.progress.total}</Text>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-4)' }}>
                  <Text type="secondary">暂无详细进度数据</Text>
                </div>
              )}
            </Card>

            <Card className="animate-slideInRight stagger-2">
              <Title level={5} style={{ marginBottom: 'var(--spacing-4)' }}>分配状态</Title>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-4)' }}>
                <Text type="secondary">当前状态</Text>
                {myAssignment && (
                  <StatusBadge
                    status={assignmentStatusMap[myAssignment.status] || 'default'}
                    text={assignmentStatusLabelMap[myAssignment.status] || myAssignment.status}
                  />
                )}
              </div>

              {isExam && task.pass_score && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text type="secondary">合格分数</Text>
                  <Text strong style={{ color: 'var(--color-error-500)' }}>{task.pass_score}分</Text>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

