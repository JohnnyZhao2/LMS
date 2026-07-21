import { AlertTriangle, RotateCcw } from 'lucide-react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

import { Button } from '@/components/ui/button';

const getRouteErrorMessage = (error: unknown) => {
  if (isRouteErrorResponse(error)) {
    return error.statusText || `请求失败（${error.status}）`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '页面发生未知异常';
};

export const RouteErrorPage: React.FC = () => {
  const error = useRouteError();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <section className="flex max-w-md flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive-100 text-destructive-700">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">页面加载失败</h1>
        <p className="mt-2 text-sm text-text-muted">{getRouteErrorMessage(error)}</p>
        <Button className="mt-6" onClick={() => window.location.reload()}>
          <RotateCcw className="mr-2 h-4 w-4" />
          重新加载
        </Button>
      </section>
    </main>
  );
};
