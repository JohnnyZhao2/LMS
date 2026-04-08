import { useMemo } from 'react';
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
import { getWorkspaceConfig, getRolePathPrefix } from '@/app/workspace-config';

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
  const { hasAnyCapability, hasCapability } = useAuth();

  return useMemo(() => {
    if (!currentRole) {
      return [];
    }
    const workspace = getWorkspaceConfig(currentRole);
    if (!workspace) {
      return [];
    }

    const rolePrefix = getRolePathPrefix(currentRole);

    const baseMenu: MenuItem[] = [
      {
        key: `${rolePrefix}/dashboard`,
        icon: <LayoutGrid className="w-4 h-4" />,
        label: '概览',
      },
    ];

    const menu: MenuItem[] = [...baseMenu];
    const isStudentStyle = workspace.menuVariant === 'student';
    const isAdminStyle = workspace.menuVariant === 'admin';
    const quizChildren: MenuItem[] = [];

    if (hasAnyCapability(['knowledge.view'])) {
      menu.push({
        key: `${rolePrefix}/knowledge`,
        icon: <BookOpen className="w-4 h-4" />,
        label: isStudentStyle ? '知识中心' : '知识管理',
      });
    }

    if (hasAnyCapability(['tag.view'])) {
      menu.push({
        key: `${rolePrefix}/tags`,
        icon: <Tags className="w-4 h-4" />,
        label: '标签管理',
      });
    }

    if (hasAnyCapability(['quiz.view', 'quiz.create', 'quiz.update', 'quiz.delete'])) {
      quizChildren.push({
        key: `${rolePrefix}/quizzes`,
        label: '试卷管理',
      });
    }

    if (hasAnyCapability(['question.view', 'question.create', 'question.update', 'question.delete'])) {
      quizChildren.push({
        key: `${rolePrefix}/questions`,
        label: '题目管理',
      });
    }

    if (hasAnyCapability(['grading.view', 'grading.score'])) {
      quizChildren.push({
        key: `${rolePrefix}/grading-center`,
        label: '阅卷中心',
      });
    }

    if (quizChildren.length > 0) {
      menu.push({
        key: `${rolePrefix}/${hasAnyCapability(['quiz.view', 'quiz.create', 'quiz.update', 'quiz.delete']) ? 'quizzes' : 'questions'}`,
        icon: <HelpCircle className="w-4 h-4" />,
        label: '测评管理',
        children: quizChildren,
      });
    }

    if (hasAnyCapability(['task.view'])) {
      menu.push({
        key: `${rolePrefix}/tasks`,
        icon: <SquareCheck className="w-4 h-4" />,
        label: isAdminStyle ? '任务管理' : '任务中心',
      });
    }

    if (hasAnyCapability(['spot_check.view'])) {
      menu.push({
        key: `${rolePrefix}/spot-checks`,
        icon: <FileSearch className="w-4 h-4" />,
        label: '抽查管理',
      });
    }

    if (hasAnyCapability(['user.view', 'user.authorize'])) {
      const userChildren: MenuItem[] = [];
      if (hasAnyCapability(['user.view'])) {
        userChildren.push({
          key: `${rolePrefix}/users`,
          label: '用户列表',
        });
      }
      if (hasAnyCapability(['user.authorize'])) {
        userChildren.push({
          key: `${rolePrefix}/users/authorization`,
          label: '用户授权',
        });
      }

      if (userChildren.length <= 1) {
        const onlyItem = userChildren[0];
        if (onlyItem) {
          menu.push({
            key: onlyItem.key,
            icon: <Users className="w-4 h-4" />,
            label: '用户管理',
          });
        }
      } else {
        menu.push({
          key: `${rolePrefix}/users`,
          icon: <Users className="w-4 h-4" />,
          label: '用户管理',
          children: userChildren,
        });
      }
    }

    if (hasAnyCapability(['activity_log.view'])) {
      menu.push({
        key: `${rolePrefix}/audit-logs`,
        icon: <SquareTerminal className="w-4 h-4" />,
        label: '日志审计',
      });
    }

    if (workspace.dashboardVariant === 'team_manager' && hasCapability('dashboard.team_manager.view')) {
      menu.push({
        key: `${rolePrefix}/analytics`,
        icon: <BarChart3 className="w-4 h-4" />,
        label: '数据看板',
      });
    }

    if (
      workspace.dashboardVariant === 'student'
      && (hasCapability('profile.student.view') || hasCapability('profile.student.update'))
    ) {
      menu.push({
        key: `${rolePrefix}/personal`,
        icon: <User className="w-4 h-4" />,
        label: '个人中心',
      });
    }

    return menu;
  }, [currentRole, hasAnyCapability, hasCapability]);
};
