import { useState } from 'react';
import { Layout, Dropdown, Button, Space, Avatar, Typography } from 'antd';
import { UserOutlined, LogoutOutlined, SwapOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import type { RoleCode } from '@/types/api';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

/**
 * 顶部导航栏组件
 */
export const Header: React.FC = () => {
  const { user, currentRole, availableRoles, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const [, setSwitching] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSwitchRole = async (roleCode: RoleCode) => {
    setSwitching(true);
    try {
      await switchRole(roleCode);
      navigate('/dashboard');
    } catch (error) {
      console.error('切换角色失败:', error);
    } finally {
      setSwitching(false);
    }
  };

  // 角色切换菜单
  const roleMenuItems: MenuProps['items'] = availableRoles
    .filter((role) => role.code !== currentRole)
    .map((role) => ({
      key: role.code,
      label: role.name,
      onClick: () => handleSwitchRole(role.code),
    }));

  // 用户菜单
  const userMenuItems: MenuProps['items'] = [
    ...(roleMenuItems.length > 0
      ? [
          {
            key: 'role-switch',
            label: '切换角色',
            icon: <SwapOutlined />,
            children: roleMenuItems,
          },
          { type: 'divider' as const },
        ]
      : []),
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  const roleName = availableRoles.find((r) => r.code === currentRole)?.name || '';

  return (
    <AntHeader
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Text strong style={{ fontSize: 18 }}>
          LMS 学习管理系统
        </Text>
        {currentRole && (
          <Text type="secondary" style={{ fontSize: 14 }}>
            {roleName}
          </Text>
        )}
      </div>
      <Space>
        {user && (
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Button type="text" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <Text>{user.username}</Text>
            </Button>
          </Dropdown>
        )}
      </Space>
    </AntHeader>
  );
};
