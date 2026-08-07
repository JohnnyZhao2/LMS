import { useSearchParams } from 'react-router-dom';
import { PageFillShell, PageWorkbench } from '@/components/ui/page-shell';
import { useAuth } from '@/session/auth/auth-context';
import type { RoleCode } from '@/types/common';
import { usePermissionCatalog } from '@/entities/authorization/api/authorization';
import {
  AUTHORIZATION_PANEL_ROLE_CODES,
} from '@/features/authorization/components/use-authorization-center-state';
import {
  AUTHORIZATION_WORKBENCH_ACCESS_PERMISSIONS,
  USER_PERMISSION_ACCESS_PERMISSIONS,
  USER_PERMISSION_UPDATE_PERMISSION,
} from '@/entities/authorization/constants/access';
import { AuthorizationCenterPanel } from '../components/authorization-center-panel';

export const AuthorizationCenterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { hasCapability } = useAuth();
  const canAccessWorkbench = AUTHORIZATION_WORKBENCH_ACCESS_PERMISSIONS.some(hasCapability);
  const canViewUserPermissions = USER_PERMISSION_ACCESS_PERMISSIONS.some(hasCapability);
  const canUpdateUserPermissions = hasCapability(USER_PERMISSION_UPDATE_PERMISSION);
  const initialRoleCode = searchParams.get('role_code');
  const initialUserIdParam = searchParams.get('user_id');
  const initialSelectedRole = AUTHORIZATION_PANEL_ROLE_CODES.includes(initialRoleCode as RoleCode)
    ? (initialRoleCode as RoleCode)
    : null;
  const initialSelectedUserId = initialUserIdParam ? Number(initialUserIdParam) : null;

  const shouldLoadData = canAccessWorkbench;
  const { data: permissionCatalog = [] } = usePermissionCatalog({}, shouldLoadData);

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
        <AuthorizationCenterPanel
          roleCodes={AUTHORIZATION_PANEL_ROLE_CODES}
          permissionCatalog={permissionCatalog}
          canViewUserPermissions={canViewUserPermissions}
          canUpdateUserPermissions={canUpdateUserPermissions}
          initialRoleCode={initialSelectedRole}
          initialSelectedUserId={initialSelectedUserId}
        />
      </PageWorkbench>
    </PageFillShell>
  );
};
