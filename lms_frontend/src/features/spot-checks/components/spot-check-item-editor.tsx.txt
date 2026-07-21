import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { SpotCheckImageGallery } from '@/features/spot-checks/components/spot-check-image-gallery';
import type { SpotCheckItem } from '@/features/spot-checks/types/spot-check';
import { appendPasteImages } from '@/features/spot-checks/utils/spot-check-images';

export type SpotCheckItemEditorMode = 'issue' | 'submit' | 'score' | 'view';

interface SpotCheckItemEditorProps {
  index: number;
  item: SpotCheckItem;
  mode: SpotCheckItemEditorMode;
  canRemove: boolean;
  errors: Record<string, string>;
  className?: string;
  onChange: (
    index: number,
    field: keyof SpotCheckItem,
    value: string | string[],
  ) => void;
  /** 评分模式：评语失焦时即时保存 */
  onCommentBlur?: (index: number) => void;
  onRemove: (index: number) => void;
}

/** 五星制：满星 2 分，半星 1 分，满分 10 */
const STAR_COUNT = 5;
const POINTS_PER_STAR = 2;
const SPOT_CHECK_TEXTAREA_CLASSNAME =
  'resize-none scroll-mb-5 rounded-lg border-transparent bg-muted/40 px-3.5 py-2.5 text-[13px] font-medium leading-5 placeholder:font-medium focus:border-primary/20 focus:bg-background focus:ring-0';

/** 分数 → 星数（支持 0.5） */
const scoreToStars = (score: string | null | undefined) => {
  const value = Number(score);
  if (score === '' || score == null || Number.isNaN(value) || value <= 0) {
    return 0;
  }
  // 1 分 = 半星
  const stars = Math.round(value) / POINTS_PER_STAR;
  return Math.min(STAR_COUNT, Math.max(0, stars));
};

const starsToScore = (stars: number) => String(stars * POINTS_PER_STAR);

interface SpotCheckStarRatingProps {
  value: string | null | undefined;
  readOnly?: boolean;
  size?: 'sm' | 'md';
  onChange?: (score: string) => void;
}

