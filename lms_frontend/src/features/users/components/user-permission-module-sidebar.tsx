import { getModulePresentation } from '@/features/authorization/constants/permission-presentation';
import { cn } from '@/lib/utils';

interface UserPermissionModuleSidebarProps {
  permissionModules: string[];
  activePermissionModule: string;
  moduleCounts: Record<string, { enabled: number; total: number }>;
  onSelectModule: (moduleName: string) => void;
}

export const UserPermissionModuleSidebar: React.FC<UserPermissionModuleSidebarProps> = ({
  permissionModules,
  activePermissionModule,
  moduleCounts,
  onSelectModule,
}) => (
  <aside className="sticky top-20 space-y-0.5">
    {permissionModules.length === 0 ? (
      <div className="rounded-xl border border-dashed border-border bg-muted px-3 py-4 text-xs text-text-muted">
        暂无模块数据
      </div>
    ) : (
      permissionModules.map((moduleName) => {
        const active = activePermissionModule === moduleName;
        const moduleLabel = getModulePresentation(moduleName).label;
        const moduleCount = moduleCounts[moduleName] ?? { enabled: 0, total: 0 };
        const hasEnabled = moduleCount.enabled > 0;
        return (
          <button
            key={moduleName}
            type="button"
            onClick={() => onSelectModule(moduleName)}
            className={cn(
              'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-all duration-200',
              active
                ? 'bg-primary text-white'
                : 'text-text-muted hover:bg-muted hover:text-foreground',
            )}
          >
            <span className="truncate">{moduleLabel}</span>
            <span
              className={cn(
                'shrink-0 text-[11px] tabular-nums',
                active
                  ? 'text-white/80'
                  : hasEnabled
                    ? 'font-semibold text-primary'
                    : 'text-text-muted',
              )}
            >
              {moduleCount.enabled}/{moduleCount.total}
            </span>
          </button>
        );
      })
    )}
  </aside>
);
