/**
 * 阅卷中心路由：任务管理入口可锁定任务，app 层组合 tasks 详情查询。
 */
import { useSearchParams } from 'react-router-dom';

import { GradingCenterPage } from '@/features/assessment/components/grading/grading-center-page';
import { useTaskDetail } from '@/features/tasks/api/tasks-queries';

export const GradingCenterRoutePage = () => {
  const [searchParams] = useSearchParams();
  const preferredTaskId = Number(searchParams.get('task') || 0);
  const isTaskManagementEntry = searchParams.get('entry') === 'task-management';
  const { data: lockedTask, isLoading: lockedTaskLoading } = useTaskDetail(preferredTaskId, {
    enabled: isTaskManagementEntry && preferredTaskId > 0,
  });

  return (
    <GradingCenterPage
      lockedTask={isTaskManagementEntry ? lockedTask : undefined}
      lockedTaskLoading={isTaskManagementEntry ? lockedTaskLoading : false}
    />
  );
};