const SpotCheckStarRating: React.FC<SpotCheckStarRatingProps> = ({
  value,
  readOnly = false,
  size = 'md',
  onChange,
}) => {
  const filled = scoreToStars(value);
  const [hover, setHover] = useState(0);
  const active = hover > 0 ? hover : filled;
  const iconClass = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <div
      className="flex items-center"
      onMouseLeave={() => {
        if (!readOnly) setHover(0);
      }}
    >
      {Array.from({ length: STAR_COUNT }, (_, index) => {
        const starIndex = index + 1;
        const fullThreshold = starIndex;
        const halfThreshold = starIndex - 0.5;
        const isFull = active >= fullThreshold;
        const isHalf = !isFull && active >= halfThreshold;

        return (
          <div
            key={starIndex}
            className={cn('relative', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')}
          >
            {/* 底星 */}
            <Star
              className={cn(iconClass, 'text-border fill-transparent')}
              strokeWidth={1.75}
            />
            {/* 半星 / 满星填充 */}
            {isFull || isHalf ? (
              <div
                className={cn(
                  'pointer-events-none absolute inset-0 overflow-hidden',
                  isHalf ? 'w-1/2' : 'w-full',
                )}
              >
                <Star
                  className={cn(iconClass, 'fill-warning text-warning')}
                  strokeWidth={1.75}
                />
              </div>
            ) : null}
            {!readOnly ? (
              <>
                <button
                  type="button"
                  aria-label={`${halfThreshold} 星（${halfThreshold * POINTS_PER_STAR} 分）`}
                  className="absolute inset-y-0 left-0 z-10 w-1/2 cursor-pointer"
                  onMouseEnter={() => setHover(halfThreshold)}
                  onClick={() => {
                    if (!onChange) return;
                    if (filled === halfThreshold) {
                      onChange('');
                      return;
                    }
                    onChange(starsToScore(halfThreshold));
                  }}
                />
                <button
                  type="button"
                  aria-label={`${fullThreshold} 星（${fullThreshold * POINTS_PER_STAR} 分）`}
                  className="absolute inset-y-0 right-0 z-10 w-1/2 cursor-pointer"
                  onMouseEnter={() => setHover(fullThreshold)}
                  onClick={() => {
                    if (!onChange) return;
                    if (filled === fullThreshold) {
                      onChange('');
                      return;
                    }
                    onChange(starsToScore(fullThreshold));
                  }}
                />
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export { SpotCheckStarRating };

/** 列表/卡片只读星级芯片；无分时显示「未评分」避免空星像 0 分 */
export const SpotCheckStarChip: React.FC<{
  value: string | null | undefined;
}> = ({ value }) => {
  const empty = value === '' || value == null || Number.isNaN(Number(value));
  if (empty) {
    return (
      <span className="border-border/70 bg-muted/40 text-text-muted inline-flex shrink-0 items-center rounded-lg border px-2 py-1 text-[12px]">
        未评分
      </span>
    );
  }
  return (
    <div className="border-border/70 inline-flex shrink-0 items-center rounded-lg border bg-white px-1.5 py-1 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <SpotCheckStarRating value={value} readOnly size="sm" />
    </div>
  );
};

export const SpotCheckItemEditor: React.FC<SpotCheckItemEditorProps> = ({
  index,
  item,
  mode,
  canRemove,
  errors,
  className,
  onChange,
  onCommentBlur,
  onRemove,
}) => {
  const images = item.images ?? [];
  const instructionImages = item.instruction_images ?? [];
  const previewInput =
    mode === 'submit'
      ? {
          label: '填写内容',
          placeholder: '填写抽查内容',
          value: item.content ?? '',
          onChange: (content: string) => onChange(index, 'content', content),
        }
      : mode === 'score'
        ? {
            label: '评语',
            placeholder: '填写评语',
            value: item.comment ?? '',
            onChange: (comment: string) =>
              onChange(index, 'comment', comment),
            onBlur: () => onCommentBlur?.(index),
          }
        : undefined;
  const previewContext =
    mode === 'score'
      ? {
          label: '学员答案',
          value: item.content?.trim() || '（未填写）',
        }
      : undefined;
  const instructionPreviewContext =
    mode === 'submit'
      ? {
          label: '要求说明',
          value: item.instruction?.trim() || '（无文字说明）',
        }
      : previewContext;

  const handlePasteImages = async (
    event: React.ClipboardEvent,
    field: 'images' | 'instruction_images',
  ) => {
    if (mode !== 'submit' && mode !== 'issue') return;
    const files = [...event.clipboardData.files].filter((file) =>
      file.type.startsWith('image/'),
    );
    if (files.length === 0) return;
    event.preventDefault();
    const currentImages = field === 'images' ? images : instructionImages;
    const { urls, error } = await appendPasteImages(files, currentImages);
    if (error) toast.error(error);
    if (urls.length !== currentImages.length) onChange(index, field, urls);
  };

  return (
    <section
      className={cn(
        'group border-border/55 relative space-y-3 rounded-xl border bg-white/72 p-4',
        className,
      )}
    >
      {canRemove && mode === 'issue' ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="border-border/70 text-text-muted pointer-events-none absolute top-2 right-2 z-10 h-[26px] w-[26px] rounded-full border bg-white opacity-0 shadow-[0_2px_8px_rgba(15,23,42,0.05)] transition-all duration-150 group-hover:pointer-events-auto group-hover:opacity-100"
          onClick={() => onRemove(index)}
          aria-label={`删除主题 ${index + 1}`}
        >
          <X className="h-[12px] w-[12px]" strokeWidth={2} />
        </Button>
      ) : null}

      <div
        className={cn(
          'grid gap-3',
          mode === 'score' || mode === 'view'
            ? 'md:grid-cols-[minmax(0,1fr)_auto] md:items-start'
            : '',
        )}
      >
        <div className="min-w-0">
          <Label className="text-text-muted mb-3 block text-xs font-medium">
            主题 {index + 1}
          </Label>
          {mode === 'issue' ? (
            <Input
              value={item.topic}
              onChange={(event) => onChange(index, 'topic', event.target.value)}
              placeholder="例如：HTTP 缓存"
              className="bg-muted/40 focus:border-primary/20 focus:bg-background h-10 rounded-lg border-transparent px-3.5 text-[13px] focus:ring-0"
            />
          ) : (
            <p className="bg-muted/40 text-foreground rounded-lg px-3.5 py-2.5 text-[13px] font-medium">
              {item.topic || '—'}
            </p>
          )}
          {errors[`item-${index}-topic`] ? (
            <p className="text-destructive-500 text-sm">
              {errors[`item-${index}-topic`]}
            </p>
          ) : null}
        </div>

        {mode === 'score' || mode === 'view' ? (
          <div className="md:pt-0">
            <Label className="text-text-muted mb-3 block text-xs font-medium">
              得分
            </Label>
            <div className="flex h-10 items-center">
              <SpotCheckStarRating
                value={item.score}
                readOnly={mode === 'view'}
                onChange={(score) => onChange(index, 'score', score)}
              />
            </div>
            {errors[`item-${index}-score`] ? (
              <p className="text-destructive-500 mt-1 text-sm">
                {errors[`item-${index}-score`]}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* 要求说明：发起可编辑；学员/评分/查看只读展示 */}
      {mode === 'issue' ? (
        <div>
          <Label className="text-text-muted mb-3 block text-xs font-medium">
            要求说明（可选，可 Ctrl/Cmd+V 贴图）
          </Label>
          <Textarea
            autoResize
            value={item.instruction ?? ''}
            onChange={(event) =>
              onChange(index, 'instruction', event.target.value)
            }
            onPaste={(event) => handlePasteImages(event, 'instruction_images')}
            placeholder="给学员的填写要求"
            className={`min-h-[56px] ${SPOT_CHECK_TEXTAREA_CLASSNAME}`}
          />
          <SpotCheckImageGallery
            images={instructionImages}
            editable
            onRemove={(imageIndex) =>
              onChange(
                index,
                'instruction_images',
                instructionImages.filter(
                  (_, currentIndex) => currentIndex !== imageIndex,
                ),
              )
            }
          />
        </div>
      ) : (item.instruction ?? '').trim() || instructionImages.length > 0 ? (
        <div>
          <Label className="text-text-muted mb-3 block text-xs font-medium">
            要求说明
          </Label>
          {(item.instruction ?? '').trim() ? (
            <p className="bg-primary-50/60 text-primary-900/90 rounded-lg px-3.5 py-2.5 text-[13px] leading-5 whitespace-pre-wrap">
              {(item.instruction ?? '').trim()}
            </p>
          ) : null}
          <SpotCheckImageGallery
            images={instructionImages}
            previewContext={instructionPreviewContext}
            previewInput={previewInput}
          />
        </div>
      ) : null}

      {mode === 'submit' || mode === 'score' || mode === 'view' ? (
        <div>
          <Label className="text-text-muted mb-3 block text-xs font-medium">
            {mode === 'submit' ? '填写内容（可 Ctrl/Cmd+V 贴图）' : '学员填写'}
          </Label>
          {mode === 'submit' ? (
            <Textarea
              autoResize
              value={item.content ?? ''}
              onChange={(event) =>
                onChange(index, 'content', event.target.value)
              }
              onPaste={(event) => handlePasteImages(event, 'images')}
              placeholder="填写说明，可直接粘贴截图"
              className={`min-h-[88px] ${SPOT_CHECK_TEXTAREA_CLASSNAME}`}
            />
          ) : (
            <p className="bg-muted/40 text-foreground/90 min-h-[56px] rounded-lg px-3.5 py-2.5 text-[13px] leading-5 whitespace-pre-wrap">
              {item.content?.trim() || '（未填写）'}
            </p>
          )}
          {errors[`item-${index}-content`] ? (
            <p className="text-destructive-500 text-sm">
              {errors[`item-${index}-content`]}
            </p>
          ) : null}

          <SpotCheckImageGallery
            images={images}
            editable={mode === 'submit'}
            onRemove={(imageIndex) =>
              onChange(
                index,
                'images',
                images.filter((_, currentIndex) => currentIndex !== imageIndex),
              )
            }
            previewContext={previewContext}
            previewInput={previewInput}
          />
        </div>
      ) : null}

      {mode === 'score' || (mode === 'view' && item.comment) ? (
        <div>
          <Label className="text-text-muted mb-3 block text-xs font-medium">
            评语
          </Label>
          {mode === 'score' ? (
            <Textarea
              autoResize
              value={item.comment ?? ''}
              onChange={(event) =>
                onChange(index, 'comment', event.target.value)
              }
              onBlur={() => onCommentBlur?.(index)}
              placeholder="可选"
              className={`min-h-[56px] ${SPOT_CHECK_TEXTAREA_CLASSNAME}`}
            />
          ) : (
            <p className="bg-muted/40 text-foreground/85 rounded-lg px-3.5 py-2.5 text-[13px] leading-5">
              {item.comment}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
};
