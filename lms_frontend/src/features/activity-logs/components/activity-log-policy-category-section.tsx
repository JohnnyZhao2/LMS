import React from 'react';
import { cn } from '@/lib/utils';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import type { ActivityLogPolicy } from '../types';

const PolicyToggle: React.FC<{
  policy: ActivityLogPolicy;
  disabled: boolean;
  onToggle: (policy: ActivityLogPolicy) => void;
}> = ({ policy, disabled, onToggle }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onToggle(policy)}
    className={cn(
      'group flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors',
      disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-muted/55',
    )}
  >
    <div className="min-w-0">
      <span className={cn('text-sm font-medium', policy.enabled ? 'text-foreground' : 'text-text-muted')}>
        {policy.label}
      </span>
    </div>

    <ToggleSwitch checked={policy.enabled} disabled={disabled} onCheckedChange={() => onToggle(policy)} />
  </button>
);

interface ActivityLogPolicyCategorySectionProps {
  groups: [string, ActivityLogPolicy[]][];
  isUpdating: boolean;
  onTogglePolicy: (policy: ActivityLogPolicy) => void;
}

export const ActivityLogPolicyCategorySection: React.FC<ActivityLogPolicyCategorySectionProps> = ({
  groups,
  isUpdating,
  onTogglePolicy,
}) => (
  <div className="space-y-6">
    {groups.map(([group, items], index) => (
      <section
        key={group}
        className={cn(index > 0 && 'border-t border-border/60 pt-6')}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-foreground">{group}</div>
          <div className="text-[12px] text-text-muted">
            {items.filter((policy) => policy.enabled).length}/{items.length}
          </div>
        </div>

        <div className="overflow-hidden rounded-[18px] border border-border/70 bg-muted/[0.28]">
          {items.map((policy, itemIndex) => (
            <div key={policy.key} className={cn(itemIndex > 0 && 'border-t border-border/60')}>
              <PolicyToggle
                policy={policy}
                disabled={isUpdating}
                onToggle={onTogglePolicy}
              />
            </div>
          ))}
        </div>
      </section>
    ))}
  </div>
);
