import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeftRight, BookOpen, ClipboardList, GripVertical, Trash2, Trophy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CompactNumberInput } from '@/components/ui/compact-number-input';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getTaskResourceGroup } from './use-task-form.helpers';
import type { SelectedResource } from './task-form.types';

interface SortableResourceItemProps {
  item: SelectedResource;
  removeResource: (uid: string) => void;
  onToggleQuizType?: (uid: string, nextQuizType: 'PRACTICE' | 'EXAM') => void;
  onUpdateExamConfig?: (uid: string, patch: { duration?: string; passScore?: string }) => void;
  isEdit?: boolean;
  isOverlay?: boolean;
}

export const SortableResourceItem: React.FC<SortableResourceItemProps> = ({
  item,
  removeResource,
  onToggleQuizType,
  onUpdateExamConfig,
  isEdit = false,
  isOverlay = false,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.uid,
    disabled: isOverlay || isEdit,
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
      labelClassName: 'text-secondary',
    },
    PRACTICE: {
      icon: ClipboardList,
      label: '测验',
      iconClassName: 'bg-primary-50 text-primary',
      labelClassName: 'text-primary',
    },
    EXAM: {
      icon: Trophy,
      label: '考试',
      iconClassName: 'bg-destructive-50 text-destructive',
      labelClassName: 'text-destructive',
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

  const canFlipQuiz = item.resourceType === 'QUIZ' && !isEdit && !isOverlay;

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
        {...(isEdit || isOverlay ? {} : attributes)}
        {...(isEdit || isOverlay ? {} : listeners)}
        className={cn(
          'absolute -left-7 top-1/2 flex h-7 w-5 -translate-y-1/2 items-center justify-center rounded text-text-muted/60 transition-colors duration-150',
          isEdit
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
          'w-full rounded-2xl border border-border bg-background px-6 py-5 text-left',
          !isOverlay && 'hover:border-interaction-border hover:bg-interaction-surface',
          isOverlay && 'shadow-[0_10px_24px_rgba(15,23,42,0.1)]',
          item.isMissingSource && 'border-warning-300 bg-warning-50/30',
        )}
      >
        <div className="flex w-full items-center justify-between gap-5">
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-5 gap-y-3">
            <div className="flex min-w-0 flex-1 items-center gap-4">
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
                    <span className="pointer-events-none absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-border bg-background text-text-muted shadow-2xs transition-[scale,border-color,color] duration-200 ease-out group-hover/flip-icon:scale-105 group-hover/flip-icon:border-primary/40 group-hover/flip-icon:text-primary group-active/flip-icon:scale-90">
                      <ArrowLeftRight className="h-2.5 w-2.5" />
                    </span>
                  </button>
                </Tooltip>
              ) : (
                <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', config.iconClassName)}>
                  <Icon className="h-5 w-5" />
                </div>
              )}

              <div className="flex min-h-[48px] min-w-0 flex-1 flex-col justify-center">
                <div className="truncate text-[15px] font-semibold leading-tight text-foreground">{item.title}</div>
                <div className="mt-1.5 flex items-center gap-1.5 truncate text-[12px] font-medium leading-tight text-text-muted">
                  <span className={cn('shrink-0 font-semibold', config.labelClassName)}>{config.label}</span>
                  <span className="h-0.5 w-0.5 shrink-0 rounded-full bg-border" />
                  <span className="truncate">{item.category || '-'}</span>
                </div>
              </div>

              {item.isMissingSource ? (
                <span className="shrink-0 text-[11px] font-medium text-warning-700">资源已删除</span>
              ) : null}
            </div>

            {group === 'EXAM' ? (
              <div className="flex shrink-0 items-center gap-4 text-[12px] text-text-muted">
                <label className="flex items-center gap-1.5">
                  <span>参考时间</span>
                  <CompactNumberInput
                    mode="integer"
                    min={1}
                    step={1}
                    placeholder="必填"
                    value={item.duration ?? ''}
                    disabled={isEdit || isOverlay}
                    onChange={(value) => onUpdateExamConfig?.(item.uid, { duration: value })}
                    inputWidthClassName="w-full"
                    inputClassName="text-[12px] font-semibold"
                    className="h-7 w-12 justify-center rounded-md border border-border bg-muted/20 px-1.5 py-0 transition-colors focus-within:border-primary/40 focus-within:bg-background"
                  />
                  <span>分</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <span>及格分</span>
                  <CompactNumberInput
                    mode="decimal"
                    min={0.5}
                    max={item.totalScore && item.totalScore > 0 ? item.totalScore : undefined}
                    step={0.5}
                    placeholder="必填"
                    value={item.passScore ?? ''}
                    disabled={isOverlay}
                    onChange={(value) => onUpdateExamConfig?.(item.uid, { passScore: value })}
                    inputWidthClassName="w-full"
                    inputClassName="text-[12px] font-semibold"
                    className="h-7 w-12 justify-center rounded-md border border-border bg-muted/20 px-1.5 py-0 transition-colors focus-within:border-primary/40 focus-within:bg-background"
                  />
                  <span>分</span>
                </label>
              </div>
            ) : null}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-text-muted hover:bg-destructive-50 hover:text-destructive-600"
            disabled={isEdit || isOverlay}
            onClick={() => removeResource(item.uid)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
