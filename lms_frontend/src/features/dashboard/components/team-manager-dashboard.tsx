import { Card, Typography } from 'antd';

const { Title } = Typography;

/**
 * 团队经理仪表盘组件
 */
export const TeamManagerDashboard: React.FC = () => {
  return (
    <div>
      <Title level={2}>团队数据看板</Title>
      <Card>
        <p>团队数据看板（开发中）</p>
      </Card>
    </div>
  );
};

