import { useState } from "react";
import { ui } from "@/lib/ui";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type" | "className"> & {
  readonly leadingIcon?: boolean;
  readonly visible?: boolean;
  readonly onVisibleChange?: (visible: boolean) => void;
  readonly showToggle?: boolean;
};

const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function PasswordInput({
  leadingIcon = true,
  visible,
  onVisibleChange,
  showToggle = true,
  ...inputProps
}: PasswordInputProps) {
  const [ownVisible, setOwnVisible] = useState(false);
  const shown = visible ?? ownVisible;

  function toggle() {
    setOwnVisible(!shown);
    onVisibleChange?.(!shown);
  }

  const padding = `${leadingIcon ? "pl-10" : ""} ${showToggle ? "pr-10" : ""}`;

  return (
    <div className="relative">
      {leadingIcon && (
        <svg
          {...iconProps}
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )}
      <input
        {...inputProps}
        className={`${ui.input} ${padding}`}
        type={shown ? "text" : "password"}
      />
      {showToggle && (
        <button
          type="button"
          onClick={toggle}
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-secondary"
        >
          <svg {...iconProps} aria-hidden="true">
            {shown ? (
              <>
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </>
            ) : (
              <>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </>
            )}
          </svg>
        </button>
      )}
    </div>
  );
}
