import { ALL_EXAMPLES, type Example, type ExampleSection, type SupportLevel } from "../examples/mermaid";

interface ExamplesProps {
  activeCode: string;
  onSelect: (code: string) => void;
}

const LEVEL_LABELS: Record<SupportLevel, { label: string; badge: string }> = {
  native: { label: "Native Converters", badge: "native" },
  fallback: { label: "Fallback (excalidraw)", badge: "fallback" },
  unsupported: { label: "Unsupported", badge: "unsupported" },
};

export function Examples({ activeCode, onSelect }: ExamplesProps) {
  const native = ALL_EXAMPLES.filter((s) => s.supportLevel === "native");
  const fallback = ALL_EXAMPLES.filter((s) => s.supportLevel === "fallback");
  const unsupported = ALL_EXAMPLES.filter((s) => s.supportLevel === "unsupported");

  return (
    <div className="examples-panel">
      {native.map((section) => (
        <SectionDetails
          key={section.title}
          section={section}
          activeCode={activeCode}
          onSelect={onSelect}
        />
      ))}
      {fallback.length > 0 && (
        <details>
          <summary className="fallback-group-summary">
            Fallback — via @excalidraw/mermaid-to-excalidraw
            <span className="badge badge-fallback">{fallback.length} types</span>
          </summary>
          {fallback.map((section) => (
            <SectionDetails
              key={section.title}
              section={section}
              activeCode={activeCode}
              onSelect={onSelect}
              nested
            />
          ))}
        </details>
      )}
      {unsupported.length > 0 && (
        <details>
          <summary className="unsupported-group-summary">
            Unsupported Diagram Types
            <span className="badge badge-unsupported">{unsupported.length} types</span>
          </summary>
          {unsupported.map((section) => (
            <SectionDetails
              key={section.title}
              section={section}
              activeCode={activeCode}
              onSelect={onSelect}
              nested
            />
          ))}
        </details>
      )}
    </div>
  );
}

function SectionDetails({
  section,
  activeCode,
  onSelect,
  nested,
}: {
  section: ExampleSection;
  activeCode: string;
  onSelect: (code: string) => void;
  nested?: boolean;
}) {
  return (
    <details className={nested ? "nested-section" : undefined}>
      <summary>
        {section.title}
        {section.supportLevel === "fallback" && !nested && (
          <span className="badge badge-fallback">fallback</span>
        )}
        {section.supportLevel === "unsupported" && !nested && (
          <span className="badge badge-unsupported">unsupported</span>
        )}
      </summary>
      <div className="examples-grid">
        {section.examples.map((example) => (
          <ExampleCard
            key={example.title}
            example={example}
            supportLevel={section.supportLevel}
            active={activeCode === example.code}
            onClick={() => onSelect(example.code)}
          />
        ))}
      </div>
    </details>
  );
}

function ExampleCard({
  example,
  supportLevel,
  active,
  onClick,
}: {
  example: Example;
  supportLevel: SupportLevel;
  active: boolean;
  onClick: () => void;
}) {
  const extraClass = supportLevel === "unsupported" ? " unsupported" : supportLevel === "fallback" ? " fallback" : "";
  return (
    <div
      className={`example-card${active ? " active" : ""}${extraClass}`}
      onClick={onClick}
    >
      <div className="example-card-title">
        {example.title}
        {supportLevel === "unsupported" && <span className="badge badge-unsupported">soon</span>}
        {supportLevel === "fallback" && <span className="badge badge-fallback">fallback</span>}
      </div>
      <div className="example-card-meta">
        {example.description}
      </div>
    </div>
  );
}
