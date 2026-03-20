import { CLASS_EXAMPLES, type Example } from "../examples/class";

interface ExamplesProps {
  activeCode: string;
  onSelect: (code: string) => void;
}

export function Examples({ activeCode, onSelect }: ExamplesProps) {
  return (
    <div className="examples-panel">
      {CLASS_EXAMPLES.map((section) => (
        <details key={section.title}>
          <summary>{section.title}</summary>
          <div className="examples-grid">
            {section.examples.map((example) => (
              <ExampleCard
                key={example.title}
                example={example}
                active={activeCode === example.code}
                onClick={() => onSelect(example.code)}
              />
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function ExampleCard({
  example,
  active,
  onClick,
}: {
  example: Example;
  active: boolean;
  onClick: () => void;
}) {
  const classCount = (example.code.match(/\b(class|interface|enum|abstract class)\b/g) || []).length;
  const relationCount = (example.code.match(/(--|\.\.)[>|*o]/g) || []).length;

  return (
    <div
      className={`example-card${active ? " active" : ""}`}
      onClick={onClick}
    >
      <div className="example-card-title">{example.title}</div>
      <div className="example-card-meta">
        {example.description} &middot; {classCount} classes{relationCount > 0 ? `, ${relationCount} relations` : ""}
      </div>
    </div>
  );
}
