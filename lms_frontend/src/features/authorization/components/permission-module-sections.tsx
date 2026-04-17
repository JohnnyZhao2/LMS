import type { ReactNode } from 'react';
import { getModulePresentation } from '@/features/authorization/constants/permission-presentation';
import type { PermissionCatalogItem } from '@/types/authorization';

interface PermissionModuleSectionItem {
  module: string;
  permissions: PermissionCatalogItem[];
  sectionAction?: ReactNode;
}

interface PermissionModuleSectionsProps {
  sections: PermissionModuleSectionItem[];
  renderPermissionCard: (permission: PermissionCatalogItem) => ReactNode;
  emptyText?: string;
}

export const PermissionModuleSections: React.FC<PermissionModuleSectionsProps> = ({
  sections,
  renderPermissionCard,
  emptyText = '当前模块暂无可配置权限',
}) => {
  if (sections.length === 0) {
    return (
      <div className="py-12 text-center text-sm font-medium text-slate-400">
        暂无模块数据
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {sections.map((section) => {
        const modulePresentation = getModulePresentation(section.module);

        return (
          <section
            key={section.module}
            className="border-b border-border/60 pb-8 last:border-b-0 last:pb-0"
          >
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {modulePresentation.label}
                </h3>
              </div>
              {section.sectionAction ? (
                <div className="w-full lg:w-auto">
                  {section.sectionAction}
                </div>
              ) : null}
            </div>

            {section.permissions.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {section.permissions.map((permission) => renderPermissionCard(permission))}
              </div>
            ) : (
              <div className="py-12 text-center text-sm font-medium text-slate-400">
                {emptyText}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};
