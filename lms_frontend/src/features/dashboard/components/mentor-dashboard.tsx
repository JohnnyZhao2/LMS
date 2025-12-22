import { Row, Col, Typography, Button, Skeleton } from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  EditOutlined,
  FileSearchOutlined,
  PlusOutlined,
  SendOutlined,
  TrophyOutlined,
  TeamOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useMentorDashboard } from '../api/mentor-dashboard';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { Card, PageHeader, StaggeredList } from '@/components/ui';
import { useAuth } from '@/features/auth/hooks/use-auth';

const { Text, Title } = Typography;

/**
 * 统计卡片配置
 */
const statCards = [
  {
    key: 'mentees',
    title: '学员数量',
    icon: <TeamOutlined />,
    color: 'var(--color-primary-500)',
    bg: 'var(--color-primary-50)',
    getValue: (data: Record<string, unknown>) => data?.mentees_count || 0,
    suffix: '人',
  },
  {
    key: 'completion',
    title: '任务完成率',
    icon: <CheckCircleOutlined />,
    color: 'var(--color-success-500)',
    bg: 'var(--color-success-50)',
    getValue: (data: Record<string, unknown>) => data?.completion_rate || '0%',
    suffix: '',
  },
  {
    key: 'score',
    title: '平均分',
    icon: <TrophyOutlined />,
    color: 'var(--color-purple-500)',
    bg: 'rgba(155, 0, 255, 0.1)',
    getValue: (data: Record<string, unknown>) => data?.average_score || '0',
    suffix: '分',
  },
  {
    key: 'grading',
    title: '待评分',
    icon: <EditOutlined />,
    color: 'var(--color-orange-500)',
    bg: 'rgba(255, 140, 82, 0.1)',
    getValue: (data: Record<string, unknown>) => data?.pending_grading_count || 0,
    suffix: '份',
  },
];

/**
 * 快捷操作配置
 */
const quickActions = [
  {
    key: 'spot-check',
    title: '发起抽查',
    description: '对学员进行知识抽查',
    icon: <FileSearchOutlined />,
    color: 'var(--color-error-500)',
    bg: 'linear-gradient(135deg, var(--color-error-500) 0%, var(--color-pink-500) 100%)',
    route: ROUTES.SPOT_CHECKS,
  },
  {
    key: 'task',
    title: '发布任务',
    description: '创建学习/练习/考试任务',
    icon: <SendOutlined />,
    color: 'var(--color-primary-500)',
    bg: 'linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-purple-500) 100%)',
    route: `${ROUTES.TASKS}/create`,
  },
  {
    key: 'quiz',
    title: '新建试卷',
    description: '创建新的考试或练习试卷',
    icon: <PlusOutlined />,
    color: 'var(--color-success-500)',
    bg: 'linear-gradient(135deg, var(--color-success-500) 0%, var(--color-cyan-500) 100%)',
    route: ROUTES.TEST_CENTER,
  },
  {
    key: 'grading',
    title: '批改作业',
    description: '查看待批改的答卷',
    icon: <EditOutlined />,
    color: 'var(--color-orange-500)',
    bg: 'linear-gradient(135deg, var(--color-orange-500) 0%, var(--color-warning-500) 100%)',
    route: ROUTES.GRADING,
  },
];

/**
 * 导师/室经理仪表盘组件
 */
export const MentorDashboard: React.FC = () => {
  const { data, isLoading } = useMentorDashboard();
  const navigate = useNavigate();
  const { user, availableRoles, currentRole } = useAuth();

  const roleName = availableRoles.find((r) => r.code === currentRole)?.name || '导师';

  return (
    <div>
      {/* 欢迎区 */}
      <div
        className="animate-fadeInDown"
        style={{
          marginBottom: 'var(--spacing-8)',
          padding: 'var(--spacing-8)',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, var(--color-gray-800) 0%, var(--color-gray-900) 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 装饰 */}
        <div
          style={{
            position: 'absolute',
            right: -30,
            top: -30,
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: 'rgba(77, 108, 255, 0.2)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 80,
            bottom: -20,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(155, 0, 255, 0.15)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-2)' }}>
            <BarChartOutlined style={{ fontSize: 20, color: 'var(--color-primary-400)' }} />
            <Text style={{ color: 'var(--color-gray-400)', fontSize: 'var(--font-size-sm)' }}>
              {roleName}工作台
            </Text>
          </div>
          <Title
            level={2}
            style={{
              margin: 0,
              marginBottom: 'var(--spacing-1)',
              color: 'white',
              fontSize: 'var(--font-size-3xl)',
              fontWeight: 700,
            }}
          >
            欢迎回来，{user?.username || '老师'}
          </Title>
          <Text style={{ color: 'var(--color-gray-400)' }}>
            今天有 {data?.pending_grading_count || 0} 份答卷等待批改
          </Text>
        </div>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 'var(--spacing-8)' }}>
        {statCards.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={stat.key}>
            <div
              className="animate-fadeInUp"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
            >
              <Card hoverable>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                      {stat.title}
                    </Text>
                    {isLoading ? (
                      <Skeleton.Input active size="small" style={{ marginTop: 8, width: 80 }} />
                    ) : (
                      <div style={{ marginTop: 'var(--spacing-2)' }}>
                        <Text
                          style={{
                            fontSize: 'var(--font-size-4xl)',
                            fontWeight: 700,
                            color: stat.color,
                            lineHeight: 1,
                          }}
                        >
                          {stat.getValue(data as Record<string, unknown>)}
                        </Text>
                        {stat.suffix && (
                          <Text type="secondary" style={{ marginLeft: 4, fontSize: 'var(--font-size-sm)' }}>
                            {stat.suffix}
                          </Text>
                        )}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 'var(--radius-lg)',
                      background: stat.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: stat.color,
                      fontSize: 22,
                    }}
                  >
                    {stat.icon}
                  </div>
                </div>
              </Card>
            </div>
          </Col>
        ))}
      </Row>

      {/* 快捷操作 */}
      <div style={{ marginBottom: 'var(--spacing-6)' }}>
        <Text strong style={{ fontSize: 'var(--font-size-lg)', display: 'block', marginBottom: 'var(--spacing-4)' }}>
          快捷操作
        </Text>
        <Row gutter={[24, 24]}>
          {quickActions.map((action, index) => (
            <Col xs={24} sm={12} lg={6} key={action.key}>
              <div
                className="animate-fadeInUp"
                style={{ animationDelay: `${(index + 4) * 50}ms`, animationFillMode: 'both' }}
              >
                <Card
                  hoverable
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(action.route)}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 'var(--radius-lg)',
                      background: action.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 22,
                      marginBottom: 'var(--spacing-4)',
                      boxShadow: `0 4px 14px ${action.color}40`,
                    }}
                  >
                    {action.icon}
                  </div>
                  <Text strong style={{ display: 'block', marginBottom: 4 }}>
                    {action.title}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                    {action.description}
                  </Text>
                </Card>
              </div>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
};
