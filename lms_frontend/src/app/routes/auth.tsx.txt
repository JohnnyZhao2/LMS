/**
 * 认证相关路由
 */
import { Route } from 'react-router-dom';
import { LoginPage } from '@/app/routes/auth/login';
import { OidcCallbackPage } from '@/app/routes/auth/oidc-callback';
import { ROUTES } from '@/config/routes';

export const authRoutes = [
  <Route key="login" path={ROUTES.LOGIN} element={<LoginPage />} />,
  <Route key="login-oidc-callback" path={ROUTES.LOGIN_OIDC_CALLBACK} element={<OidcCallbackPage />} />,
];
