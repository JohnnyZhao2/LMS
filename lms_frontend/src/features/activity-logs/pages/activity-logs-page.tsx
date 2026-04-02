import { Activity } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { PageFillShell } from '@/components/ui/page-shell';
import { ActivityLogsPanel } from '../components/activity-logs-panel';

export const ActivityLogsPage: React.FC = () => {
  return (
    <PageFillShell>
      <PageHeader title="日志审计" icon={<Activity />} />
      <ActivityLogsPanel />
    </PageFillShell>
  );
};
