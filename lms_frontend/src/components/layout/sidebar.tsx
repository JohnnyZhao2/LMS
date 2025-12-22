import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRoleMenu } from '@/hooks/use-role-menu';
import { useAuth } from '@/features/auth/hooks/use-auth';

const { Sider } = Layout;

/**
 * 侧边栏组件
 * 应用毛玻璃效果，宽度 280px
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
      width={280}
      style={{
        position: 'fixed',
        left: 0,
        top: 'var(--header-height)',
        bottom: 0,
        height: 'calc(100vh - var(--header-height))',
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        borderRight: '1px solid rgba(255, 255, 255, 0.3)',
        zIndex: 100,
        overflow: 'auto',
      }}
    >
      <div
        style={{
          padding: 'var(--spacing-4) var(--spacing-3)',
          height: '100%',
        }}
      >
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            background: 'transparent',
            border: 'none',
            fontWeight: 500,
          }}
        />
      </div>
    </Sider>
  );
};
