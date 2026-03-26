import React, { useMemo } from 'react';
import { SlidersHorizontal, ShieldCheck, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useActivityLogPolicies, useUpdateActivityLogPolicy } from '../api/use-activity-logs';
import type { ActivityLogPolicy } from '../types';

const categoryLabels: Record<ActivityLogPolicy['category'], string> = {
  user: '用户日志',
  content: '内容日志',
  operation: '操作日志',
};

const categoryIcons: Record<ActivityLogPolicy['category'], React.ReactNode> = {
  user: <Zap size={14} />,
  content: <ShieldCheck size={14} />,
  operation: <SlidersHorizontal size={14} />,
};

export const ActivityLogPolicyPanel: React.FC = () => {
  const { hasPermission } = useAuth();
  const canUpdatePolicies = hasPermission('activity_log.policy.update');
  const canViewPolicies = hasPermission('activity_log.view') || canUpdatePolicies;

  const { data: policies = [], isLoading } = useActivityLogPolicies(canViewPolicies);
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

  if (!canViewPolicies) {
    return (
      <div className="p-8 rounded-3xl bg-rose-500/5 border border-rose-500/10 text-rose-600 dark:text-rose-400 text-sm font-bold flex items-center gap-3">
        <ShieldCheck size={18} />
        无权查看日志策略。
      </div>
    );
  }

  if (!canUpdatePolicies) {
    return (
      <div className="p-8 rounded-3xl bg-rose-500/5 border border-rose-500/10 text-rose-600 dark:text-rose-400 text-sm font-bold flex items-center gap-3">
        <ShieldCheck size={18} />
        无权配置日志策略。
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-8">
      {isLoading ? (
        <div className="flex items-center gap-3 text-sm font-bold text-muted-foreground/40 animate-pulse px-2">
          <Zap className="animate-spin duration-1000" size={16} />
          正在同步审计策略架构...
        </div>
      ) : (
        Object.keys(groupedPolicies).length > 0 ? (
          <div className="grid gap-12">
            {(['user', 'content', 'operation'] as const)
              .filter((category) => groupedPolicies[category])
              .map((category) => (
                <div key={category} className="space-y-6">
                  {/* Category Header - Minimalist & Grand */}
                  <div className="flex items-center gap-3 px-1">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-[0_0_10px_rgba(var(--primary),0.1)]">
                      {categoryIcons[category]}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-black text-foreground uppercase tracking-[0.15em] transition-all">
                        {categoryLabels[category]}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground/30 tabular-nums">
                        ({Object.values(groupedPolicies[category]).flat().length})
                      </span>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-border/40 to-transparent" />
                  </div>

                  {/* Groups Grid */}
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                    {Object.entries(groupedPolicies[category]).map(([group, items]) => (
                      <div
                        key={group}
                        className="group flex flex-col rounded-3xl border border-slate-200/60 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 overflow-hidden"
                      >
                        {/* Group Title - Clean & Soft */}
                        <div className="px-6 py-4 border-b border-slate-50/50 bg-slate-50/30">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                            {group}
                          </span>
                        </div>

                        {/* Policies List */}
                        <div className="divide-y divide-slate-50">
                          {items.map((policy) => (
                            <label
                              key={policy.key}
                              className={cn(
                                "flex items-center justify-between gap-4 py-4 px-6 cursor-pointer transition-all duration-300",
                                "hover:bg-slate-50/50",
                                !policy.enabled && "opacity-60"
                              )}
                            >
                              <div className="space-y-1">
                                <div className={cn(
                                  "text-[13px] font-bold tracking-tight transition-colors",
                                  policy.enabled ? "text-slate-700" : "text-slate-400"
                                )}>
                                  {policy.label}
                                </div>
                                <div className="text-[9px] font-medium text-slate-300 uppercase tracking-wider font-mono">
                                  {policy.key}
                                </div>
                              </div>

                              {/* Professional iOS-style Switch */}
                              <div
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (!isUpdating) handleTogglePolicy(policy);
                                }}
                                className={cn(
                                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-all duration-500 ease-in-out outline-none ring-offset-background",
                                  policy.enabled ? "bg-primary" : "bg-slate-200",
                                  isUpdating && "opacity-50 cursor-not-allowed"
                                )}
                              >
                                <span
                                  className={cn(
                                    "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform duration-500 ease-in-out",
                                    policy.enabled ? "translate-x-[1.15rem]" : "translate-x-0.5"
                                  )}
                                />
                                {policy.enabled && (
                                  <div className="absolute inset-0 rounded-full bg-primary/20 blur-md scale-110 pointer-events-none animate-pulse" />
                                )}
                              </div>
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
          <div className="p-12 text-center rounded-3xl border border-dashed border-border/40 bg-muted/5">
            <ShieldCheck size={32} className="mx-auto text-muted-foreground/20 mb-4" />
            <div className="text-sm font-bold text-muted-foreground/40">暂无可配置的日志策略</div>
          </div>
        )
      )}
    </div>
  );
};
