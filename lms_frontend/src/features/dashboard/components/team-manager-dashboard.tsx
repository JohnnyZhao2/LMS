import { Row, Col, Typography, Empty, Progress } from 'antd';
import {
  TeamOutlined,
  BarChartOutlined,
  RiseOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Card } from '@/components/ui';
import { useAuth } from '@/features/auth/hooks/use-auth';

const { Text, Title } = Typography;

/**
 * 团队经理仪表盘组件
 */
export const TeamManagerDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      {/* 欢迎区 */}
      <div
        className="animate-fadeInDown"
        style={{
          marginBottom: 'var(--spacing-8)',
          padding: 'var(--spacing-8)',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, var(--color-success-500) 0%, var(--color-cyan-500) 100%)',
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
            background: 'rgba(255, 255, 255, 0.15)',
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
            background: 'rgba(255, 255, 255, 0.1)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-2)' }}>
            <BarChartOutlined style={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.9)' }} />
            <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 'var(--font-size-sm)' }}>
              团队经理工作台
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
            欢迎回来，{user?.username || '经理'}
          </Title>
          <Text style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
            全面掌握团队学习动态
          </Text>
        </div>
      </div>

      {/* 统计概览 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 'var(--spacing-8)' }}>
        <Col xs={24} sm={12} lg={6}>
          <div className="animate-fadeInUp" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>
            <Card hoverable>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                    团队人数
                  </Text>
                  <div style={{ marginTop: 'var(--spacing-2)' }}>
                    <Text
                      style={{
                        fontSize: 'var(--font-size-4xl)',
                        fontWeight: 700,
                        color: 'var(--color-primary-500)',
                        lineHeight: 1,
                      }}
                    >
                      --
                    </Text>
                    <Text type="secondary" style={{ marginLeft: 4, fontSize: 'var(--font-size-sm)' }}>
                      人
                    </Text>
                  </div>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-primary-50)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary-500)',
                    fontSize: 22,
                  }}
                >
                  <TeamOutlined />
                </div>
              </div>
            </Card>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div className="animate-fadeInUp" style={{ animationDelay: '50ms', animationFillMode: 'both' }}>
            <Card hoverable>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                    平均完成率
                  </Text>
                  <div style={{ marginTop: 'var(--spacing-2)' }}>
                    <Text
                      style={{
                        fontSize: 'var(--font-size-4xl)',
                        fontWeight: 700,
                        color: 'var(--color-success-500)',
                        lineHeight: 1,
                      }}
                    >
                      --%
                    </Text>
                  </div>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-success-50)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-success-500)',
                    fontSize: 22,
                  }}
                >
                  <RiseOutlined />
                </div>
              </div>
            </Card>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div className="animate-fadeInUp" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
            <Card hoverable>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                    平均分数
                  </Text>
                  <div style={{ marginTop: 'var(--spacing-2)' }}>
                    <Text
                      style={{
                        fontSize: 'var(--font-size-4xl)',
                        fontWeight: 700,
                        color: 'var(--color-purple-500)',
                        lineHeight: 1,
                      }}
                    >
                      --
                    </Text>
                    <Text type="secondary" style={{ marginLeft: 4, fontSize: 'var(--font-size-sm)' }}>
                      分
                    </Text>
                  </div>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--radius-lg)',
                    background: 'rgba(155, 0, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-purple-500)',
                    fontSize: 22,
                  }}
                >
                  <TrophyOutlined />
                </div>
              </div>
            </Card>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div className="animate-fadeInUp" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
            <Card hoverable>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                    活跃学员
                  </Text>
                  <div style={{ marginTop: 'var(--spacing-2)' }}>
                    <Text
                      style={{
                        fontSize: 'var(--font-size-4xl)',
                        fontWeight: 700,
                        color: 'var(--color-cyan-500)',
                        lineHeight: 1,
                      }}
                    >
                      --
                    </Text>
                    <Text type="secondary" style={{ marginLeft: 4, fontSize: 'var(--font-size-sm)' }}>
                      人
                    </Text>
                  </div>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--radius-lg)',
                    background: 'rgba(0, 199, 230, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-cyan-500)',
                    fontSize: 22,
                  }}
                >
                  <UserOutlined />
                </div>
              </div>
            </Card>
          </div>
        </Col>
      </Row>

      {/* 数据看板占位 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card hoverable>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-5)' }}>
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
                <BarChartOutlined />
              </div>
              <Text strong style={{ fontSize: 'var(--font-size-lg)' }}>
                学习趋势
              </Text>
            </div>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <Text type="secondary">数据看板开发中...</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                    将展示团队学习趋势图表
                  </Text>
                </div>
              }
              style={{ padding: 'var(--spacing-12) 0' }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card hoverable style={{ height: '100%' }}>
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
                <TrophyOutlined />
              </div>
              <Text strong style={{ fontSize: 'var(--font-size-lg)' }}>
                排行榜
              </Text>
            </div>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Text type="secondary">即将推出...</Text>
              }
              style={{ padding: 'var(--spacing-8) 0' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};
