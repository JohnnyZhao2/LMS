import { Row, Col, Typography, Empty, Skeleton, Progress } from 'antd';
import {
  BookOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  RocketOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { useStudentDashboard } from '../api/student-dashboard';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import dayjs from '@/lib/dayjs';
import { Card, StatusBadge, StaggeredList } from '@/components/ui';
import { useAuth } from '@/features/auth/hooks/use-auth';

const { Text, Title, Paragraph } = Typography;

/**
 * 任务类型配色
 */
const taskConfig = {
  color: 'var(--color-primary-500)',
  bg: 'var(--color-primary-50)',
  icon: <FileTextOutlined />,
  label: '任务',
};

/**
 * 学员仪表盘组件
 */
export const StudentDashboard: React.FC = () => {
  const { data, isLoading } = useStudentDashboard();
  const navigate = useNavigate();
  const { user } = useAuth();

  // 获取问候语
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  return (
    <div>
      {/* Hero 欢迎区 */}
      <div
        className="animate-fadeInDown"
        style={{
          marginBottom: 'var(--spacing-8)',
          padding: 'var(--spacing-8)',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-purple-500) 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 装饰背景 */}
        <div
          style={{
            position: 'absolute',
            right: -50,
            top: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 50,
            bottom: -30,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-2)' }}>
            <RocketOutlined style={{ fontSize: 24, color: 'rgba(255, 255, 255, 0.9)' }} />
            <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 'var(--font-size-base)' }}>
              {getGreeting()}
            </Text>
          </div>
          <Title
            level={2}
            style={{
              margin: 0,
              marginBottom: 'var(--spacing-2)',
              color: 'white',
              fontSize: 'var(--font-size-4xl)',
              fontWeight: 700,
            }}
          >
            {user?.username || '学员'}，继续加油！
          </Title>
          <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 'var(--font-size-base)' }}>
            今天是学习的好日子，让我们一起进步吧
          </Text>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {/* 待办任务 */}
        <Col xs={24} lg={14}>
          <Card hoverable style={{ height: '100%' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--spacing-5)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-primary-50)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary-500)',
                    fontSize: 18,
                  }}
                >
                  <FileTextOutlined />
                </div>
                <div>
                  <Text strong style={{ fontSize: 'var(--font-size-lg)' }}>
                    待办任务
                  </Text>
                  {data?.pending_tasks && (
                    <Text type="secondary" style={{ marginLeft: 'var(--spacing-2)', fontSize: 'var(--font-size-sm)' }}>
                      {data.pending_tasks.length} 项待完成
                    </Text>
                  )}
                </div>
              </div>
            </div>

            {isLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : data?.pending_tasks && data.pending_tasks.length > 0 ? (
              <StaggeredList staggerDelay={60} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                {data.pending_tasks.map((task) => {
                  const typeConfig = taskConfig;
                  const isUrgent = dayjs(task.deadline).diff(dayjs(), 'day') <= 1;

                  return (
                    <div
                      key={task.id}
                      onClick={() => navigate(`${ROUTES.TASKS}/${task.task_id}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-4)',
                        padding: 'var(--spacing-4)',
                        borderRadius: 'var(--radius-lg)',
                        background: 'var(--color-gray-50)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                        borderLeft: `4px solid ${typeConfig.color}`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--color-gray-100)';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--color-gray-50)';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 'var(--radius-md)',
                          background: typeConfig.bg,
                          color: typeConfig.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                          flexShrink: 0,
                        }}
                      >
                        {typeConfig.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 4 }}>
                          <Text strong ellipsis style={{ flex: 1 }}>
                            {task.task_title}
                          </Text>
                          <StatusBadge
                            status={'processing'}
                            text={'进行中'}
                            size="small"
                            showIcon={false}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                          <ClockCircleOutlined style={{ fontSize: 12, color: isUrgent ? 'var(--color-error-500)' : 'var(--color-gray-400)' }} />
                          <Text
                            type="secondary"
                            style={{
                              fontSize: 'var(--font-size-sm)',
                              color: isUrgent ? 'var(--color-error-500)' : undefined,
                            }}
                          >
                            截止: {dayjs(task.deadline).format('MM-DD HH:mm')}
                          </Text>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </StaggeredList>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div style={{ textAlign: 'center' }}>
                    <TrophyOutlined style={{ fontSize: 32, color: 'var(--color-success-500)', marginBottom: 'var(--spacing-2)' }} />
                    <div>
                      <Text type="secondary">太棒了！暂无待办任务</Text>
                    </div>
                  </div>
                }
              />
            )}
          </Card>
        </Col>

        {/* 最新知识 */}
        <Col xs={24} lg={10}>
          <Card hoverable style={{ height: '100%' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-3)',
                marginBottom: 'var(--spacing-5)',
              }}
            >
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
                最新知识
              </Text>
            </div>

            {isLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : data?.latest_knowledge && data.latest_knowledge.length > 0 ? (
              <StaggeredList staggerDelay={60} initialDelay={100} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                {data.latest_knowledge.map((knowledge) => (
                  <div
                    key={knowledge.id}
                    onClick={() => navigate(`${ROUTES.KNOWLEDGE}/${knowledge.id}`)}
                    style={{
                      padding: 'var(--spacing-4)',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--color-gray-50)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-gray-100)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--color-gray-50)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <Text strong ellipsis style={{ display: 'block', marginBottom: 4 }}>
                      {knowledge.title}
                    </Text>
                    <Paragraph
                      type="secondary"
                      ellipsis={{ rows: 2 }}
                      style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-2)' }}
                    >
                      {knowledge.summary}
                    </Paragraph>
                    <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
                      {dayjs(knowledge.updated_at).format('YYYY-MM-DD')}
                    </Text>
                  </div>
                ))}
              </StaggeredList>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无最新知识" />
            )}
          </Card>
        </Col>
      </Row>

      {/* 学习进度概览 - 占位 */}
      <Row gutter={[24, 24]} style={{ marginTop: 'var(--spacing-6)' }}>
        <Col xs={24}>
          <Card hoverable>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-5)' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-lg)',
                  background: 'linear-gradient(135deg, var(--color-purple-500) 0%, var(--color-pink-500) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 18,
                }}
              >
                <TrophyOutlined />
              </div>
              <Text strong style={{ fontSize: 'var(--font-size-lg)' }}>
                学习进度
              </Text>
            </div>

            <Row gutter={[24, 16]}>
              <Col xs={24} sm={8}>
                <div style={{ textAlign: 'center' }}>
                  <Progress
                    type="dashboard"
                    percent={75}
                    strokeColor={{
                      '0%': 'var(--color-primary-500)',
                      '100%': 'var(--color-purple-500)',
                    }}
                    size={120}
                  />
                  <div style={{ marginTop: 'var(--spacing-2)' }}>
                    <Text type="secondary">本月完成率</Text>
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ textAlign: 'center' }}>
                  <Progress
                    type="dashboard"
                    percent={88}
                    strokeColor={{
                      '0%': 'var(--color-success-500)',
                      '100%': 'var(--color-cyan-500)',
                    }}
                    size={120}
                  />
                  <div style={{ marginTop: 'var(--spacing-2)' }}>
                    <Text type="secondary">平均得分</Text>
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ textAlign: 'center' }}>
                  <Progress
                    type="dashboard"
                    percent={60}
                    strokeColor={{
                      '0%': 'var(--color-orange-500)',
                      '100%': 'var(--color-error-500)',
                    }}
                    size={120}
                  />
                  <div style={{ marginTop: 'var(--spacing-2)' }}>
                    <Text type="secondary">知识覆盖</Text>
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
