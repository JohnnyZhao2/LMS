import { useMemo, useState } from 'react';
import { Layers3 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { useAuth } from '@/features/auth/stores/auth-context';
import { showApiError } from '@/utils/error-handler';
import type { RoleCode } from '@/types/common';
import { ROLE_ORDER } from '@/config/role-constants';
import {
  useReplaceRolePermissionTemplate,
  useRolePermissionTemplates,
  usePermissionCatalog,
} from '../api/authorization';
import { RolePermissionTemplatePanel } from '../components/role-permission-template-panel';

const ROLE_TEMPLATE_ORDER = ROLE_ORDER.filter((roleCode) => roleCode !== 'SUPER_ADMIN');

export const AuthorizationCenterPage: React.FC = () => {
  const { hasCapability, refreshUser } = useAuth();
  const canViewRoleTemplate = hasCapability('authorization.role_template.view') || hasCapability('authorization.role_template.update');
  const canUpdateRoleTemplate = hasCapability('authorization.role_template.update');

  const [savingRoleCodes, setSavingRoleCodes] = useState<RoleCode[]>([]);
  const shouldLoadData = canViewRoleTemplate;

  const { data: permissionCatalog = [] } = usePermissionCatalog({ view: 'role_template' }, shouldLoadData);
  const roleTemplateQueries = useRolePermissionTemplates(ROLE_TEMPLATE_ORDER, canViewRoleTemplate);
  const permissionCodesByRole = useMemo(
    () => Object.fromEntries(
      ROLE_TEMPLATE_ORDER.map((roleCode, index) => [
        roleCode,
        roleTemplateQueries[index]?.data?.permission_codes ?? [],
      ]),
    ) as Partial<Record<RoleCode, string[]>>,
    [roleTemplateQueries],
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

    setSavingRoleCodes((previous) => (previous.includes(roleCode) ? previous : [...previous, roleCode]));

    try {
      await replaceRoleTemplateMutation.mutateAsync({
        roleCode,
        permissionCodes: normalizedNextCodes,
      });
      const roleIndex = ROLE_TEMPLATE_ORDER.indexOf(roleCode as (typeof ROLE_TEMPLATE_ORDER)[number]);
      await Promise.all([
        refreshUser(),
        roleIndex >= 0 ? roleTemplateQueries[roleIndex]?.refetch() : Promise.resolve(),
      ]);
    } catch (error) {
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
