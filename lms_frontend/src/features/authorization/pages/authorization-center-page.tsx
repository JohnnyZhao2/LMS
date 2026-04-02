import { useEffect, useMemo, useState } from 'react';
import { Layers3 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { showApiError } from '@/utils/error-handler';
import type { RoleCode } from '@/types/api';
import {
  usePermissionCatalog,
  useReplaceRolePermissionTemplate,
  useRolePermissionTemplate,
} from '../api/authorization';
import { isPermissionLockedForRole } from '../constants/permission-constraints';
import { RolePermissionTemplatePanel } from '../components/role-permission-template-panel';

export const AuthorizationCenterPage: React.FC = () => {
  const { hasPermission, refreshUser } = useAuth();
  const canViewRoleTemplate = hasPermission('authorization.role_template.view') || hasPermission('authorization.role_template.update');
  const canUpdateRoleTemplate = hasPermission('authorization.role_template.update');

  const [selectedRole, setSelectedRole] = useState<RoleCode>('STUDENT');
  const [selectedRolePermissionCodes, setSelectedRolePermissionCodes] = useState<string[]>([]);
  const shouldLoadData = canViewRoleTemplate;

  const { data: permissionCatalog = [] } = usePermissionCatalog(undefined, shouldLoadData);
  const permissionByCode = useMemo(() => {
    const permissionMap = new Map<string, { module: string }>();
    permissionCatalog.forEach((permission) => {
      permissionMap.set(permission.code, { module: permission.module });
    });
    return permissionMap;
  }, [permissionCatalog]);
  const roleTemplateQuery = useRolePermissionTemplate(selectedRole, canViewRoleTemplate);

  const replaceRoleTemplateMutation = useReplaceRolePermissionTemplate();

  useEffect(() => {
    if (roleTemplateQuery.data?.permission_codes) {
      setSelectedRolePermissionCodes(roleTemplateQuery.data.permission_codes);
    }
  }, [roleTemplateQuery.data]);

  const handleToggleRolePermission = (permissionCode: string, checked: boolean) => {
    const permission = permissionByCode.get(permissionCode);
    if (permission && isPermissionLockedForRole(selectedRole, permission)) {
      return;
    }

    setSelectedRolePermissionCodes((previousCodes) => {
      const codeSet = new Set(previousCodes);
      if (checked) {
        codeSet.add(permissionCode);
      } else {
        codeSet.delete(permissionCode);
      }
      return Array.from(codeSet).sort();
    });
  };

  const handleSaveRoleTemplate = async () => {
    if (!canUpdateRoleTemplate) return;
    try {
      await replaceRoleTemplateMutation.mutateAsync({
        roleCode: selectedRole,
        permissionCodes: selectedRolePermissionCodes,
      });
      toast.success(`${selectedRole} 权限模板已更新`);
      await refreshUser();
    } catch (error) {
      showApiError(error);
    }
  };

  if (!canViewRoleTemplate) {
    return (
      <PageShell>
        <PageHeader title="角色模板配置" icon={<Layers3 />} />
        <div className="rounded-2xl border border-border bg-muted p-8 text-sm text-text-muted">
          当前账号没有角色模板配置权限，请联系管理员开通。
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader title="角色模板配置" icon={<Layers3 />} />

      <RolePermissionTemplatePanel
        canViewRoleTemplate={canViewRoleTemplate}
        canUpdateRoleTemplate={canUpdateRoleTemplate}
        selectedRole={selectedRole}
        onRoleChange={setSelectedRole}
        isPermissionLockedForSelectedRole={(permission) => isPermissionLockedForRole(selectedRole, permission)}
        permissionCatalog={permissionCatalog}
        selectedCodes={selectedRolePermissionCodes}
        onToggleCode={handleToggleRolePermission}
        onSave={handleSaveRoleTemplate}
        isLoadingTemplate={roleTemplateQuery.isLoading}
        isSaving={replaceRoleTemplateMutation.isPending}
      />
    </PageShell>
  );
};
