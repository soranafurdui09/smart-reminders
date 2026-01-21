import { useCallback, useRef } from 'react';
import type { TouchEvent } from 'react';

type SwipeOptions = {
  enabled?: boolean;
  threshold?: number;
  restraint?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
};

type SwipeHandlers = {
  onTouchStart: (event: TouchEvent) => void;
  onTouchMove: (event: TouchEvent) => void;
  onTouchEnd: () => void;
};

export function useSwipeActions({
  enabled = true,
  threshold = 60,
  restraint = 80,
  onSwipeLeft,
  onSwipeRight
}: SwipeOptions): SwipeHandlers {
  const startX = useRef(0);
  const startY = useRef(0);
  const endX = useRef(0);
  const endY = useRef(0);
  const tracking = useRef(false);

  const onTouchStart = useCallback(
    (event: TouchEvent) => {
      if (!enabled) return;
      const touch = event.touches[0];
      if (!touch) return;
      tracking.current = true;
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      endX.current = touch.clientX;
      endY.current = touch.clientY;
    },
    [enabled]
  );

  const onTouchMove = useCallback(
    (event: TouchEvent) => {
      if (!enabled || !tracking.current) return;
      const touch = event.touches[0];
      if (!touch) return;
      endX.current = touch.clientX;
      endY.current = touch.clientY;
    },
    [enabled]
  );

  const onTouchEnd = useCallback(() => {
    if (!enabled || !tracking.current) return;
    tracking.current = false;
    const dx = endX.current - startX.current;
    const dy = endY.current - startY.current;
    if (Math.abs(dx) < threshold) return;
    if (Math.abs(dy) > restraint) return;
    if (Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) {
      onSwipeLeft?.();
    } else {
      onSwipeRight?.();
    }
  }, [enabled, threshold, restraint, onSwipeLeft, onSwipeRight]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
}
