import { useEffect, useRef } from 'preact/hooks';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(ref, active) {
  const previousFocus = useRef(null);

  useEffect(() => {
    if (!active || !ref.current) return;

    previousFocus.current = document.activeElement;

    // Focus first focusable element after a tick (let DOM settle)
    const timer = setTimeout(() => {
      const first = ref.current?.querySelector(FOCUSABLE);
      if (first) first.focus();
    }, 50);

    const handler = (e) => {
      if (e.key !== 'Tab' || !ref.current) return;
      const focusable = ref.current.querySelectorAll(FOCUSABLE);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handler);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handler);
      // Restore focus
      if (previousFocus.current && previousFocus.current.focus) {
        previousFocus.current.focus();
      }
    };
  }, [active]);
}
