import type { FlatExample } from "../examples/mermaid";

interface ExampleNavProps {
  currentIndex: number;
  total: number;
  currentExample: FlatExample | null;
  onPrev: () => void;
  onNext: () => void;
}

export function ExampleNav({
  currentIndex,
  total,
  currentExample,
  onPrev,
  onNext,
}: ExampleNavProps) {
  if (!currentExample) return null;

  return (
    <div className="example-nav">
      <button className="example-nav-btn" onClick={onPrev} title="Previous example (Arrow Left)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div className="example-nav-info">
        <span className="example-nav-section">{currentExample.sectionTitle}</span>
        <span className="example-nav-title">{currentExample.example.title}</span>
        <span className="example-nav-counter">{currentIndex + 1} / {total}</span>
      </div>
      <button className="example-nav-btn" onClick={onNext} title="Next example (Arrow Right)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}
