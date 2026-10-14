interface BrandLogoProps {
  readonly variant?: "mark" | "horizontal";
  readonly className?: string;
  readonly alt?: string;
}

const FILES = {
  mark: { light: "/brand/mark-light.svg", dark: "/brand/mark-dark.svg" },
  horizontal: {
    light: "/brand/logo-horizontal-light.svg",
    dark: "/brand/logo-horizontal-dark.svg",
  },
} as const;

/** Both variants are rendered; CSS shows the one matching the active theme root. */
export function BrandLogo({ variant = "mark", className = "", alt = "Drawhaus" }: BrandLogoProps) {
  return (
    <>
      <img src={FILES[variant].light} alt={alt} className={`brand-on-light ${className}`} />
      <img src={FILES[variant].dark} alt={alt} className={`brand-on-dark ${className}`} />
    </>
  );
}
