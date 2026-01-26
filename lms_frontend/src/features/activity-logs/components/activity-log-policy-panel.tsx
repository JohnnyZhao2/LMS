import React, { useMemo } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
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
    <ContentPanel padding="md" className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-foreground">
          <SlidersHorizontal className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <div className="text-base font-semibold text-foreground">日志记录白名单</div>
          <div className="text-sm text-text-muted">
            仅开启的动作会被记录到审计日志。建议保留关键动作（登录、删除、评分、提交）。
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-text-muted">正在加载日志策略...</div>
      ) : (
        Object.keys(groupedPolicies).length > 0 ? (
          (['user', 'content', 'operation'] as const)
            .filter((category) => groupedPolicies[category])
            .map((category) => (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {categoryLabels[category]}
                  <Badge variant="secondary">{Object.values(groupedPolicies[category]).flat().length}</Badge>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {Object.entries(groupedPolicies[category]).map(([group, items]) => (
                    <div
                      key={group}
                      className="rounded-lg border border-border bg-background p-4"
                    >
                      <div className="text-sm font-semibold text-foreground">{group}</div>
                      <div className="mt-3 space-y-2">
                        {items.map((policy) => (
                          <label
                            key={policy.key}
                            className="flex items-start justify-between gap-4 text-sm text-foreground"
                          >
                            <div className="space-y-1">
                              <div>{policy.label}</div>
                              <div className="text-xs text-text-muted">{policy.key}</div>
                            </div>
                            <Checkbox
                              checked={policy.enabled}
                              onCheckedChange={() => handleTogglePolicy(policy)}
                              disabled={isUpdating}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
        ) : (
          <div className="text-sm text-text-muted">暂无可配置的日志策略</div>
        )
      )}
    </ContentPanel>
  );
};
