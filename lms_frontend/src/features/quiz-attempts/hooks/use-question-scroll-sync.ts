import { useCallback, useEffect, useRef, useState } from 'react';

const QUESTION_SCROLL_OFFSET = 16;

interface QuestionScrollEntry {
  item: { question: number };
  number: number;
}

export const useQuestionScrollSync = (
  displayQuestionEntries: QuestionScrollEntry[],
) => {
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const questionRefs = useRef<Record<number, HTMLElement | null>>({});
  const questionViewportRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const releaseProgrammaticScrollFrameRef = useRef<number | null>(null);

  const scheduleProgrammaticScrollRelease = useCallback(() => {
    if (releaseProgrammaticScrollFrameRef.current !== null) {
      cancelAnimationFrame(releaseProgrammaticScrollFrameRef.current);
    }
    releaseProgrammaticScrollFrameRef.current = requestAnimationFrame(() => {
      releaseProgrammaticScrollFrameRef.current = requestAnimationFrame(() => {
        isProgrammaticScrollRef.current = false;
        releaseProgrammaticScrollFrameRef.current = null;
      });
    });
  }, []);

  const scrollToQuestion = useCallback((index: number) => {
    const questionId = displayQuestionEntries[index]?.item.question;
    const viewport = questionViewportRef.current;
    const questionNode = questionId ? questionRefs.current[questionId] : null;
    if (!questionId || !questionNode || !viewport) {
      return;
    }

    if (releaseProgrammaticScrollFrameRef.current !== null) {
      cancelAnimationFrame(releaseProgrammaticScrollFrameRef.current);
      releaseProgrammaticScrollFrameRef.current = null;
    }

    isProgrammaticScrollRef.current = true;
    setActiveQuestionIndex(index);

    const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    const viewportTop = viewport.getBoundingClientRect().top;
    const questionTop = questionNode.getBoundingClientRect().top;
    const relativeTop = questionTop - viewportTop;
    const targetTop = Math.min(
      Math.max(0, viewport.scrollTop + relativeTop - QUESTION_SCROLL_OFFSET),
      maxScrollTop,
    );

    viewport.scrollTo({ top: targetTop });
    scheduleProgrammaticScrollRelease();
  }, [displayQuestionEntries, scheduleProgrammaticScrollRelease]);

  useEffect(() => {
    if (displayQuestionEntries.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScrollRef.current) {
          return;
        }

        const topEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => {
            const rootTop = a.rootBounds?.top ?? 0;
            return Math.abs(a.boundingClientRect.top - rootTop) - Math.abs(b.boundingClientRect.top - rootTop);
          })[0];

        if (!topEntry) {
          return;
        }

        const index = Number((topEntry.target as HTMLElement).dataset.questionIndex ?? NaN);
        if (Number.isFinite(index)) {
          setActiveQuestionIndex(index);
        }
      },
      {
        threshold: [0.2, 0.4, 0.65],
        root: questionViewportRef.current,
        rootMargin: '-12% 0px -58% 0px',
      },
    );

    displayQuestionEntries.forEach(({ item: answer, number }) => {
      const node = questionRefs.current[answer.question];
      if (!node) {
        return;
      }
      node.dataset.questionIndex = String(number - 1);
      observer.observe(node);
    });

    return () => observer.disconnect();
  }, [displayQuestionEntries]);

  useEffect(() => () => {
    if (releaseProgrammaticScrollFrameRef.current !== null) {
      cancelAnimationFrame(releaseProgrammaticScrollFrameRef.current);
    }
  }, []);

  return {
    activeQuestionIndex,
    setActiveQuestionIndex,
    questionRefs,
    questionViewportRef,
    scrollToQuestion,
  };
};
