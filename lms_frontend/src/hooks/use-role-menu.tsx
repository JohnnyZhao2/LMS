import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  LayoutGrid,
  BookOpen,
  FileText,
  User,
  Users,
  HelpCircle,
  FileSearch,
  BarChart3,
} from 'lucide-react';
import type { RoleCode } from '@/types/api';

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
 * - 导师：概览、试卷中心、任务、抽查
 * - 室经理：概览、试卷中心、任务、抽查
 * - 管理员：概览、知识库管理、试卷中心、任务、用户管理
 * - 团队经理：概览、数据看板
 */
export const useRoleMenu = (currentRole: RoleCode | null): MenuItem[] => {
  const { role: urlRole } = useParams<{ role: string }>();

  return useMemo(() => {
    if (!currentRole) {
      return [];
    }

    // 使用 URL 中的角色作为路径前缀
    const rolePrefix = urlRole ? `/${urlRole.toLowerCase()}` : `/${currentRole.toLowerCase()}`;

    const baseMenu: MenuItem[] = [
      {
        key: `${rolePrefix}/dashboard`,
        icon: <LayoutGrid className="w-4 h-4" />,
        label: '概览',
      },
    ];

    switch (currentRole) {
      case 'STUDENT':
        return [
          ...baseMenu,
          {
            key: `${rolePrefix}/knowledge`,
            icon: <BookOpen className="w-4 h-4" />,
            label: '知识库',
          },
          {
            key: `${rolePrefix}/tasks`,
            icon: <FileText className="w-4 h-4" />,
            label: '任务',
          },
          {
            key: `${rolePrefix}/personal`,
            icon: <User className="w-4 h-4" />,
            label: '个人中心',
          },
        ];

      case 'MENTOR':
      case 'DEPT_MANAGER':
        return [
          ...baseMenu,
          {
            key: `${rolePrefix}/quiz-center`,
            icon: <HelpCircle className="w-4 h-4" />,
            label: '试卷中心',
          },
          {
            key: `${rolePrefix}/tasks`,
            icon: <FileText className="w-4 h-4" />,
            label: '任务',
          },
          {
            key: `${rolePrefix}/spot-checks`,
            icon: <FileSearch className="w-4 h-4" />,
            label: '抽查',
          },
        ];

      case 'ADMIN':
        return [
          ...baseMenu,
          {
            key: `${rolePrefix}/admin/knowledge`,
            icon: <BookOpen className="w-4 h-4" />,
            label: '知识库',
          },
          {
            key: `${rolePrefix}/quiz-center`,
            icon: <HelpCircle className="w-4 h-4" />,
            label: '试卷中心',
          },
          {
            key: `${rolePrefix}/tasks`,
            icon: <FileText className="w-4 h-4" />,
            label: '任务',
          },
          {
            key: `${rolePrefix}/users`,
            icon: <Users className="w-4 h-4" />,
            label: '用户管理',
          },
        ];

      case 'TEAM_MANAGER':
        return [
          ...baseMenu,
          {
            key: `${rolePrefix}/analytics`,
            icon: <BarChart3 className="w-4 h-4" />,
            label: '数据看板',
          },
        ];

      default:
        return baseMenu;
    }
  }, [currentRole, urlRole]);
};
