import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BookOpen, ClipboardList, GripVertical, Repeat, Trash2, Trophy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CompactNumberInput } from '@/components/ui/compact-number-input';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getTaskResourceGroup } from './use-task-form.helpers';
import type { SelectedResource } from './task-form.types';

interface SortableResourceItemProps {
  item: SelectedResource;
  removeResource: (uid: number) => void;
  onToggleQuizType?: (uid: number, nextQuizType: 'PRACTICE' | 'EXAM') => void;
  onUpdateExamConfig?: (uid: number, patch: { duration?: string; passScore?: string }) => void;
  isEdit?: boolean;
  disabled?: boolean;
  isOverlay?: boolean;
}

export const SortableResourceItem: React.FC<SortableResourceItemProps> = ({
  item,
  removeResource,
  onToggleQuizType,
  onUpdateExamConfig,
  isEdit = false,
  disabled = false,
  isOverlay = false,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(item.uid),
    disabled: isOverlay || disabled,
  });

  const style = {
    transform: isOverlay ? undefined : CSS.Transform.toString(transform),
    transition: isOverlay ? undefined : transition,
    zIndex: isDragging && !isOverlay ? 20 : undefined,
  };

  const group = getTaskResourceGroup(item);
  const config = {
    DOCUMENT: {
      icon: BookOpen,
      label: '资料',
      iconClassName: 'bg-secondary-50 text-secondary',
    },
    PRACTICE: {
      icon: ClipboardList,
      label: '测验',
      iconClassName: 'bg-primary-50 text-primary',
    },
    EXAM: {
      icon: Trophy,
      label: '考试',
      iconClassName: 'bg-destructive-50 text-destructive',
    },
  }[group];
  const Icon = config.icon;
  const targetConfig = group === 'EXAM'
    ? {
      icon: ClipboardList,
      iconClassName: 'bg-primary-50 text-primary',
    }
    : {
      icon: Trophy,
      iconClassName: 'bg-destructive-50 text-destructive',
    };
  const [flipStep, setFlipStep] = React.useState(0);
  const [isHoveringIcon, setIsHoveringIcon] = React.useState(false);
  const [justClickedIcon, setJustClickedIcon] = React.useState(false);

  const isOddFlip = flipStep % 2 === 1;
  const frontConfig = isOddFlip ? targetConfig : config;
  const backConfig = isOddFlip ? config : targetConfig;
  const FrontIcon = frontConfig.icon;
  const BackIcon = backConfig.icon;
  const flipDeg = flipStep * 180 + (isHoveringIcon && !justClickedIcon ? 18 : 0);

  const canFlipQuiz = item.resourceType === 'QUIZ' && !isEdit && !disabled && !isOverlay;

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      className={cn(
        'group/row relative w-full transition-[transform,opacity] duration-150',
        isDragging && !isOverlay && 'pointer-events-none opacity-0',
      )}
    >
      <div
        {...(disabled || isOverlay ? {} : attributes)}
        {...(disabled || isOverlay ? {} : listeners)}
        className={cn(
          'absolute -left-7 top-1/2 flex h-7 w-5 -translate-y-1/2 items-center justify-center rounded text-text-muted/60 transition-colors duration-150',
          disabled
            ? 'cursor-not-allowed opacity-35'
            : isOverlay
              ? 'cursor-grabbing text-foreground'
              : 'cursor-grab group-hover/row:text-text-muted hover:text-foreground active:cursor-grabbing',
        )}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div
        className={cn(
          'w-full rounded-2xl border border-border bg-background px-5 pt-6 text-left',
          group === 'EXAM' ? 'pb-5' : 'pb-6',
          !isOverlay && 'hover:border-interaction-border hover:bg-interaction-surface',
          isOverlay && 'shadow-[0_10px_24px_rgba(15,23,42,0.1)]',
          item.isMissingSource && 'border-warning-300 bg-warning-50/30',
        )}
      >
        <div className="flex w-full items-center gap-4">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-3.5">
              {canFlipQuiz ? (
                <Tooltip title={group === 'EXAM' ? '点击切换为测验' : '点击切换为考试'}>
                  <button
                    type="button"
                    aria-label={group === 'EXAM' ? '切换为测验' : '切换为考试'}
                    onMouseEnter={() => setIsHoveringIcon(true)}
                    onMouseLeave={() => {
                      setIsHoveringIcon(false);
                      setJustClickedIcon(false);
                    }}
                    onClick={() => {
                      setJustClickedIcon(true);
                      setFlipStep((prev) => prev + 1);
                      onToggleQuizType?.(item.uid, group === 'EXAM' ? 'PRACTICE' : 'EXAM');
                    }}
                    className="group/flip-icon relative h-12 w-12 shrink-0 cursor-pointer [perspective:500px] focus-visible:outline-none"
                  >
                    <span
                      style={{ transform: `rotateY(${flipDeg}deg)` }}
                      className="relative block h-full w-full [transform-style:preserve-3d] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    >
                      <span
                        className={cn(
                          'absolute inset-0 flex items-center justify-center rounded-xl [backface-visibility:hidden]',
                          frontConfig.iconClassName,
                        )}
                      >
                        <FrontIcon className="h-5 w-5" />
                      </span>
                      <span
                        className={cn(
                          'absolute inset-0 flex items-center justify-center rounded-xl [backface-visibility:hidden] [transform:rotateY(180deg)]',
                          backConfig.iconClassName,
                        )}
                      >
                        <BackIcon className="h-5 w-5" />
                      </span>
                    </span>
                    <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-4 w-[22px] items-center justify-center rounded-full bg-muted text-text-muted ring-[2.5px] ring-background transition-[scale,background-color,color] duration-200 ease-out group-hover/flip-icon:scale-105 group-hover/flip-icon:bg-muted-hover group-hover/flip-icon:text-foreground group-active/flip-icon:scale-90">
                      <Repeat
                        style={{ transform: `rotateY(${flipStep * 180}deg)` }}
                        className="h-3 w-3 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      />
                    </span>
                  </button>
                </Tooltip>
              ) : (
                <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', config.iconClassName)}>
                  <Icon className="h-5 w-5" />
                </div>
              )}

              <div className="flex min-h-[48px] min-w-0 flex-1 flex-col justify-center">
                <div className="flex items-center gap-2">
                  <div className="truncate text-[15px] font-semibold leading-tight text-foreground">{item.title}</div>
                  <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium leading-none text-text-muted">
                    {config.label}
                  </span>
                </div>
                <div className="mt-1.5 truncate text-[12px] font-medium leading-tight text-text-muted">
                  {item.category || '-'}
                </div>
              </div>

              {item.isMissingSource ? (
                <span className="shrink-0 text-[11px] font-medium text-warning-700">资源已删除</span>
              ) : null}
            </div>

            {group === 'EXAM' ? (
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <CompactNumberInput
                  prefixLabel="参考时间"
                  unit="分"
                  mode="integer"
                  min={1}
                  step={1}
                  placeholder="必填"
                  value={item.duration ?? ''}
                  disabled={isEdit || isOverlay}
                  onChange={(value) => onUpdateExamConfig?.(item.uid, { duration: value })}
                  inputWidthClassName="w-9"
                  inputClassName="text-[12px] font-semibold"
                  className="h-8 w-auto gap-x-2 rounded-lg px-2.5 py-1"
                />
                <CompactNumberInput
                  prefixLabel="及格分数"
                  unit="分"
                  mode="decimal"
                  min={0.5}
                  max={item.totalScore && item.totalScore > 0 ? item.totalScore : undefined}
                  step={0.5}
                  placeholder="必填"
                  value={item.passScore ?? ''}
                  disabled={isOverlay}
                  onChange={(value) => onUpdateExamConfig?.(item.uid, { passScore: value })}
                  inputWidthClassName="w-10"
                  inputClassName="text-[12px] font-semibold"
                  className="h-8 w-auto gap-x-2 rounded-lg px-2.5 py-1"
                />
              </div>
            ) : null}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-text-muted hover:bg-destructive-50 hover:text-destructive-600"
            disabled={disabled || isOverlay}
            onClick={() => removeResource(item.uid)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
