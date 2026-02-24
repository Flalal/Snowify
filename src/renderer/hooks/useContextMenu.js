import { useEffect } from 'preact/hooks';

export function useContextMenu(menuRef, visible, x, y, onClose) {
  // Close on outside click
  useEffect(() => {
    if (!visible) return;
    const handler = () => onClose();
    const timer = setTimeout(() => {
      document.addEventListener('click', handler, { once: true });
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handler);
    };
  }, [visible, onClose]);

  // Reposition if overflowing viewport
  useEffect(() => {
    if (!visible || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menuRef.current.style.left = window.innerWidth - rect.width - 8 + 'px';
    }
    if (rect.bottom > window.innerHeight) {
      menuRef.current.style.top = window.innerHeight - rect.height - 8 + 'px';
    }
  }, [visible, x, y]);
}
