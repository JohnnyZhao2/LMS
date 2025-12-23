import { Layout, Segmented, Avatar, Typography, Dropdown } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRoleMenu } from '@/hooks/use-role-menu';
import type { RoleCode } from '@/types/api';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

/**
 * 角色代码到简称的映射
 */
const ROLE_SHORT_LABELS: Record<RoleCode, string> = {
  STUDENT: '学',
  MENTOR: '师',
  DEPT_MANAGER: '室',
  ADMIN: '管',
  TEAM_MANAGER: '团',
};

/**
 * 角色代码到完整名称的映射
 */
const ROLE_FULL_LABELS: Record<RoleCode, string> = {
  STUDENT: '学员',
  MENTOR: '导师',
  DEPT_MANAGER: '室经理',
  ADMIN: '管理员',
  TEAM_MANAGER: '团队经理',
};

/**
 * 顶部导航栏组件
 * 包含 Logo、导航菜单、角色切换器和用户信息
 */
export const Header: React.FC = () => {
  const { user, currentRole, availableRoles, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menuItems = useRoleMenu(currentRole);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  /**
   * 处理角色切换
   */
  const handleRoleChange = async (value: string) => {
    const roleCode = value as RoleCode;
    if (roleCode !== currentRole) {
      try {
        await switchRole(roleCode);
        navigate('/dashboard');
      } catch (error) {
        console.error('切换角色失败:', error);
      }
    }
  };

  /**
   * 处理导航菜单点击
   */
  const handleNavClick = (path: string) => {
    navigate(path);
  };

  /**
   * 获取当前选中的导航项
   */
  const getSelectedNavKey = () => {
    const pathname = location.pathname;
    const matched = menuItems.find((item) => {
      const key = (item as { key?: string })?.key;
      if (!key) return false;
      return pathname === key || pathname.startsWith(key + '/');
    });
    return (matched as { key?: string })?.key || '';
  };

  // 用户下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleLogout,
    },
  ];

  // 角色排序顺序：学员 -> 导师 -> 室经理 -> 团队经理 -> 管理员
  const ROLE_ORDER: RoleCode[] = ['STUDENT', 'MENTOR', 'DEPT_MANAGER', 'TEAM_MANAGER', 'ADMIN'];

  // 角色分段选择器选项（按指定顺序排列）
  const roleOptions = [...availableRoles]
    .sort((a, b) => ROLE_ORDER.indexOf(a.code) - ROLE_ORDER.indexOf(b.code))
    .map((role) => ({
      label: ROLE_SHORT_LABELS[role.code] || role.name.charAt(0),
      value: role.code,
    }));

  const selectedNavKey = getSelectedNavKey();

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
      {/* 左侧：Logo + 品牌名 + 导航菜单 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-6)' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
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
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              L
            </span>
          </div>

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
            SyncLearn Pro
          </Text>
        </div>

        {/* 导航菜单 */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {menuItems.map((item) => {
            const menuItem = item as { key?: string; icon?: React.ReactNode; label?: React.ReactNode };
            if (!menuItem.key) return null;

            const isActive = selectedNavKey === menuItem.key;

            return (
              <button
                key={menuItem.key}
                onClick={() => handleNavClick(menuItem.key!)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-2)',
                  padding: '6px 14px',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'var(--color-primary-500)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--color-gray-600)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--color-gray-100)';
                    e.currentTarget.style.color = 'var(--color-gray-900)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--color-gray-600)';
                  }
                }}
              >
                <span style={{ fontSize: '16px', display: 'flex', alignItems: 'center' }}>
                  {menuItem.icon}
                </span>
                <span>{menuItem.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 右侧：角色切换器 + 用户信息 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
        {/* 角色分段选择器 */}
        {availableRoles.length > 1 && currentRole && (
          <Segmented
            value={currentRole}
            onChange={handleRoleChange}
            options={roleOptions}
            size="small"
          />
        )}

        {/* 用户信息 */}
        {user && (
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)',
                padding: '4px 12px 4px 4px',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                background: 'var(--color-gray-50)',
                border: '1px solid var(--color-gray-200)',
              }}
            >
              <Avatar
                size={28}
                icon={<UserOutlined />}
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary-400) 0%, var(--color-primary-600) 100%)',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <Text
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 500,
                    color: 'var(--color-gray-900)',
                    lineHeight: 1.2,
                  }}
                >
                  {user.display_name || user.username}
                </Text>
                {currentRole && (
                  <Text
                    style={{
                      fontSize: '10px',
                      color: 'var(--color-gray-500)',
                      lineHeight: 1.2,
                    }}
                  >
                    {ROLE_FULL_LABELS[currentRole]}
                  </Text>
                )}
              </div>
            </div>
          </Dropdown>
        )}
      </div>
    </AntHeader>
  );
};
