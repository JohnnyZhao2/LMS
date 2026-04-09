import { useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { TaskManagement } from './task-management';
import { StudentTaskList } from './student-task-list';

/**
 * 任务列表组件
 * 根据用户角色自动切换视图：
 * - 学员：卡片式任务列表
 * - 导师/管理员：表格式任务管理界面
 */
export const TaskList: React.FC = () => {
  const { role } = useParams<{ role: string }>();
  const { currentRole } = useAuth();

  // 优先使用 URL 中的角色参数，回退到 AuthContext 中的角色
  // 这解决了 RoleRouteWrapper 更新状态时的竞态问题
  const effectiveRole = role?.toUpperCase() || currentRole;
  const isStudentView = effectiveRole === 'STUDENT';

  if (isStudentView) {
    return <StudentTaskList />;
  }

  return <TaskManagement />;
};

export default TaskList;
