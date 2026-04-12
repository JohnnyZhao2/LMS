import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { PermissionCatalogItem } from '@/types/authorization';
import type { RoleCode } from '@/types/common';
import { getModulePresentation } from '../constants/permission-presentation';
import { RoleTemplateWorkbench } from './role-template-workbench';

interface RolePermissionTemplatePanelProps {
  canUpdateRoleTemplate: boolean;
  roleCodes: RoleCode[];
  permissionCatalog: PermissionCatalogItem[];
  permissionCodesByRole: Partial<Record<RoleCode, string[]>>;
  onChangeCodes: (roleCode: RoleCode, nextCodes: string[]) => void;
  isLoadingTemplate: boolean;
  savingRoleCodes: RoleCode[];
}

export const RolePermissionTemplatePanel: React.FC<RolePermissionTemplatePanelProps> = ({
  canUpdateRoleTemplate,
  roleCodes,
  permissionCatalog,
  permissionCodesByRole,
  onChangeCodes,
  isLoadingTemplate,
  savingRoleCodes,
}) => {
  const [activeModule, setActiveModule] = useState<string | null>(null);

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, PermissionCatalogItem[]> = {};
    permissionCatalog.forEach((permission) => {
      if (!groups[permission.module]) {
        groups[permission.module] = [];
      }
      groups[permission.module].push(permission);
    });
    return Object.entries(groups)
      .map(([module, permissions]) => ({
        module,
        permissions,
        modulePresentation: getModulePresentation(module),
      }))
      .sort((a, b) => {
        if (a.modulePresentation.order !== b.modulePresentation.order) {
          return a.modulePresentation.order - b.modulePresentation.order;
        }
        return a.modulePresentation.label.localeCompare(b.modulePresentation.label, 'zh-Hans-CN');
      });
  }, [permissionCatalog]);

  const permissionModules = useMemo(
    () => groupedPermissions.map((g) => g.module),
    [groupedPermissions],
  );

  const resolvedActiveModule = useMemo(
    () => (groupedPermissions.some((group) => group.module === activeModule)
      ? activeModule
      : groupedPermissions[0]?.module ?? null),
    [activeModule, groupedPermissions],
  );

  const activeGroup = useMemo(
    () => groupedPermissions.find((g) => g.module === resolvedActiveModule) || groupedPermissions[0],
    [groupedPermissions, resolvedActiveModule],
  );

  return (
    <div className="flex flex-col gap-5">
      {isLoadingTemplate ? (
        <div className="flex items-center justify-center gap-2 rounded-[22px] border border-border/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.98))] px-6 py-16 text-sm text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在加载角色配置...
        </div>
      ) : activeGroup ? (
        <RoleTemplateWorkbench
          permissionModules={permissionModules}
          roleCodes={roleCodes}
          permissionCatalog={permissionCatalog}
          permissionCodesByRole={permissionCodesByRole}
          activeGroup={activeGroup}
          canUpdateRoleTemplate={canUpdateRoleTemplate}
          savingRoleCodes={savingRoleCodes}
          onSelectModule={setActiveModule}
          onToggleCode={onChangeCodes}
        />
      ) : null}
    </div>
  );
};
