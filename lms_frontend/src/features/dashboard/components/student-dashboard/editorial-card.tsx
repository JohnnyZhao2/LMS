import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EditorialCardProps {
  children: React.ReactNode;
  className?: string;
}

export const EditorialCard: React.FC<EditorialCardProps> = ({
  children,
  className,
}) => {
  return (
    <Card className={cn(
      "relative overflow-hidden border-border/50 bg-card transition-all duration-500 group/card flex flex-col",
      "hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)] hover:border-primary/20",
      className
    )}>
      <div className="absolute inset-0 opacity-[0.4] mix-blend-soft-light pointer-events-none z-0 bg-[image:var(--noise-texture)] brightness-100 contrast-150" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 py-5 xl:px-6 xl:py-6">
        {children}
      </div>
    </Card>
  );
};
