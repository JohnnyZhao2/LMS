import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface SpotCheckImagePreviewInput {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

interface SpotCheckImagePreviewContext {
  label: string;
  value: string;
}

const SpotCheckImagePreview: React.FC<{
  images: string[];
  initialIndex: number | null;
  onClose: () => void;
  previewContext?: SpotCheckImagePreviewContext;
  previewInput?: SpotCheckImagePreviewInput;
}> = ({
  images,
  initialIndex,
  onClose,
  previewContext,
  previewInput,
}) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex ?? 0);

  if (initialIndex === null) return null;

  const activeImage = images[activeIndex];
  const hasSidePanel = previewContext !== undefined || previewInput !== undefined;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showClose={false}
        overlayClassName="z-[60]"
        className="pointer-events-auto z-[70] flex w-[96vw] max-w-[96vw] items-center justify-center gap-5 overflow-visible border-transparent bg-transparent p-0 shadow-none"
      >
        <DialogTitle className="sr-only">图片预览</DialogTitle>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-foreground fixed top-4 right-4 z-20 h-8 w-8 bg-white/90 shadow-md hover:bg-white"
          onClick={onClose}
          aria-label="关闭图片预览"
        >
          <X className="h-4 w-4" />
        </Button>

        <section className="flex max-h-[96vh] min-w-0 flex-col items-center">
          <div className="flex min-h-0 items-center justify-center">
            {activeImage ? (
              <img
                src={activeImage}
                alt={`图片 ${activeIndex + 1}`}
                className={cn(
                  'max-h-[calc(96vh-56px)] rounded-xl object-contain shadow-[0_24px_70px_rgba(15,23,42,0.28)]',
                  hasSidePanel
                    ? 'max-w-[calc(96vw-372px)]'
                    : 'max-w-[96vw]',
                )}
              />
            ) : null}
          </div>
          <div className="mt-3 flex h-10 shrink-0 items-center justify-center gap-3 rounded-full bg-white/95 px-3 shadow-lg">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={activeIndex === 0}
              onClick={() => setActiveIndex((index) => index - 1)}
              aria-label="上一张图片"
            >
              <ChevronLeft />
            </Button>
            <span className="text-text-muted min-w-12 text-center text-xs tabular-nums">
              {activeIndex + 1} / {images.length}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={activeIndex === images.length - 1}
              onClick={() => setActiveIndex((index) => index + 1)}
              aria-label="下一张图片"
            >
              <ChevronRight />
            </Button>
          </div>
        </section>

        {hasSidePanel ? (
          <aside className="pointer-events-auto flex w-80 shrink-0 flex-col gap-4 self-center">
            {previewContext ? (
              <div>
                <p className="mb-2 text-xs font-medium text-white/80">
                  {previewContext.label}
                </p>
                <p className="scrollbar-subtle text-foreground max-h-[30vh] overflow-y-auto rounded-xl bg-white p-3 text-sm leading-6 whitespace-pre-wrap shadow-[0_16px_40px_rgba(15,23,42,0.28)]">
                  {previewContext.value}
                </p>
              </div>
            ) : null}
            {previewInput ? (
              <div>
                <label className="mb-2 block text-xs font-medium text-white/80">
                  {previewInput.label}
                </label>
                <Textarea
                  autoResize
                  value={previewInput.value}
                  onChange={(event) =>
                    previewInput.onChange(event.target.value)
                  }
                  onBlur={previewInput.onBlur}
                  placeholder={previewInput.placeholder}
                  className={cn(
                    'scrollbar-subtle border-border/70 bg-background focus:border-primary/40 min-h-[136px] resize-none rounded-xl p-3 text-sm leading-6 shadow-[0_16px_40px_rgba(15,23,42,0.28)] focus:ring-0',
                    previewContext ? 'max-h-[36vh]' : 'max-h-[48vh]',
                  )}
                />
              </div>
            ) : null}
          </aside>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

interface SpotCheckImageGalleryProps {
  images: string[];
  editable?: boolean;
  onRemove?: (index: number) => void;
  previewContext?: SpotCheckImagePreviewContext;
  previewInput?: SpotCheckImagePreviewInput;
}

export const SpotCheckImageGallery: React.FC<SpotCheckImageGalleryProps> = ({
  images,
  editable = false,
  onRemove,
  previewContext,
  previewInput,
}) => {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div className="mt-2 flex flex-wrap gap-2">
        {images.map((src, imageIndex) => (
          <div key={src} className="relative">
            <button
              type="button"
              className="border-border/60 hover:border-primary/40 hover:ring-primary/15 block overflow-hidden rounded-lg border transition hover:ring-2"
              onClick={() => setPreviewIndex(imageIndex)}
              aria-label={`查看图片 ${imageIndex + 1}`}
            >
              <img
                src={src}
                alt={`图片 ${imageIndex + 1}`}
                className="h-20 w-20 object-cover"
              />
            </button>
            {editable ? (
              <Button
                type="button"
                variant="default"
                size="icon"
                className="bg-foreground hover:bg-foreground absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full p-0 text-white"
                onClick={() => onRemove?.(imageIndex)}
                aria-label={`删除图片 ${imageIndex + 1}`}
              >
                <X className="h-3 w-3" />
              </Button>
            ) : null}
          </div>
        ))}
      </div>
      <SpotCheckImagePreview
        key={previewIndex ?? 'closed'}
        images={images}
        initialIndex={previewIndex}
        onClose={() => setPreviewIndex(null)}
        previewContext={previewContext}
        previewInput={previewInput}
      />
    </>
  );
};
