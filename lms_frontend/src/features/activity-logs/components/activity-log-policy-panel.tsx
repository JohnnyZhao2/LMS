import React, { useMemo } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { ContentPanel } from '@/components/ui';
import { useAuth } from '@/features/auth/stores/auth-context';
import { useActivityLogPolicies, useUpdateActivityLogPolicy } from '../api/use-activity-logs';
import type { ActivityLogPolicy } from '../types';

const categoryLabels: Record<ActivityLogPolicy['category'], string> = {
  user: '用户日志',
  content: '内容日志',
  operation: '操作日志',
};

export const ActivityLogPolicyPanel: React.FC = () => {
  const { user } = useAuth();
  const isSuperuser = Boolean(user?.is_superuser);

  const { data: policies = [], isLoading } = useActivityLogPolicies(isSuperuser);
  const { mutateAsync: updatePolicy, isPending: isUpdating } = useUpdateActivityLogPolicy();

  const groupedPolicies = useMemo(() => {
    const grouped: Record<string, Record<string, ActivityLogPolicy[]>> = {};
    for (const policy of policies) {
      if (!grouped[policy.category]) {
        grouped[policy.category] = {};
      }
      if (!grouped[policy.category][policy.group]) {
        grouped[policy.category][policy.group] = [];
      }
      grouped[policy.category][policy.group].push(policy);
    }
    return grouped;
  }, [policies]);

  const handleTogglePolicy = async (policy: ActivityLogPolicy) => {
    try {
      await updatePolicy({ key: policy.key, enabled: !policy.enabled });
      toast.success(`${policy.label} 已${policy.enabled ? '关闭' : '开启'}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新失败';
      toast.error(message);
    }
  };

  if (!isSuperuser) {
    return (
      <ContentPanel padding="md">
        <div className="text-sm text-text-muted">仅超级用户可配置日志白名单。</div>
      </ContentPanel>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title Area (Outside) */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between px-0.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">日志记录白名单</h2>
            <p className="text-[12px] text-text-muted font-medium opacity-80">配置哪些操作将被记录到系统审计日志中</p>
          </div>
        </div>
      </div>

      <ContentPanel padding="md" className="space-y-8">
        {isLoading ? (
          <div className="text-sm text-text-muted px-1">正在加载日志策略...</div>
        ) : (
          Object.keys(groupedPolicies).length > 0 ? (
            <div className="space-y-10">
              {(['user', 'content', 'operation'] as const)
                .filter((category) => groupedPolicies[category])
                .map((category) => (
                  <div key={category} className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-sm font-bold text-foreground/80">{categoryLabels[category]}</span>
                      <span className="text-[10px] font-medium text-text-muted bg-muted px-1.5 py-0.5 rounded-full">
                        {Object.values(groupedPolicies[category]).flat().length}
                      </span>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      {Object.entries(groupedPolicies[category]).map(([group, items]) => (
                        <div
                          key={group}
                          className="overflow-hidden rounded-xl border border-border/50 bg-background shadow-sm shadow-black/5"
                        >
                          <div className="bg-muted/30 px-4 py-2 border-b border-border/40">
                            <span className="text-[13px] font-bold text-foreground/70">{group}</span>
                          </div>
                          <div className="divide-y divide-border/30">
                            {items.map((policy) => (
                              <label
                                key={policy.key}
                                className="group flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/20 cursor-pointer"
                              >
                                <div className="space-y-0.5">
                                  <div className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">{policy.label}</div>
                                  <div className="text-[11px] text-text-muted/60 font-mono">{policy.key}</div>
                                </div>
                                <Checkbox
                                  checked={policy.enabled}
                                  onCheckedChange={() => handleTogglePolicy(policy)}
                                  disabled={isUpdating}
                                  className="h-4 w-4"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-sm text-text-muted">暂无可配置的日志策略</div>
          )
        )}
      </ContentPanel>
    </div>
  );
};
