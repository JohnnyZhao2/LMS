/**
 * 知识库相关路由
 */
import { Route } from 'react-router-dom';
import { lazy } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { ROUTES } from '@/config/routes';

const KnowledgeCenter = lazy(() => import('@/features/knowledge/components/knowledge-center').then(m => ({ default: m.KnowledgeCenter })));
const KnowledgeDetail = lazy(() => import('@/features/knowledge/components/knowledge-detail').then(m => ({ default: m.KnowledgeDetail })));
const KnowledgeForm = lazy(() => import('@/features/knowledge/components/knowledge-form').then(m => ({ default: m.KnowledgeForm })));

export const knowledgeRoutes = [
  // 知识中心（学员）
  <Route
    key="knowledge-list"
    path={ROUTES.KNOWLEDGE}
    element={
      <ProtectedRoute>
        <KnowledgeCenter />
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
  <Route
    key="knowledge-create"
    path={`${ROUTES.KNOWLEDGE}/create`}
    element={
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <KnowledgeForm />
      </ProtectedRoute>
    }
  />,
  <Route
    key="knowledge-edit"
    path={`${ROUTES.KNOWLEDGE}/:id/edit`}
    element={
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <KnowledgeForm />
      </ProtectedRoute>
    }
  />,
];
