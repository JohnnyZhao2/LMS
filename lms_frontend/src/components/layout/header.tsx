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
 * 应用毛玻璃效果
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
      danger: true,
      onClick: handleLogout,
    },
  ];

  const roleName = availableRoles.find((r) => r.code === currentRole)?.name || '';

  return (
    <AntHeader
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--spacing-6)',
        height: 'var(--header-height)',
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Logo 和标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
        {/* Logo */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-purple-500) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow-primary)',
          }}
        >
          <span
            style={{
              color: 'white',
              fontSize: 'var(--font-size-lg)',
              fontWeight: 700,
            }}
          >
            L
          </span>
        </div>

        <div>
          <Text
            strong
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 600,
              background: 'linear-gradient(135deg, var(--color-gray-900) 0%, var(--color-gray-700) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            LMS 学习管理系统
          </Text>
        </div>

        {currentRole && (
          <div
            style={{
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-primary-50)',
              border: '1px solid var(--color-primary-100)',
            }}
          >
            <Text
              style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600,
                color: 'var(--color-primary-600)',
              }}
            >
              {roleName}
            </Text>
          </div>
        )}
      </div>

      {/* 用户区域 */}
      <Space size={12}>
        {user && (
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
            <Button
              type="text"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)',
                padding: '4px 12px',
                height: 40,
                borderRadius: 'var(--radius-full)',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Avatar
                size={28}
                icon={<UserOutlined />}
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary-400) 0%, var(--color-primary-600) 100%)',
                }}
              />
              <Text style={{ fontWeight: 500 }}>{user.username}</Text>
            </Button>
          </Dropdown>
        )}
      </Space>
    </AntHeader>
  );
};
