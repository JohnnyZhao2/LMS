import { useMemo } from 'react';
import {
  LayoutGrid,
  BookOpen,
  FileText,
  CheckCircle,
  User,
  Users,
  HelpCircle,
  FileSearch,
  BarChart3,
} from 'lucide-react';
import type { RoleCode } from '@/types/api';
import { ROUTES } from '@/config/routes';

interface MenuItem {
  key: string;
  icon: React.ReactNode;
  label: string;
}

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
        key: ROUTES.DASHBOARD,
        icon: <LayoutGrid className="w-4 h-4" />,
        label: '概览',
      },
    ];

    switch (currentRole) {
      case 'STUDENT':
        return [
          ...baseMenu,
          {
            key: ROUTES.KNOWLEDGE,
            icon: <BookOpen className="w-4 h-4" />,
            label: '知识库',
          },
          {
            key: ROUTES.TASKS,
            icon: <FileText className="w-4 h-4" />,
            label: '任务',
          },
          {
            key: ROUTES.PERSONAL,
            icon: <User className="w-4 h-4" />,
            label: '个人中心',
          },
        ];

      case 'MENTOR':
      case 'DEPT_MANAGER':
        return [
          ...baseMenu,
          {
            key: ROUTES.TEST_CENTER,
            icon: <HelpCircle className="w-4 h-4" />,
            label: '测试中心',
          },
          {
            key: ROUTES.TASKS,
            icon: <FileText className="w-4 h-4" />,
            label: '任务',
          },
          {
            key: ROUTES.GRADING,
            icon: <CheckCircle className="w-4 h-4" />,
            label: '评分',
          },
          {
            key: ROUTES.SPOT_CHECKS,
            icon: <FileSearch className="w-4 h-4" />,
            label: '抽查',
          },
        ];

      case 'ADMIN':
        return [
          ...baseMenu,
          {
            key: ROUTES.ADMIN_KNOWLEDGE,
            icon: <BookOpen className="w-4 h-4" />,
            label: '知识库',
          },
          {
            key: ROUTES.TEST_CENTER,
            icon: <HelpCircle className="w-4 h-4" />,
            label: '测试中心',
          },
          {
            key: ROUTES.TASKS,
            icon: <FileText className="w-4 h-4" />,
            label: '任务',
          },
          {
            key: ROUTES.GRADING,
            icon: <CheckCircle className="w-4 h-4" />,
            label: '评分',
          },
          {
            key: ROUTES.USERS,
            icon: <Users className="w-4 h-4" />,
            label: '用户管理',
          },
        ];

      case 'TEAM_MANAGER':
        return [
          ...baseMenu,
          {
            key: ROUTES.ANALYTICS,
            icon: <BarChart3 className="w-4 h-4" />,
            label: '数据看板',
          },
        ];

      default:
        return baseMenu;
    }
  }, [currentRole]);
};
