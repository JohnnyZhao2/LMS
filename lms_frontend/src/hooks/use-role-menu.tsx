import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  LayoutGrid,
  BookOpen,
  User,
  Users,
  HelpCircle,
  FileSearch,
  Tags,
  BarChart3,
  SquareCheck,
  SquareTerminal,
} from 'lucide-react';
import type { RoleCode } from '@/types/api';
import { useAuth } from '@/features/auth/hooks/use-auth';

export interface MenuItem {
  key?: string;
  icon?: React.ReactNode;
  label: string;
  children?: MenuItem[];
}

/**
 * 根据当前角色 + 生效权限生成顶部菜单
 */
export const useRoleMenu = (currentRole: RoleCode | null): MenuItem[] => {
  const { role: urlRole } = useParams<{ role: string }>();
  const { hasAnyPermission } = useAuth();

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

    const menu: MenuItem[] = [...baseMenu];
    const isStudentLike = currentRole === 'STUDENT' || currentRole === 'TEAM_MANAGER';
    const isAdminLike = currentRole === 'ADMIN' || currentRole === 'SUPER_ADMIN';
    const quizChildren: MenuItem[] = [];

    if (hasAnyPermission(['knowledge.view'])) {
      menu.push({
        key: `${rolePrefix}/knowledge`,
        icon: <BookOpen className="w-4 h-4" />,
        label: isStudentLike ? '知识中心' : '知识管理',
      });
    }

    if (hasAnyPermission(['tag.view'])) {
      menu.push({
        key: `${rolePrefix}/tags`,
        icon: <Tags className="w-4 h-4" />,
        label: '标签管理',
      });
    }

    if (hasAnyPermission(['quiz.view', 'quiz.create', 'quiz.update', 'quiz.delete'])) {
      quizChildren.push({
        key: `${rolePrefix}/quizzes`,
        label: '试卷管理',
      });
    }

    if (hasAnyPermission(['question.view', 'question.create', 'question.update', 'question.delete'])) {
      quizChildren.push({
        key: `${rolePrefix}/questions`,
        label: '题目管理',
      });
    }

    if (hasAnyPermission(['grading.view', 'grading.score'])) {
      quizChildren.push({
        key: `${rolePrefix}/grading-center`,
        label: '阅卷中心',
      });
    }

    if (quizChildren.length > 0) {
      menu.push({
        key: `${rolePrefix}/${hasAnyPermission(['quiz.view', 'quiz.create', 'quiz.update', 'quiz.delete']) ? 'quizzes' : 'questions'}`,
        icon: <HelpCircle className="w-4 h-4" />,
        label: '测评管理',
        children: quizChildren,
      });
    }

    if (hasAnyPermission(['task.view'])) {
      menu.push({
        key: `${rolePrefix}/tasks`,
        icon: <SquareCheck className="w-4 h-4" />,
        label: isAdminLike ? '任务管理' : '任务中心',
      });
    }

    if (hasAnyPermission(['spot_check.view'])) {
      menu.push({
        key: `${rolePrefix}/spot-checks`,
        icon: <FileSearch className="w-4 h-4" />,
        label: '抽查中心',
      });
    }

    if (hasAnyPermission(['user.view'])) {
      menu.push({
        key: `${rolePrefix}/users`,
        icon: <Users className="w-4 h-4" />,
        label: '用户管理',
      });
    }

    if (hasAnyPermission(['activity_log.view'])) {
      menu.push({
        key: `${rolePrefix}/audit-logs`,
        icon: <SquareTerminal className="w-4 h-4" />,
        label: '日志审计',
      });
    }

    if (currentRole === 'TEAM_MANAGER' && hasAnyPermission(['analytics.view'])) {
      menu.push({
        key: `${rolePrefix}/analytics`,
        icon: <BarChart3 className="w-4 h-4" />,
        label: '数据看板',
      });
    }

    if (currentRole === 'STUDENT' && hasAnyPermission(['profile.view', 'profile.update'])) {
      menu.push({
        key: `${rolePrefix}/personal`,
        icon: <User className="w-4 h-4" />,
        label: '个人中心',
      });
    }

    return menu;
  }, [currentRole, hasAnyPermission, urlRole]);
};
