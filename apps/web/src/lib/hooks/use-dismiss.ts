import { useEffect, type RefObject } from 'react';

export type DismissReason = 'outside-click' | 'escape';

/**
 * Calls onDismiss when the user clicks outside `containerRef` or presses Escape, while
 * `active` is true. For popovers and dropdown menus.
 */
export function useDismiss(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  onDismiss: (reason: DismissReason) => void,
): void {
  useEffect(() => {
    if (!active) return;

    const handlePointerDown = (event: PointerEvent) => {
      const container = containerRef.current;
      if (container && !container.contains(event.target as Node)) onDismiss('outside-click');
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss('escape');
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, active, onDismiss]);
}
