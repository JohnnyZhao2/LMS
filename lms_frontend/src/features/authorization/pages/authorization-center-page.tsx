import { useMemo, useState } from 'react';
import { Layers3 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { showApiError } from '@/utils/error-handler';
import type { RoleCode } from '@/types/api';
import {
  usePermissionCatalog,
  useReplaceRolePermissionTemplate,
  useRolePermissionTemplates,
} from '../api/authorization';
import { isPermissionLockedForRole } from '../constants/permission-constraints';
import { ROLE_TEMPLATE_ORDER } from '../constants/role-template';
import { RolePermissionTemplatePanel } from '../components/role-permission-template-panel';

export const AuthorizationCenterPage: React.FC = () => {
  const { hasCapability, refreshUser } = useAuth();
  const canViewRoleTemplate = hasCapability('authorization.role_template.view') || hasCapability('authorization.role_template.update');
  const canUpdateRoleTemplate = hasCapability('authorization.role_template.update');

  const [draftPermissionCodes, setDraftPermissionCodes] = useState<Partial<Record<RoleCode, string[]>>>({});
  const [savingRoleCodes, setSavingRoleCodes] = useState<RoleCode[]>([]);
  const shouldLoadData = canViewRoleTemplate;

  const { data: rawPermissionCatalog = [] } = usePermissionCatalog(undefined, shouldLoadData);
  const permissionCatalog = useMemo(
    () => rawPermissionCatalog.filter((permission) => permission.role_template_visible),
    [rawPermissionCatalog],
  );
  const permissionByCode = useMemo(() => {
    const permissionMap = new Map<string, { module: string }>();
    permissionCatalog.forEach((permission) => {
      permissionMap.set(permission.code, { module: permission.module });
    });
    return permissionMap;
  }, [permissionCatalog]);
  const roleTemplateQueries = useRolePermissionTemplates(ROLE_TEMPLATE_ORDER, canViewRoleTemplate);
  const permissionCodesByRole = useMemo(
    () => Object.fromEntries(
      ROLE_TEMPLATE_ORDER.map((roleCode, index) => [
        roleCode,
        draftPermissionCodes[roleCode] ?? roleTemplateQueries[index]?.data?.permission_codes ?? [],
      ]),
    ) as Partial<Record<RoleCode, string[]>>,
    [draftPermissionCodes, roleTemplateQueries],
  );
  const isLoadingTemplates = roleTemplateQueries.some((query) => query.isLoading);
  const replaceRoleTemplateMutation = useReplaceRolePermissionTemplate();

  const handleChangeRoleTemplate = async (roleCode: RoleCode, nextCodes: string[]) => {
    if (!canUpdateRoleTemplate) return;

    const previousCodes = permissionCodesByRole[roleCode] ?? [];
    const normalizedNextCodes = Array.from(new Set(nextCodes)).sort();
    if (previousCodes.join('|') === normalizedNextCodes.join('|')) {
      return;
    }

    const hasLockedPermissionChange = normalizedNextCodes.some((permissionCode) => {
      const permission = permissionByCode.get(permissionCode);
      return permission ? isPermissionLockedForRole(roleCode, permission) : false;
    });
    if (hasLockedPermissionChange) {
      return;
    }

    setDraftPermissionCodes((previousDrafts) => ({
      ...previousDrafts,
      [roleCode]: normalizedNextCodes,
    }));
    setSavingRoleCodes((previous) => (previous.includes(roleCode) ? previous : [...previous, roleCode]));

    try {
      await replaceRoleTemplateMutation.mutateAsync({
        roleCode,
        permissionCodes: normalizedNextCodes,
      });
      await refreshUser();
    } catch (error) {
      setDraftPermissionCodes((previousDrafts) => ({
        ...previousDrafts,
        [roleCode]: previousCodes,
      }));
      showApiError(error);
    } finally {
      setSavingRoleCodes((previous) => previous.filter((code) => code !== roleCode));
    }
  };

  if (!canViewRoleTemplate) {
    return (
      <PageShell>
        <PageHeader title="角色模板配置" icon={<Layers3 />} />
        <div className="rounded-xl border border-border bg-muted p-8 text-sm text-text-muted">
          当前账号没有角色模板配置权限，请联系管理员开通。
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader title="角色模板配置" icon={<Layers3 />} />

      <RolePermissionTemplatePanel
        canUpdateRoleTemplate={canUpdateRoleTemplate}
        roleCodes={ROLE_TEMPLATE_ORDER}
        permissionCatalog={permissionCatalog}
        permissionCodesByRole={permissionCodesByRole}
        onChangeCodes={handleChangeRoleTemplate}
        isLoadingTemplate={isLoadingTemplates}
        savingRoleCodes={savingRoleCodes}
      />
    </PageShell>
  );
};
