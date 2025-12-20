import { useMemo } from 'react';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  BookOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  UserOutlined,
  TeamOutlined,
  QuestionCircleOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import type { RoleCode } from '@/types/api';

type MenuItem = Required<MenuProps>['items'][number];

/**
 * 根据角色获取菜单项
 */
export const useRoleMenu = (currentRole: RoleCode | null): MenuItem[] => {
  return useMemo(() => {
    if (!currentRole) {
      return [];
    }

    const baseMenu: MenuItem[] = [
      {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: '仪表盘',
      },
    ];

    switch (currentRole) {
      case 'STUDENT':
        return [
          ...baseMenu,
          {
            key: '/knowledge',
            icon: <BookOutlined />,
            label: '知识中心',
          },
          {
            key: '/tasks',
            icon: <FileTextOutlined />,
            label: '任务中心',
          },
          {
            key: '/personal',
            icon: <UserOutlined />,
            label: '个人中心',
          },
        ];

      case 'MENTOR':
      case 'DEPT_MANAGER':
        return [
          ...baseMenu,
          {
            key: '/test-center',
            icon: <QuestionCircleOutlined />,
            label: '测试中心',
          },
          {
            key: '/tasks',
            icon: <FileTextOutlined />,
            label: '任务管理',
          },
          {
            key: '/grading',
            icon: <CheckCircleOutlined />,
            label: '评分中心',
          },
          {
            key: '/spot-checks',
            icon: <FileSearchOutlined />,
            label: '抽查中心',
          },
        ];

      case 'ADMIN':
        return [
          ...baseMenu,
          {
            key: '/admin/knowledge',
            icon: <BookOutlined />,
            label: '知识库管理',
          },
          {
            key: '/test-center',
            icon: <QuestionCircleOutlined />,
            label: '测试中心',
          },
          {
            key: '/tasks',
            icon: <FileTextOutlined />,
            label: '任务管理',
          },
          {
            key: '/users',
            icon: <TeamOutlined />,
            label: '用户与权限',
          },
        ];

      case 'TEAM_MANAGER':
        return [
          ...baseMenu,
          {
            key: '/analytics',
            icon: <DashboardOutlined />,
            label: '团队数据看板',
          },
        ];

      default:
        return baseMenu;
    }
  }, [currentRole]);
};

