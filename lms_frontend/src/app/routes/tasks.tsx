/**
 * 任务相关路由
 */
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/protected-route';
import { TaskList } from '@/features/tasks/components/task-list';
import { TaskDetail } from '@/features/tasks/components/task-detail';
import { TaskForm } from '@/features/tasks/components/task-form';
import { ROUTES } from '@/config/routes';

export const taskRoutes = [
  <Route
    key="task-list"
    path={ROUTES.TASKS}
    element={
      <ProtectedRoute>
        <TaskList />
      </ProtectedRoute>
    }
  />,
  <Route
    key="task-create"
    path={`${ROUTES.TASKS}/create`}
    element={
      <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
        <TaskForm />
      </ProtectedRoute>
    }
  />,
  <Route
    key="task-edit"
    path={`${ROUTES.TASKS}/:id/edit`}
    element={
      <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
        <TaskForm />
      </ProtectedRoute>
    }
  />,
  <Route
    key="task-detail"
    path={`${ROUTES.TASKS}/:id`}
    element={
      <ProtectedRoute>
        <TaskDetail />
      </ProtectedRoute>
    }
  />,
];
