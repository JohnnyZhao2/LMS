import { Activity } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { ActivityLogsPanel } from '../components/activity-logs-panel';

export const ActivityLogsPage: React.FC = () => {
  return (
    <div className="space-y-5 pb-10">
      <PageHeader title="日志审计" icon={<Activity />} />
      <ActivityLogsPanel />
    </div>
  );
};
