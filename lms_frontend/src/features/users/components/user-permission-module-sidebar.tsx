import { getModulePresentation } from '@/features/authorization/constants/permission-presentation';
import { cn } from '@/lib/utils';

interface UserPermissionModuleSidebarProps {
  permissionModules: string[];
  activePermissionModule: string;
  moduleCounts?: Record<string, { enabled: number; total: number }>;
  onSelectModule: (moduleName: string) => void;
  getModuleLabel?: (moduleName: string) => string;
  showCounts?: boolean;
}

export const UserPermissionModuleSidebar: React.FC<UserPermissionModuleSidebarProps> = ({
  permissionModules,
  activePermissionModule,
  moduleCounts = {},
  onSelectModule,
  getModuleLabel,
  showCounts = true,
}) => (
  <aside className="sticky top-20 space-y-1.5">
    {permissionModules.length === 0 ? (
      <div className="rounded-xl border border-dashed border-border bg-muted px-3 py-4 text-xs text-text-muted">
        暂无模块数据
      </div>
    ) : (
      permissionModules.map((moduleName) => {
        const active = activePermissionModule === moduleName;
        const moduleLabel = getModuleLabel?.(moduleName) ?? getModulePresentation(moduleName).label;
        const moduleCount = moduleCounts[moduleName] ?? { enabled: 0, total: 0 };
        const hasEnabled = moduleCount.enabled > 0;
        return (
          <button
            key={moduleName}
            type="button"
            onClick={() => onSelectModule(moduleName)}
            className={cn(
              'flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-colors duration-200',
              active
                ? 'bg-primary-50/85 text-foreground'
                : 'text-text-muted hover:bg-muted/55 hover:text-foreground',
            )}
          >
            <span className={cn('truncate text-sm font-medium', active && 'font-semibold')}>
              {moduleLabel}
            </span>
            {showCounts ? (
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[11px] tabular-nums',
                  active
                    ? 'bg-white font-semibold text-primary shadow-[inset_0_0_0_1px_rgba(59,130,246,0.08)]'
                    : hasEnabled
                      ? 'bg-primary-50/70 font-semibold text-primary'
                      : 'bg-muted text-text-muted',
                )}
              >
                {moduleCount.enabled}/{moduleCount.total}
              </span>
            ) : null}
          </button>
        );
      })
    )}
  </aside>
);
