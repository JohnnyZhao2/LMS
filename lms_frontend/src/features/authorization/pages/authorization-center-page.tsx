import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageFillShell, PageWorkbench } from '@/components/ui/page-shell';
import { useAuth } from '@/session/auth/auth-context';
import { showApiError } from '@/utils/error-handler';
import type { RoleCode } from '@/types/common';
import { ROLE_ORDER } from '@/config/role-constants';
import {
  useReplaceRolePermissionTemplate,
  useRolePermissionTemplates,
  usePermissionCatalog,
} from '@/entities/authorization/api/authorization';
import {
  AUTHORIZATION_WORKBENCH_ACCESS_PERMISSIONS,
  ROLE_PERMISSION_TEMPLATE_ACCESS_PERMISSIONS,
  ROLE_PERMISSION_TEMPLATE_UPDATE_PERMISSION,
} from '@/entities/authorization/constants/access';
import { RolePermissionTemplatePanel } from '../components/role-permission-template-panel';

const ROLE_TEMPLATE_ORDER = ROLE_ORDER.filter((roleCode) => roleCode !== 'SUPER_ADMIN');

export const AuthorizationCenterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { hasCapability, refreshUser } = useAuth();
  const canAccessWorkbench = AUTHORIZATION_WORKBENCH_ACCESS_PERMISSIONS.some(hasCapability);
  const canViewRoleTemplate = ROLE_PERMISSION_TEMPLATE_ACCESS_PERMISSIONS.some(hasCapability);
  const canUpdateRoleTemplate = hasCapability(ROLE_PERMISSION_TEMPLATE_UPDATE_PERMISSION);
  const initialRoleCode = searchParams.get('role_code');
  const initialUserIdParam = searchParams.get('user_id');
  const initialSelectedRole = ROLE_TEMPLATE_ORDER.includes(initialRoleCode as (typeof ROLE_TEMPLATE_ORDER)[number])
    ? (initialRoleCode as (typeof ROLE_TEMPLATE_ORDER)[number])
    : null;
  const initialSelectedUserId = initialUserIdParam ? Number(initialUserIdParam) : null;

  const [savingRoleCodes, setSavingRoleCodes] = useState<RoleCode[]>([]);
  const shouldLoadData = canAccessWorkbench;

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

  const handleChangeRoleTemplate = async (
    roleCode: RoleCode,
    nextCodes: string[],
  ) => {
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
        <RolePermissionTemplatePanel
          canViewRoleTemplate={canViewRoleTemplate}
          canUpdateRoleTemplate={canUpdateRoleTemplate}
          roleCodes={ROLE_TEMPLATE_ORDER}
          permissionCatalog={permissionCatalog}
          permissionCodesByRole={permissionCodesByRole}
          onChangeCodes={handleChangeRoleTemplate}
          isLoadingTemplate={isLoadingTemplates}
          savingRoleCodes={savingRoleCodes}
          initialRoleCode={initialSelectedRole}
          initialSelectedUserId={initialSelectedUserId}
        />
      </PageWorkbench>
    </PageFillShell>
  );
};
