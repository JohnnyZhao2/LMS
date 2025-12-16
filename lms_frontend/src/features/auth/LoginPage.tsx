/**
 * Login Page Component
 * Combines AuthLayout styling with LoginForm
 * Requirements: 1.3
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from './AuthContext';
import { LoginForm } from './components/LoginForm';
import { ROLE_DEFAULT_ROUTES } from '@/config/roles';

/**
 * Login Page
 * Requirements: 1.3 - Redirect to role-specific page after login
 */
export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, currentRole, isInitialized } = useAuth();

  /**
   * Redirect authenticated users to their default route
   * Requirements: 1.3 - Redirect based on role
   */
  useEffect(() => {
    if (isInitialized && isAuthenticated && currentRole) {
      const defaultRoute = ROLE_DEFAULT_ROUTES[currentRole] || '/dashboard';
      navigate(defaultRoute, { replace: true });
    }
  }, [isAuthenticated, currentRole, isInitialized, navigate]);

  /**
   * Handle successful login
   * Requirements: 1.3 - Navigate to role-specific default route
   */
  const handleLoginSuccess = () => {
    // The useEffect above will handle the redirect once auth state updates
  };

  // Don't render login form if already authenticated
  if (isInitialized && isAuthenticated) {
    return null;
  }

  return (
    <div className="w-full">
      {/* Header Badge */}
      <div className="text-center mb-6">
        <Badge variant="neon" className="mb-4">
          System Access
        </Badge>
        <p className="text-text-muted text-sm">
          Engineering Competence Management System
        </p>
      </div>

      {/* Login Card */}
      <Card className="glass-panel border-white/10 shadow-xl backdrop-blur-xl">
        <CardHeader>
          <CardTitle>身份验证</CardTitle>
          <CardDescription>
            请输入您的凭据以访问系统
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm onSuccess={handleLoginSuccess} />
        </CardContent>
      </Card>

      {/* Footer Info */}
      <div className="mt-8 flex justify-between text-xs font-mono text-text-muted opacity-50">
        <span>SYS.VER.2.0.4</span>
        <span>SECURE.CONN</span>
      </div>
    </div>
  );
}

export default LoginPage;
