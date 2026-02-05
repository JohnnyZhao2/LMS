import { useTheme, THEME_OPTIONS } from '@/lib/use-theme';
import type { Theme } from '@/lib/use-theme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Minimal 图标
const IconSun = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="10" cy="10" r="3" />
    <path d="M10 3v2M10 15v2M3 10h2M15 10h2M5.64 5.64l1.41 1.41M12.95 12.95l1.41 1.41M5.64 14.36l1.41-1.41M12.95 7.05l1.41-1.41" />
  </svg>
);

const IconScholar = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 16V4.5A1.5 1.5 0 0 1 4.5 3H16v14H4.5A1.5 1.5 0 0 1 3 15.5V16z" />
    <path d="M3 15.5A1.5 1.5 0 0 1 4.5 14H16" />
  </svg>
);

const IconCyber = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M10 2l-8 4 8 4 8-4-8-4z" />
    <path d="M2 14l8 4 8-4" />
    <path d="M2 10l8 4 8-4" />
  </svg>
);

const THEME_ICONS: Record<Theme, React.ReactNode> = {
  light: <IconSun className="w-4 h-4" />,
  scholar: <IconScholar className="w-4 h-4" />,
  dark: <IconCyber className="w-4 h-4" />,
};

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="w-8 h-8 flex items-center justify-center rounded-md text-text-muted hover:text-foreground hover:bg-muted transition-colors"
          aria-label="切换主题"
        >
          {THEME_ICONS[theme]}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px] p-1">
        {THEME_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={cn(
              'flex items-center gap-2 cursor-pointer py-2 px-2 rounded-md text-sm',
              theme === option.value && 'bg-muted'
            )}
          >
            <span className={cn(
              theme === option.value ? "text-primary" : "text-text-muted"
            )}>
              {THEME_ICONS[option.value]}
            </span>
            <span>{option.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
