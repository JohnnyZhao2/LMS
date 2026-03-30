import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PermissionCatalogItem } from '@/types/api';

interface RolePermissionCardProps {
  permission: PermissionCatalogItem;
  detail: string;
  constraintSummary?: string;
  checked: boolean;
  disabled: boolean;
  onToggle: (checked: boolean) => void;
}

export const RolePermissionCard: React.FC<RolePermissionCardProps> = ({
  permission,
  detail,
  constraintSummary,
  checked,
  disabled,
  onToggle,
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onToggle(!checked)}
    className={cn(
      'group relative flex items-start gap-3 rounded-lg border px-4 py-3.5 text-left transition-all duration-200',
      checked
        ? 'border-primary/25 bg-primary-50/60'
        : 'border-border bg-background hover:border-gray-300',
      disabled && 'cursor-not-allowed opacity-50',
    )}
  >
    {/* 状态指示器 */}
    <div
      className={cn(
        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200',
        checked
          ? 'border-primary bg-primary text-white'
          : 'border-gray-300 bg-background group-hover:border-gray-400',
      )}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
    </div>

    {/* 内容 */}
    <div className="min-w-0 flex-1 space-y-0.5">
      <p
        className={cn(
          'text-[13px] font-semibold leading-snug transition-colors',
          checked ? 'text-primary-700' : 'text-foreground',
        )}
      >
        {permission.name}
      </p>
      <p className="text-[11px] leading-relaxed text-text-muted line-clamp-2">
        {detail}
      </p>
      {constraintSummary ? (
        <p className="text-[11px] leading-relaxed text-amber-700/90">
          生效约束：{constraintSummary}
        </p>
      ) : null}
    </div>
  </button>
);
