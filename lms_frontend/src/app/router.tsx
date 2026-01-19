/**
 * 主路由配置
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { allRoutes } from './routes';
import { ROUTES } from '@/config/routes';

/**
 * 路由配置
 */
export const AppRouter: React.FC = () => {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Spinner /></div>}>
      <Routes>
        {/* 所有功能路由 */}
        {allRoutes}

        {/* 默认重定向 */}
        <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </Suspense>
  );
};
