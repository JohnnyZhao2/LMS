import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '@/features/auth/stores/auth-context';

export const OidcCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginByOidcCode } = useAuth();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const localState = sessionStorage.getItem('lms_oidc_state');

    if (!code || !state || state !== localState) {
      toast.error('扫码登录回调参数无效');
      navigate('/login', { replace: true });
      return;
    }

    sessionStorage.removeItem('lms_oidc_state');

    void (async () => {
      try {
        const currentRole = await loginByOidcCode(code);
        navigate(`/${currentRole.toLowerCase()}/dashboard`, { replace: true });
      } catch {
        toast.error('扫码登录失败');
        navigate('/login', { replace: true });
      }
    })();
  }, [loginByOidcCode, navigate, searchParams]);

  return (
    <div className="min-h-screen grid place-items-center text-sm text-foreground/70">
      正在完成扫码登录...
    </div>
  );
};
