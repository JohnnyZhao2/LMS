import { useSearchParams } from 'react-router-dom';
import { PageFillShell, PageWorkbench } from '@/components/ui/page-shell';
import { useAuth } from '@/session/auth/auth-context';
import type { RoleCode } from '@/types/common';
import { AUTH_ROLES } from '@/config/role-constants';
import { AUTHORIZATION_WORKBENCH_ACCESS_PERMISSIONS } from '@/entities/authorization/constants/access';
import { AuthorizationWorkbenchPanel } from '../components/authorization-workbench-panel';

export const AuthorizationCenterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { hasCapability } = useAuth();
  const canAccessWorkbench = AUTHORIZATION_WORKBENCH_ACCESS_PERMISSIONS.some(hasCapability);
  const initialRoleCode = searchParams.get('role_code');
  const initialUserIdParam = searchParams.get('user_id');
  const initialSelectedRole = AUTH_ROLES.includes(initialRoleCode as RoleCode)
    ? (initialRoleCode as RoleCode)
    : null;
  const initialSelectedUserId = initialUserIdParam ? Number(initialUserIdParam) : null;

  if (!canAccessWorkbench) {
    return (
      <PageFillShell>
        <PageWorkbench className="gap-0">
          <div className="flex h-full items-center justify-center rounded-2xl border border-border bg-muted px-6 py-8 text-sm text-text-muted">
            当前账号没有用户授权工作台权限，请联系管理员开通。
          </div>
        </PageWorkbench>
      </PageFillShell>
    );
  }

  return (
    <PageFillShell>
      <PageWorkbench className="gap-0">
        <AuthorizationWorkbenchPanel
          roleCodes={AUTH_ROLES}
          initialRoleCode={initialSelectedRole}
          initialSelectedUserId={initialSelectedUserId}
        />
      </PageWorkbench>
    </PageFillShell>
  );
};
