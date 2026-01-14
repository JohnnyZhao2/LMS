/**
 * 任务相关路由
 */
import { Route } from 'react-router-dom';
import { lazy } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { ROUTES } from '@/config/routes';

const TaskList = lazy(() => import('@/features/tasks/components/task-list').then(m => ({ default: m.TaskList })));
const TaskDetail = lazy(() => import('@/features/tasks/components/task-detail').then(m => ({ default: m.TaskDetail })));
const TaskForm = lazy(() => import('@/features/tasks/components/task-form').then(m => ({ default: m.TaskForm })));

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
