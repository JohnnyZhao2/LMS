import { Settings, ShieldCheck } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { ROUTES } from '@/config/routes';
import { ActivityLogPolicyPanel } from '../components/activity-log-policy-panel';

export const ActivityLogPolicyPage: React.FC = () => {
  const { role } = useParams<{ role: string }>();
  const auditLogsPath = role ? `/${role}${ROUTES.AUDIT_LOGS}` : ROUTES.AUDIT_LOGS;

  return (
    <PageShell>
      <PageHeader
        title="日志策略"
        icon={<Settings />}
        breadcrumbs={[
          { title: '日志审计', path: auditLogsPath },
          { title: '日志策略' },
        ]}
      />

      <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm">
        <div className="border-b border-border/30 bg-background px-6 py-5 backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-foreground">审计策略配置</h2>
              <p className="text-sm text-text-muted">
                精细化控制系统日志的记录范围，直接在页面内完成配置。
              </p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <ActivityLogPolicyPanel />
        </div>
      </section>
    </PageShell>
  );
};
