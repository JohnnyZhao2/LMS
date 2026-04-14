import { getQuestionTypePresentation } from '@/features/questions/constants';
import { cn } from '@/lib/utils';
import type { QuestionType } from '@/types/common';

interface QuestionTypeBadgeProps {
  type: QuestionType;
  size?: 'sm' | 'md';
  labelMode?: 'short' | 'full';
  variant?: 'filled' | 'plain';
  showIcon?: boolean;
  className?: string;
}

const sizeClassNameMap = {
  sm: {
    root: 'gap-1 rounded-full px-2 py-0.5 text-[10px] leading-4',
    plain: 'gap-1 text-[11px] leading-4',
    icon: 'h-3 w-3',
  },
  md: {
    root: 'gap-1.5 rounded-full px-2.5 py-1 text-[12px] leading-4',
    plain: 'gap-1.5 text-[12px] leading-4',
    icon: 'h-3.5 w-3.5',
  },
} as const;

export const QuestionTypeBadge: React.FC<QuestionTypeBadgeProps> = ({
  type,
  size = 'sm',
  labelMode = 'short',
  variant = 'filled',
  showIcon = true,
  className,
}) => {
  const presentation = getQuestionTypePresentation(type);
  const Icon = presentation.icon;
  const sizeClassName = sizeClassNameMap[size];

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold tracking-[0.01em]',
        presentation.color,
        variant === 'filled' ? cn(presentation.bg, sizeClassName.root) : sizeClassName.plain,
        className,
      )}
    >
      {showIcon ? <Icon className={sizeClassName.icon} /> : null}
      {labelMode === 'full' ? presentation.fullLabel : presentation.label}
    </span>
  );
};
