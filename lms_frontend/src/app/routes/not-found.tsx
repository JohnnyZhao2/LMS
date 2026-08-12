import { useNavigate } from 'react-router-dom';
import { Ghost } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-background p-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 -rotate-3 items-center justify-center rounded-lg bg-muted text-text-muted">
          <Ghost className="h-8 w-8" />
        </div>
        <h1 className="mb-2 text-xl font-bold tracking-tight text-foreground">页面不存在</h1>
        <p className="mb-8 text-sm leading-relaxed text-text-muted">链接无效或页面已被移除。</p>
        <Button variant="outline" className="w-full" onClick={() => navigate(ROUTES.DASHBOARD)}>
          返回概览
        </Button>
      </div>
    </div>
  );
};
