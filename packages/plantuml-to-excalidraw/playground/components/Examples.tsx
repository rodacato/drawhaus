import { ALL_EXAMPLES, type Example, type ExampleSection } from "../examples/class";

interface ExamplesProps {
  activeCode: string;
  onSelect: (code: string) => void;
}

export function Examples({ activeCode, onSelect }: ExamplesProps) {
  const supported = ALL_EXAMPLES.filter((s) => s.supported);
  const unsupported = ALL_EXAMPLES.filter((s) => !s.supported);

  return (
    <div className="examples-panel">
      {supported.map((section) => (
        <SectionDetails
          key={section.title}
          section={section}
          activeCode={activeCode}
          onSelect={onSelect}
        />
      ))}
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
        {!section.supported && !nested && (
          <span className="badge badge-unsupported">unsupported</span>
        )}
      </summary>
      <div className="examples-grid">
        {section.examples.map((example) => (
          <ExampleCard
            key={example.title}
            example={example}
            supported={section.supported}
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
  supported,
  active,
  onClick,
}: {
  example: Example;
  supported: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`example-card${active ? " active" : ""}${!supported ? " unsupported" : ""}`}
      onClick={onClick}
    >
      <div className="example-card-title">
        {example.title}
        {!supported && <span className="badge badge-unsupported">soon</span>}
      </div>
      <div className="example-card-meta">
        {example.description}
      </div>
    </div>
  );
}
