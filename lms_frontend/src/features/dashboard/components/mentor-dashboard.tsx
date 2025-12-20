import { Card, Row, Col, Statistic, Button, Typography } from 'antd';
import { UserOutlined, CheckCircleOutlined, EditOutlined, FileSearchOutlined } from '@ant-design/icons';
import { useMentorDashboard } from '../api/mentor-dashboard';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';

const { Title } = Typography;

/**
 * 导师/室经理仪表盘组件
 */
export const MentorDashboard: React.FC = () => {
  const { data, isLoading } = useMentorDashboard();
  const navigate = useNavigate();

  return (
    <div>
      <Title level={2}>仪表盘</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="学员数量"
              value={data?.mentees_count || 0}
              prefix={<UserOutlined />}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="完成率"
              value={data?.completion_rate || '0%'}
              prefix={<CheckCircleOutlined />}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="平均分"
              value={data?.average_score || '0'}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待评分"
              value={data?.pending_grading_count || 0}
              prefix={<EditOutlined />}
              loading={isLoading}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Button
              type="primary"
              block
              icon={<FileSearchOutlined />}
              onClick={() => navigate(ROUTES.SPOT_CHECKS)}
            >
              发起抽查
            </Button>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Button
              type="default"
              block
              onClick={() => navigate(ROUTES.QUIZZES)}
            >
              新建测验
            </Button>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Button
              type="default"
              block
              onClick={() => navigate(ROUTES.TASKS)}
            >
              发布任务
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

