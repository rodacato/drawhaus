# Drawhaus Brand Guide

> Draw + Haus — a modern, indie, developer-centric diagramming tool.

---

## 1. Brand Concept

The Drawhaus identity is modern, modular, and digital-native. The visual system draws
from Bauhaus geometry but evolves it into something fresher — more tech, more indie,
less classical.

**The isotipo represents:**

- An abstract **D** (Drawhaus)
- A modular **house** structure
- A scalable, digital-first visual system

---

## 2. Logo System

### Assets

| Variant | Light BG | Dark BG |
|---------|----------|---------|
| Icon | [icon_light_bg.svg](icon_light_bg.svg) | [icon_dark_bg.svg](icon_dark_bg.svg) |
| Icon (transparent) | [icon_transparent_light.svg](icon_transparent_light.svg) | [icon_transparent.svg](icon_transparent.svg) |
| Icon (monochrome) | [icon_monochrome_light.svg](icon_monochrome_light.svg) | [icon_monochrome_dark.svg](icon_monochrome_dark.svg) |
| Horizontal logo | [logo_horizontal_light.svg](logo_horizontal_light.svg) | [logo_horizontal_dark.svg](logo_horizontal_dark.svg) |
| Stacked logo | [logo_stacked_light.svg](logo_stacked_light.svg) | [logo_stacked_dark.svg](logo_stacked_dark.svg) |
| Wordmark only | [wordmark_only_light.svg](wordmark_only_light.svg) | [wordmark_only_dark.svg](wordmark_only_dark.svg) |
| Favicon | [favicon_32.png](favicon_32.png) | — |

### Usage Guidelines

| Context | Variant |
|---------|---------|
| Landing page hero | Horizontal logo |
| App header / navbar | Horizontal logo (compact) |
| GitHub repo / CLI / app icon | Icon |
| Social media avatars | Icon monochrome |
| Favicon | Favicon 32x32 |
| Email / documents | Stacked logo |

### Clear Space

Maintain a minimum clear space around the logo equal to the height of the "D" in the
wordmark. Do not place other elements within this boundary.

### Don'ts

- Do not rotate or skew the logo
- Do not change the logo colors outside the defined palette
- Do not add drop shadows or effects
- Do not stretch or distort proportions

---

## 3. Color Palette

### Core

| Role | Hex | Preview |
|------|-----|---------|
| Accent Coral | `#E95B2D` | ![#E95B2D](https://placehold.co/24x24/E95B2D/E95B2D) |
| Accent Yellow | `#FBBF24` | ![#FBBF24](https://placehold.co/24x24/FBBF24/FBBF24) |
| Primary Blue | `#0EA5E9` | ![#0EA5E9](https://placehold.co/24x24/0EA5E9/0EA5E9) |
| Accent Orange | `#F97316` | ![#F97316](https://placehold.co/24x24/F97316/F97316) |
| Dark Base | `#111827` | ![#111827](https://placehold.co/24x24/111827/111827) |
| Light Base | `#F8FAF3` | ![#F8FAF3](https://placehold.co/24x24/F8FAF3/F8FAF3) |

### Semantic States

| State | Hex | Usage |
|-------|-----|-------|
| Success | `#10B981` | Confirmations, saved states |
| Warning | `#F59E0B` | Caution, pending actions |
| Error | `#EF4444` | Errors, destructive actions |
| Info | `#3B87F6` | Tips, informational messages |

### Usage Rules

- **Accent Coral** is the primary brand accent — logo, hero elements, CTAs
- **Accent Yellow** is for highlights and callouts — use sparingly
- **Primary Blue** is the main interactive color — buttons, links, active states
- **Accent Orange** is for badges, tags, and attention-grabbing elements
- **Dark Base** is the default background in dark mode
- **Light Base** is the default background in light mode (warm off-white, not pure white)

---

## 4. Typography

### Type Scale

| Role | Font | Weight | Fallback |
|------|------|--------|----------|
| Headings | **Sora** | 600 (SemiBold) | system-ui, sans-serif |
| Body | **Inter** | 400 (Regular) | system-ui, sans-serif |
| Monospace | **JetBrains Mono** | 400 (Regular) | ui-monospace, monospace |

### Font Sources

All fonts are available on [Google Fonts](https://fonts.google.com/) (free, open-source).

```
Sora:          https://fonts.google.com/specimen/Sora
Inter:         https://fonts.google.com/specimen/Inter
JetBrains Mono: https://fonts.google.com/specimen/JetBrains+Mono
```

### Guidelines

- Headings use **Sora** — modern, clean, geometric, digital-first
- Body text uses **Inter** — highly legible at all sizes, optimized for screens
- Code blocks and technical content use **JetBrains Mono**
- Minimum body size: 14px (web), 16px (mobile)
- Line height: 1.5 for body, 1.2 for headings

---

## 5. Brand Personality

### Archetype

**The Indie Builder** — a hacker-craftsman who values ownership, simplicity, and tools
that stay out of the way.

### Traits

| Trait | Meaning |
|-------|---------|
| Independent | Self-hosted, no vendor lock-in |
| Modular | Composable, extensible, no bloat |
| Clever | Smart defaults, thoughtful UX |
| Minimal | Only what you need, nothing more |
| Developer-centric | Built by devs, for devs |
| Self-host proud | Your data, your server, your rules |

### Tone of Voice

**Direct. Honest. Smart.**

- Write like you're talking to a peer, not a customer
- No enterprise buzzwords ("leverage", "synergy", "enterprise-grade")
- No filler ("we're excited to announce", "we believe that")
- Technical accuracy over marketing polish
- Okay to be opinionated

#### Examples

| Instead of... | Write... |
|---------------|----------|
| "We're thrilled to introduce our new feature" | "New: export to PNG and SVG" |
| "Enterprise-grade collaboration" | "Real-time collab, self-hosted" |
| "Leverage our powerful platform" | "Draw diagrams. Own your data." |

### Brand Descriptor

> **Diagrams & Whiteboards. Self-Hosted.**

Used as a subtitle beneath the logo in marketing materials, hero sections, and social banners.

### Tagline

> **"Your whiteboard, on your server."**

Alternatives:
- "Diagram freely. Own your data."
- "Draw. Connect. Self-host."

---

## 6. Implementation Reference

### CSS Custom Properties

```css
:root {
  /* Core */
  --color-accent-coral: #E95B2D;
  --color-accent-yellow: #FBBF24;
  --color-primary: #0EA5E9;
  --color-accent-orange: #F97316;
  --color-bg-dark: #111827;
  --color-bg-light: #F8FAF3;

  /* States */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-info: #3B87F6;

  /* Typography */
  --font-heading: 'Sora', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
}
```

### Tailwind Config

```js
colors: {
  primary: '#0EA5E9',
  accent: {
    coral: '#E95B2D',
    yellow: '#FBBF24',
    orange: '#F97316',
  },
  base: {
    dark: '#111827',
    light: '#F8FAF3',
  },
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B87F6',
},
fontFamily: {
  heading: ['Sora', 'system-ui', 'sans-serif'],
  body: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
},
```
