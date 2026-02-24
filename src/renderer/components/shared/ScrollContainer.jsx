import { useRef } from 'preact/hooks';

/**
 * Wraps children in a horizontally scrollable container with left/right arrow buttons.
 * The arrows scroll the inner element by 400px on click.
 *
 * Props:
 *   children - the scrollable content (e.g. a row of cards)
 */
export function ScrollContainer({ children }) {
  const scrollRef = useRef(null);

  function scrollLeft() {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -400, behavior: 'smooth' });
    }
  }

  function scrollRight() {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 400, behavior: 'smooth' });
    }
  }

  return (
    <div className="scroll-container">
      <button className="scroll-arrow scroll-arrow-left" data-dir="left" onClick={scrollLeft}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <div ref={scrollRef} style={{ overflowX: 'auto', display: 'flex' }}>
        {children}
      </div>
      <button className="scroll-arrow scroll-arrow-right" data-dir="right" onClick={scrollRight}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}
