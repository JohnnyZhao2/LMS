import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { ROUTES } from '@/config/routes';
import { useAuth } from '@/session/auth/auth-context';
import { getWorkspaceHome } from '@/session/workspace/role-paths';
import { consumeOidcCallbackCode } from '@/features/auth/utils/oidc-session';

export const OidcCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginByOidcCode } = useAuth();

  useEffect(() => {
    const code = consumeOidcCallbackCode(searchParams);
    if (!code) {
      toast.error('扫码登录回调参数无效');
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }

    void (async () => {
      try {
        const currentRole = await loginByOidcCode(code);
        navigate(getWorkspaceHome(currentRole) ?? ROUTES.LOGIN, { replace: true });
      } catch {
        toast.error('扫码登录失败');
        navigate(ROUTES.LOGIN, { replace: true });
      }
    })();
  }, [loginByOidcCode, navigate, searchParams]);

  return (
    <div className="min-h-screen grid place-items-center text-sm text-foreground/70">
      正在完成扫码登录...
    </div>
  );
};
