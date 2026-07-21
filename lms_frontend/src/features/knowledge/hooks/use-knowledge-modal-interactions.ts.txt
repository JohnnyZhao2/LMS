import { useEffect, useEffectEvent } from 'react';

interface UseKnowledgeModalInteractionsOptions {
  onEscape: () => void;
  onSubmit?: () => void;
}

export function useKnowledgeModalInteractions({
  onEscape,
  onSubmit,
}: UseKnowledgeModalInteractionsOptions) {
  const handleEscape = useEffectEvent(() => {
    onEscape();
  });
  const handleSubmit = useEffectEvent(() => {
    if (!onSubmit) {
      return false;
    }
    onSubmit();
    return true;
  });

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleEscape();
        return;
      }

      const isSubmitShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's';

      if (isSubmitShortcut) {
        const didHandleSubmit = handleSubmit();
        if (didHandleSubmit) {
          event.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, []);

  useEffect(() => {
    const htmlStyle = document.documentElement.style;
    const bodyStyle = document.body.style;
    const previousHtmlOverflow = htmlStyle.overflow;
    const previousBodyOverflow = bodyStyle.overflow;
    const previousHtmlOverscrollBehavior = htmlStyle.overscrollBehavior;
    const previousBodyOverscrollBehavior = bodyStyle.overscrollBehavior;
    const previousHtmlScrollbarGutter = htmlStyle.scrollbarGutter;
    const previousBodyScrollbarGutter = bodyStyle.scrollbarGutter;
    htmlStyle.overflow = 'hidden';
    bodyStyle.overflow = 'hidden';
    htmlStyle.overscrollBehavior = 'none';
    bodyStyle.overscrollBehavior = 'none';
    htmlStyle.scrollbarGutter = 'auto';
    bodyStyle.scrollbarGutter = 'auto';

    return () => {
      htmlStyle.overflow = previousHtmlOverflow;
      bodyStyle.overflow = previousBodyOverflow;
      htmlStyle.overscrollBehavior = previousHtmlOverscrollBehavior;
      bodyStyle.overscrollBehavior = previousBodyOverscrollBehavior;
      htmlStyle.scrollbarGutter = previousHtmlScrollbarGutter;
      bodyStyle.scrollbarGutter = previousBodyScrollbarGutter;
    };
  }, []);
}
