/**
 * 认证相关路由
 */
import { Route } from 'react-router-dom';
import { LoginPage } from '@/app/routes/auth/login';
import { ROUTES } from '@/config/routes';

export const authRoutes = [
  <Route key="login" path={ROUTES.LOGIN} element={<LoginPage />} />,
];
