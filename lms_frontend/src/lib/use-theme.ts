import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'scholar' | 'dark';

export const THEME_OPTIONS: { value: Theme; label: string; icon: string; description: string }[] = [
  { value: 'light', label: '明亮', icon: 'sun', description: '现代扁平风格' },
  { value: 'scholar', label: '书院', icon: 'book-open', description: '传统典雅风格' },
  { value: 'dark', label: '暗夜', icon: 'zap', description: '赛博朋克风格' },
];

const THEME_STORAGE_KEY = 'lms-theme';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';

  const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (stored && THEME_OPTIONS.some(t => t.value === stored)) {
    return stored;
  }

  // 检测系统偏好
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    const currentIndex = THEME_OPTIONS.findIndex(t => t.value === theme);
    const nextIndex = (currentIndex + 1) % THEME_OPTIONS.length;
    setTheme(THEME_OPTIONS[nextIndex].value);
  }, [theme, setTheme]);

  // 初始化时设置 data-theme 属性
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      // 只有在用户没有手动设置过主题时才跟随系统
      if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [setTheme]);

  return { theme, setTheme, toggleTheme };
}
