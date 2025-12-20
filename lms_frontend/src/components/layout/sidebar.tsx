import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRoleMenu } from '@/hooks/use-role-menu';
import { useAuth } from '@/features/auth/hooks/use-auth';

const { Sider } = Layout;

/**
 * 侧边栏组件
 */
export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentRole } = useAuth();
  const menuItems = useRoleMenu(currentRole);

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Sider
      width={200}
      style={{
        background: '#fff',
        boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
      }}
    >
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ height: '100%', borderRight: 0 }}
      />
    </Sider>
  );
};
