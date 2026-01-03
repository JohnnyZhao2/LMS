/**
 * 知识库相关路由
 */
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/protected-route';
import { StudentKnowledgeCenter } from '@/features/knowledge/components/student-knowledge-center';
import { KnowledgeDetail } from '@/features/knowledge/components/knowledge-detail';
import { KnowledgeForm } from '@/features/knowledge/components/knowledge-form';
import { AdminKnowledgeList } from '@/features/knowledge/components/admin-knowledge-list';
import { ROUTES } from '@/config/routes';

export const knowledgeRoutes = [
  // 知识中心（学员）
  <Route
    key="knowledge-list"
    path={ROUTES.KNOWLEDGE}
    element={
      <ProtectedRoute>
        <StudentKnowledgeCenter />
      </ProtectedRoute>
    }
  />,
  <Route
    key="knowledge-detail"
    path={`${ROUTES.KNOWLEDGE}/:id`}
    element={
      <ProtectedRoute>
        <KnowledgeDetail />
      </ProtectedRoute>
    }
  />,
  // 知识库管理（管理员）
  <Route
    key="admin-knowledge-list"
    path={ROUTES.ADMIN_KNOWLEDGE}
    element={
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AdminKnowledgeList />
      </ProtectedRoute>
    }
  />,
  <Route
    key="admin-knowledge-create"
    path={`${ROUTES.ADMIN_KNOWLEDGE}/create`}
    element={
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <KnowledgeForm />
      </ProtectedRoute>
    }
  />,
  <Route
    key="admin-knowledge-edit"
    path={`${ROUTES.ADMIN_KNOWLEDGE}/:id/edit`}
    element={
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <KnowledgeForm />
      </ProtectedRoute>
    }
  />,
  <Route
    key="admin-knowledge-detail"
    path={`${ROUTES.ADMIN_KNOWLEDGE}/:id`}
    element={
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <KnowledgeDetail />
      </ProtectedRoute>
    }
  />,
];
