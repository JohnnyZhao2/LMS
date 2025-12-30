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
  const { currentRole } = useAuth();
  const isStudentView = currentRole === 'STUDENT';

  if (isStudentView) {
    return <StudentTaskList />;
  }

  return <TaskManagement />;
};

export default TaskList;
