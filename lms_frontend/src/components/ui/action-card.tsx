import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { cn } from '@/lib/utils';
import { ArrowUpRight } from 'lucide-react';

interface ActionCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  route?: string;
  onClick?: () => void;
  /** Theme color for the card accent (e.g. 'indigo', 'rose') */
  actionColor?: string;
  className?: string;
  delay?: string;
}

/**
 * ActionCard - "The Sibling" Design
 * Designed to have 100% visual unity with StatCard.
 * Uses the same noise texture, layout logic, and typography.
 */
export const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  icon: Icon,
  route,
  onClick,
  actionColor = 'indigo',
  className,
  delay = '',
}) => {
  const { roleNavigate } = useRoleNavigate();

  const handleClick = () => {
    if (route) {
      roleNavigate(route);
    } else if (onClick) {
      onClick();
    }
  };

  // Color Logic: Maps semantic names to Tailwind classes (matching StatCard's expectations)
  // We map 'actionColor' to 'text-' and 'bg-' classes to replicate StatCard's accent logic.
  const getThemeClasses = (color: string) => {
    const map: Record<string, { text: string; bg: string }> = {
      indigo: { text: 'text-indigo-500', bg: 'bg-indigo-500' },
      emerald: { text: 'text-emerald-500', bg: 'bg-emerald-500' },
      rose: { text: 'text-rose-500', bg: 'bg-rose-500' },
      amber: { text: 'text-amber-500', bg: 'bg-amber-500' },
      cyan: { text: 'text-cyan-500', bg: 'bg-cyan-500' },
      purple: { text: 'text-purple-500', bg: 'bg-purple-500' },
    };
    return map[color] || map.indigo;
  };

  const theme = getThemeClasses(actionColor);

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative overflow-hidden bg-card border border-border/50 rounded-xl",
        "cursor-pointer transition-all duration-500 ease-out",
        "hover:shadow-[0_12px_40px_rgb(0,0,0,0.04)]", // StatCard Shadow
        "hover:border-primary/20 hover:-translate-y-1",
        delay,
        "animate-fadeInUp opacity-0 translate-y-4 fill-mode-forwards",
        // Ensure nice height for content
        "h-28",
        className
      )}
    >
      {/* Subtle Noise Texture - Exact match to StatCard */}
      <div className="absolute inset-0 opacity-[0.4] mix-blend-soft-light pointer-events-none z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150" />

      <div className="flex h-full relative z-10">
        {/* Content Zone (Left) */}
        <div className="flex-1 flex flex-col justify-between py-5 px-6 relative z-10 min-w-0">

          {/* Header: LED + Description */}
          <div className="flex items-center gap-3">
            {/* Glowing LED Indicator */}
            <div className={cn(
              "w-1 h-3 rounded-full transition-all duration-500 ease-out group-hover:h-5",
              theme.bg, // Uses the solid background color
              "shadow-[0_0_12px_rgba(0,0,0,0.3)] dark:shadow-[0_0_15px_rgba(255,255,255,0.2)]"
            )} />

            {/* Description acts as the 'Label' */}
            <p className="font-semibold text-muted-foreground/80 uppercase tracking-widest leading-none text-[10px] truncate group-hover:text-foreground transition-colors duration-300">
              {description || "ACTION"}
            </p>
          </div>

          {/* Main Title (The Hero) */}
          <div className="flex items-center gap-2 mt-auto transform transition-transform duration-500 group-hover:translate-x-0.5">
            <h3 className="font-bold text-foreground text-xl md:text-2xl leading-none tracking-tight truncate pr-2"
              style={{ fontFamily: "'Outfit', sans-serif" }}>
              {title}
            </h3>

            {/* Slide-in Arrow */}
            <ArrowUpRight className={cn(
              "w-5 h-5 opacity-0 -translate-x-2 transition-all duration-300",
              "group-hover:opacity-100 group-hover:translate-x-0",
              theme.text // Tint the arrow
            )} />
          </div>
        </div>

        {/* Right Visual Zone: The Watermark Icon */}
        <div className="relative h-full flex items-center justify-center overflow-hidden w-24 shrink-0 pointer-events-none">
          <div className={cn(
            "absolute -right-5 -bottom-5 w-24 h-24 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] origin-bottom-right",
            "group-hover:scale-110 group-hover:-rotate-6 group-hover:-translate-y-2"
          )}>
            <Icon
              className={cn(
                "w-full h-full",
                theme.text, // Tint the icon lines
                "opacity-[0.12] group-hover:opacity-[0.2]",
                "dark:opacity-[0.15] dark:group-hover:opacity-[0.25]"
              )}
              strokeWidth={0.5}
            />
          </div>
          {/* Linear fade edge for specific masking effect */}
          <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-card to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
