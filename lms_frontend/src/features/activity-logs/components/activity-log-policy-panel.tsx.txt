import React, { useMemo } from 'react';
import { Activity, BookOpenText, ShieldCheck, UserRound, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/session/auth/auth-context';
import { showApiError } from '@/utils/error-handler';
import { useActivityLogPolicies, useUpdateActivityLogPolicy } from '../api/use-activity-logs';
import type { ActivityLogPolicy, ActivityLogType } from '../types';
import { ActivityLogPolicyCategorySection } from './activity-log-policy-category-section';

const CATEGORY_LABELS: Record<ActivityLogType, string> = {
  user: '用户日志',
  content: '内容日志',
  operation: '操作日志',
};

const CATEGORY_ICONS: Record<ActivityLogType, React.ComponentType<{ className?: string }>> = {
  user: UserRound,
  content: BookOpenText,
  operation: Activity,
};

export const ActivityLogPolicyPanel: React.FC = () => {
  const { hasCapability } = useAuth();
  const canUpdatePolicies = hasCapability('activity_log.policy.update');
  const { data: policies = [], isLoading } = useActivityLogPolicies(canUpdatePolicies);
  const { mutateAsync: updatePolicy, isPending: isUpdating } = useUpdateActivityLogPolicy();

  const categorySummaries = useMemo(() => {
    const grouped: Partial<Record<ActivityLogType, Record<string, ActivityLogPolicy[]>>> = {};
    for (const policy of policies) {
      const categoryGroups = grouped[policy.category] ?? (grouped[policy.category] = {});
      const groupPolicies = categoryGroups[policy.group] ?? (categoryGroups[policy.group] = []);
      groupPolicies.push(policy);
    }

    return (['user', 'content', 'operation'] as const).flatMap((category) => {
      const categoryGroups = grouped[category];
      if (!categoryGroups) return [];

      const groups = Object.entries(categoryGroups) as [string, ActivityLogPolicy[]][];
      return [{
        category,
        groups,
      }];
    });
  }, [policies]);

  const handleTogglePolicy = async (policy: ActivityLogPolicy) => {
    try {
      await updatePolicy({ key: policy.key, enabled: !policy.enabled });
      toast.success(`${policy.label} 已${policy.enabled ? '关闭' : '开启'}`);
    } catch (error) {
      showApiError(error, '更新失败');
    }
  };

  if (!canUpdatePolicies) {
    return (
      <div className="flex items-center gap-3 rounded-[22px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
        <ShieldCheck size={18} />
        无权查看日志策略。
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {isLoading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.98))] px-5 py-8 text-sm font-semibold text-text-muted">
          <Zap className="animate-spin duration-1000" size={16} />
          正在同步审计策略架构...
        </div>
      ) : (
        categorySummaries.length > 0 ? (
          <section className="space-y-5">
            {categorySummaries.map((summary) => {
              const Icon = CATEGORY_ICONS[summary.category];

              return (
                <div key={summary.category} className="rounded-[20px] border border-border/70 bg-white px-4 py-5">
                  <div className="mb-4 flex items-center gap-3 px-1">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <h3 className="text-sm font-semibold text-foreground">
                      {CATEGORY_LABELS[summary.category]}
                    </h3>
                  </div>

                  <ActivityLogPolicyCategorySection
                    groups={summary.groups}
                    isUpdating={isUpdating}
                    onTogglePolicy={handleTogglePolicy}
                  />
                </div>
              );
            })}
          </section>
        ) : (
          <div className="rounded-[22px] border border-dashed border-border/60 bg-muted/50 px-6 py-14 text-center">
            <ShieldCheck size={32} className="mx-auto mb-4 text-text-muted/40" />
            <div className="text-sm font-semibold text-text-muted">暂无可配置的日志策略</div>
          </div>
        )
      )}
    </div>
  );
};
