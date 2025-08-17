import { useCallback, useEffect, useRef } from 'react';

export type UseInfiniteScrollParams = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  threshold?: number; // Distance from bottom to trigger loading (in pixels)
  rootMargin?: string; // Intersection observer root margin
};

export const useInfiniteScroll = ({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  threshold = 1000, // Trigger when 1000px from bottom
  rootMargin = '0px 0px 1000px 0px', // Load when 1000px before reaching bottom
}: UseInfiniteScrollParams) => {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;

      if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold: 0.1,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [handleIntersection, rootMargin]);

  // Alternative scroll-based approach as fallback
  useEffect(() => {
    const handleScroll = () => {
      if (!hasNextPage || isFetchingNextPage || !window.scrollY) {
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } =
        document.documentElement;

      // Check if we're within threshold pixels of the bottom
      if (scrollTop + clientHeight >= scrollHeight - threshold) {
        fetchNextPage();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, threshold]);

  return {
    loadMoreRef, // Attach this ref to an element near the bottom for intersection observer
  };
};
