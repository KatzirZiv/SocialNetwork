import { useEffect, useRef, useCallback } from 'react';

const useInfiniteScroll = (callback, options = {}) => {
  const {
    root = null,
    rootMargin = '0px',
    threshold = 0,
    enabled = true,
  } = options;

  const observer = useRef(null);
  const lastElementRef = useCallback(
    (node) => {
      if (observer.current) {
        observer.current.disconnect();
      }

      if (!enabled) return;

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            callback();
          }
        },
        { root, rootMargin, threshold }
      );

      if (node) {
        observer.current.observe(node);
      }
    },
    [callback, root, rootMargin, threshold, enabled]
  );

  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, []);

  return lastElementRef;
};

export default useInfiniteScroll; 