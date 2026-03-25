import { Activity } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { ActivityLogsPanel } from '../components/activity-logs-panel';

export const ActivityLogsPage: React.FC = () => {
  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="审计日志" icon={<Activity />} />
      <ActivityLogsPanel />
    </div>
  );
};
