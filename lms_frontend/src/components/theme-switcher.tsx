import { Sun, BookOpen, Zap } from 'lucide-react';
import { useTheme, THEME_OPTIONS } from '@/lib/use-theme';
import type { Theme } from '@/lib/use-theme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const THEME_ICONS: Record<Theme, React.ReactNode> = {
  light: <Sun className="h-4 w-4" />,
  scholar: <BookOpen className="h-4 w-4" />,
  dark: <Zap className="h-4 w-4" />,
};

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="p-2.5 bg-muted rounded-md text-text-muted hover:text-primary hover:bg-primary-50 transition-all duration-200"
          aria-label="切换主题"
        >
          {THEME_ICONS[theme]}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {THEME_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={cn(
              'flex items-center gap-3 cursor-pointer py-2.5',
              theme === option.value && 'bg-primary-50 text-primary'
            )}
          >
            {THEME_ICONS[option.value]}
            <div className="flex flex-col">
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-text-muted">{option.description}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
