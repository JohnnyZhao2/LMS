import { getQuestionTypePresentation } from '@/features/questions/constants';
import { cn } from '@/lib/utils';
import type { QuestionType } from '@/types/common';

interface QuestionTypeBadgeProps {
  type: QuestionType;
  size?: 'sm' | 'md';
  labelMode?: 'short' | 'full';
  className?: string;
}

const sizeClassNameMap = {
  sm: {
    root: 'gap-1 rounded-full px-2 py-0.5 text-[10px] leading-4',
    icon: 'h-3 w-3',
  },
  md: {
    root: 'gap-1.5 rounded-full px-2.5 py-1 text-[12px] leading-4',
    icon: 'h-3.5 w-3.5',
  },
} as const;

export const QuestionTypeBadge: React.FC<QuestionTypeBadgeProps> = ({
  type,
  size = 'sm',
  labelMode = 'short',
  className,
}) => {
  const presentation = getQuestionTypePresentation(type);
  const Icon = presentation.icon;
  const sizeClassName = sizeClassNameMap[size];

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold tracking-[0.01em]',
        presentation.bg,
        presentation.color,
        sizeClassName.root,
        className,
      )}
    >
      <Icon className={sizeClassName.icon} />
      {labelMode === 'full' ? presentation.fullLabel : presentation.label}
    </span>
  );
};
