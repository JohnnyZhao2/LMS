import { Settings } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { ActivityLogPolicyPanel } from '../components/activity-log-policy-panel';

export const ActivityLogPolicyPage: React.FC = () => {
  return (
    <PageShell>
      <PageHeader title="日志策略" icon={<Settings />} />
      <ActivityLogPolicyPanel />
    </PageShell>
  );
};
