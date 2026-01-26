import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { ActivityLogPolicyPanel } from '../components/activity-log-policy-panel';

export const ActivityLogSettingsPage: React.FC = () => {
  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="日志设置"
        subtitle="配置动作级白名单，决定哪些行为会被记录。"
        icon={<ShieldCheck />}
      />
      <ActivityLogPolicyPanel />
    </div>
  );
};
