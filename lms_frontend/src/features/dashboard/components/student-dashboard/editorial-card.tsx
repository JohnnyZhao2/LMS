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

      <div className="relative z-10 px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={cn("w-4 h-4 opacity-40", accentColor)} strokeWidth={2.5} />
          <h3 className="font-bold text-muted-foreground/80 uppercase tracking-[0.25em] leading-none text-[11px] truncate group-hover/card:text-foreground transition-colors duration-300">
            {title}
          </h3>
        </div>
        {action}
      </div>

      <div className="relative z-10 px-8 pb-8 pt-2 flex-1 flex flex-col">
        {children}
      </div>
    </Card>
  );
};
