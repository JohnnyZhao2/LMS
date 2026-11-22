import { useSearchParams } from 'react-router-dom';
import { PageFillShell, PageWorkbench } from '@/components/ui/page-shell';
import { useAuth } from '@/lib/auth';
import { usePermissionCatalog } from '@/features/authorization/api/authorization';
import { AuthorizationCenterPanel } from '@/features/authorization/components/authorization-center-panel';

export const AuthorizationCenterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRoleCode = searchParams.get('role_code');
  const { user } = useAuth();
  const canLoadCatalog = Boolean(user?.is_superuser);
  const { data: permissionCatalog = [] } = usePermissionCatalog(canLoadCatalog);

  return (
    <PageFillShell>
      <PageWorkbench className="gap-0">
        <AuthorizationCenterPanel
          permissionCatalog={permissionCatalog}
          initialRoleCode={initialRoleCode}
        />
      </PageWorkbench>
    </PageFillShell>
  );
};
