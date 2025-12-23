import { useMemo } from 'react';
import type { MenuProps } from 'antd';
import {
  AppstoreOutlined,
  BookOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  UserOutlined,
  TeamOutlined,
  QuestionCircleOutlined,
  FileSearchOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import type { RoleCode } from '@/types/api';

type MenuItem = Required<MenuProps>['items'][number];

/**
 * 根据角色获取菜单项
 * 
 * 角色权限：
 * - 学员：概览、知识库、任务、个人中心
 * - 导师：概览、测试中心、任务、评分、抽查
 * - 室经理：概览、测试中心、任务、评分、抽查
 * - 管理员：概览、知识库管理、测试中心、任务、评分、用户管理
 * - 团队经理：概览、数据看板
 */
export const useRoleMenu = (currentRole: RoleCode | null): MenuItem[] => {
  return useMemo(() => {
    if (!currentRole) {
      return [];
    }

    const baseMenu: MenuItem[] = [
      {
        key: '/dashboard',
        icon: <AppstoreOutlined />,
        label: '概览',
      },
    ];

    switch (currentRole) {
      case 'STUDENT':
        return [
          ...baseMenu,
          {
            key: '/knowledge',
            icon: <BookOutlined />,
            label: '知识库',
          },
          {
            key: '/tasks',
            icon: <FileTextOutlined />,
            label: '任务',
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
            label: '任务',
          },
          {
            key: '/grading',
            icon: <CheckCircleOutlined />,
            label: '评分',
          },
          {
            key: '/spot-checks',
            icon: <FileSearchOutlined />,
            label: '抽查',
          },
        ];

      case 'ADMIN':
        return [
          ...baseMenu,
          {
            key: '/admin/knowledge',
            icon: <BookOutlined />,
            label: '知识库',
          },
          {
            key: '/test-center',
            icon: <QuestionCircleOutlined />,
            label: '测试中心',
          },
          {
            key: '/tasks',
            icon: <FileTextOutlined />,
            label: '任务',
          },
          {
            key: '/grading',
            icon: <CheckCircleOutlined />,
            label: '评分',
          },
          {
            key: '/users',
            icon: <TeamOutlined />,
            label: '用户管理',
          },
        ];

      case 'TEAM_MANAGER':
        return [
          ...baseMenu,
          {
            key: '/analytics',
            icon: <BarChartOutlined />,
            label: '数据看板',
          },
        ];

      default:
        return baseMenu;
    }
  }, [currentRole]);
};
