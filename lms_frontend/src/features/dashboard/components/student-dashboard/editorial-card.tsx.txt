import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EditorialCardProps {
  title: string;
  icon: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
}

export const EditorialCard: React.FC<EditorialCardProps> = ({
  title,
  icon: Icon,
  action,
  children,
  className,
  accentColor = "text-primary"
}) => {
  return (
    <Card className={cn(
      "relative overflow-hidden border-border/50 bg-card transition-all duration-500 group/card flex flex-col",
      "hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)] hover:border-primary/20",
      className
    )}>
      <div className="absolute inset-0 opacity-[0.4] mix-blend-soft-light pointer-events-none z-0 bg-[image:var(--noise-texture)] brightness-100 contrast-150" />

      <div className="relative z-10 flex items-center justify-between px-5 py-4 xl:px-6">
        <div className="flex items-center gap-2.5">
          <Icon className={cn("h-3.5 w-3.5 opacity-40", accentColor)} strokeWidth={2.5} />
          <h3 className="truncate text-[10px] font-bold leading-none tracking-[0.24em] text-muted-foreground/80 uppercase transition-colors duration-300 group-hover/card:text-foreground">
            {title}
          </h3>
        </div>
        {action}
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-5 pt-0 xl:px-6 xl:pb-6">
        {children}
      </div>
    </Card>
  );
};
