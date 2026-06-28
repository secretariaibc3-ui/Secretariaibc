import { useEffect, useRef } from 'react';

export function useBackButton(isOpen: boolean, close: () => void, modalId: string) {
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    isClosingRef.current = false;
    let poppedByBrowser = false;

    // Push the state for this modal
    window.history.pushState({ modalId }, '');

    const handlePopState = (e: PopStateEvent) => {
      // If we popped to a state that is NOT this modal's state,
      // it means this modal should close.
      // E.g., if we are Modal B, and we popped to Modal A, e.state will be { modalId: 'A' }.
      // Since 'A' !== 'B', Modal B will close.
      if (!e.state || e.state.modalId !== modalId) {
        poppedByBrowser = true;
        close();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // If the component is closing (or unmounting) not due to a browser back button,
      // we need to remove our state from history.
      if (!poppedByBrowser && !isClosingRef.current) {
        isClosingRef.current = true;
        window.history.back();
      }
    };
  }, [isOpen, close, modalId]);
}
