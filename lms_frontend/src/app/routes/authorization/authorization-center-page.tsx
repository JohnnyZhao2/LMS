import { useSearchParams } from 'react-router-dom';
import { PageFillShell, PageWorkbench } from '@/components/ui/page-shell';
import type { RoleCode } from '@/types/common';
import { usePermissionCatalog } from '@/features/authorization/api/authorization';
import { MANAGEMENT_ROLE_CODES } from '@/config/authorization';
import { AuthorizationCenterPanel } from '@/features/authorization/components/authorization-center-panel';

export const AuthorizationCenterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRoleCode = searchParams.get('role_code');
  const initialUserIdParam = searchParams.get('user_id');
  const initialSelectedRole = MANAGEMENT_ROLE_CODES.includes(initialRoleCode as RoleCode)
    ? (initialRoleCode as RoleCode)
    : null;
  const initialSelectedUserId = initialUserIdParam ? Number(initialUserIdParam) : null;
  const { data: permissionCatalog = [] } = usePermissionCatalog();

  return (
    <PageFillShell>
      <PageWorkbench className="gap-0">
        <AuthorizationCenterPanel
          permissionCatalog={permissionCatalog}
          initialRoleCode={initialSelectedRole}
          initialSelectedUserId={initialSelectedUserId}
        />
      </PageWorkbench>
    </PageFillShell>
  );
};
