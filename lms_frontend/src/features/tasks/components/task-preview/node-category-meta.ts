import {
  BookOpen,
  ClipboardList,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import type { TaskNodeCategory } from '@/types/task-analytics';

export const NODE_CATEGORY_META: Record<TaskNodeCategory, {
  icon: LucideIcon;
  label: string;
  textClass: string;
  bgClass: string;
}> = {
  KNOWLEDGE: {
    icon: BookOpen,
    label: '学习资料',
    textClass: 'text-secondary',
    bgClass: 'bg-secondary-50',
  },
  PRACTICE: {
    icon: ClipboardList,
    label: '测验',
    textClass: 'text-primary',
    bgClass: 'bg-primary-50',
  },
  EXAM: {
    icon: Trophy,
    label: '考试',
    textClass: 'text-destructive',
    bgClass: 'bg-destructive-50',
  },
};
