import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { cn } from '@/lib/utils';
import type { PermissionCatalogItem } from '@/types/authorization';

interface PermissionToggleCardProps {
  permission?: PermissionCatalogItem;
  title?: string;
  helperText?: string;
  checked: boolean;
  disabled?: boolean;
  isSaving?: boolean;
  onToggle: (nextChecked: boolean) => void | Promise<void>;
}

export const PermissionToggleCard: React.FC<PermissionToggleCardProps> = ({
  permission,
  title,
  helperText,
  checked,
  disabled = false,
  isSaving = false,
  onToggle,
}) => {
  const resolvedTitle = title || permission?.name || '';
  const resolvedHelperText = helperText ?? (
    permission?.constraint_summary || (
      permission?.description && permission.description !== permission.name
        ? permission.description
        : ''
    )
  );

  const handleToggle = () => {
    if (disabled) {
      return;
    }
    onToggle(!checked);
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={checked}
      onClick={handleToggle}
      onKeyDown={(event) => {
        if (disabled) {
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggle(!checked);
        }
      }}
      className={cn(
        'group relative flex min-h-[92px] flex-col gap-3 rounded-[18px] border border-border/70 bg-white p-4 transition-colors duration-200',
        disabled && 'cursor-not-allowed opacity-55 hover:translate-y-0 hover:shadow-none',
        !disabled && 'hover:bg-muted/25',
      )}
    >
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="min-w-0">
            <p className="line-clamp-1 text-sm font-semibold leading-6 text-slate-800">
              {resolvedTitle}
            </p>
          </div>
          <div className="h-5 min-w-0">
            {resolvedHelperText ? (
              <p className="line-clamp-1 text-[12px] leading-5 text-slate-400">
                {resolvedHelperText}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          <ToggleSwitch
            checked={checked}
            disabled={disabled || isSaving}
            onCheckedChange={(nextChecked) => { void onToggle(nextChecked); }}
          />
        </div>
      </div>
    </div>
  );
};
