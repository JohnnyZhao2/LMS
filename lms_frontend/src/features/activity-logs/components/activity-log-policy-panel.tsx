import React, { useMemo, useState } from 'react';
import { ShieldCheck, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/stores/auth-context';
import { useActivityLogPolicies, useUpdateActivityLogPolicy } from '../api/use-activity-logs';
import type { ActivityLogPolicy, ActivityLogType } from '../types';
import { ActivityLogPolicyCategorySection } from './activity-log-policy-category-section';
import { UserPermissionModuleSidebar } from '@/features/users/components/user-permission-module-sidebar';

const CATEGORY_LABELS: Record<ActivityLogType, string> = {
  user: '用户日志',
  content: '内容日志',
  operation: '操作日志',
};

export const ActivityLogPolicyPanel: React.FC = () => {
  const { hasCapability } = useAuth();
  const canUpdatePolicies = hasCapability('activity_log.policy.update');
  const { data: policies = [], isLoading } = useActivityLogPolicies(canUpdatePolicies);
  const { mutateAsync: updatePolicy, isPending: isUpdating } = useUpdateActivityLogPolicy();
  const [activeCategory, setActiveCategory] = useState<ActivityLogType | ''>('');

  const {
    categoryModules,
    categoryCounts,
    resolvedActiveCategory,
    activeCategorySummary,
  } = useMemo(() => {
    const grouped: Partial<Record<ActivityLogType, Record<string, ActivityLogPolicy[]>>> = {};
    for (const policy of policies) {
      const categoryGroups = grouped[policy.category] ?? (grouped[policy.category] = {});
      const groupPolicies = categoryGroups[policy.group] ?? (categoryGroups[policy.group] = []);
      groupPolicies.push(policy);
    }

    const categorySummaries = (['user', 'content', 'operation'] as const).flatMap((category) => {
      const categoryGroups = grouped[category];
      if (!categoryGroups) return [];

      const groups = Object.entries(categoryGroups) as [string, ActivityLogPolicy[]][];
      const items = groups.flatMap(([, records]) => records);

      return [{
        category,
        groups,
        total: items.length,
        enabled: items.reduce((count, policy) => count + (policy.enabled ? 1 : 0), 0),
      }];
    });

    const categoryModules = categorySummaries.map(({ category }) => category);
    const categoryCounts = Object.fromEntries(
      categorySummaries.map(({ category, total, enabled }) => [category, { total, enabled }])
    ) as Record<string, { total: number; enabled: number }>;
    const resolvedActiveCategory = activeCategory && categoryModules.includes(activeCategory)
      ? activeCategory
      : categoryModules[0] ?? null;

    return {
      categoryModules,
      categoryCounts,
      resolvedActiveCategory,
      activeCategorySummary:
        categorySummaries.find(({ category }) => category === resolvedActiveCategory) ?? null,
    };
  }, [activeCategory, policies]);

  const handleTogglePolicy = async (policy: ActivityLogPolicy) => {
    try {
      await updatePolicy({ key: policy.key, enabled: !policy.enabled });
      toast.success(`${policy.label} 已${policy.enabled ? '关闭' : '开启'}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新失败';
      toast.error(message);
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
        activeCategorySummary ? (
          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
            <section className="rounded-2xl border border-border/70 bg-white p-3">
              <UserPermissionModuleSidebar
                permissionModules={categoryModules}
                activePermissionModule={resolvedActiveCategory ?? ''}
                moduleCounts={categoryCounts}
                onSelectModule={(moduleName) => setActiveCategory(moduleName as ActivityLogType)}
                getModuleLabel={(moduleName) => CATEGORY_LABELS[moduleName as ActivityLogType] ?? moduleName}
              />
            </section>

            <section className="rounded-2xl border border-border/70 bg-white">
              <div className="px-5 py-4">
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
                  {CATEGORY_LABELS[activeCategorySummary.category]}
                </h3>
              </div>

              <div className="px-5 pb-5">
                <ActivityLogPolicyCategorySection
                  groups={activeCategorySummary.groups}
                  isUpdating={isUpdating}
                  onTogglePolicy={handleTogglePolicy}
                />
              </div>
            </section>
          </div>
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
