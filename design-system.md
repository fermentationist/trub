# Trub Design System

Monospace-forward, dark, dense, high-contrast. Think Dischord Records inserts,
not SaaS dashboards. Borders over fills. Density over breathing room.

---

## Color

Grayscale palette with a single accent. Everything interactive is grayscale until
it has your attention, then it's orange.

| Token | Value | Usage |
|---|---|---|
| `--color-background` | `#0e0e0e` | Page background |
| `--color-surface` | `#161616` | Cards, panels, inputs |
| `--color-surface-raised` | `#1e1e1e` | Elevated surfaces (dropdowns, popovers) |
| `--color-surface-sunken` | `#0a0a0a` | Inset areas, code blocks |
| `--color-border` | `#2a2a2a` | Default borders |
| `--color-border-hover` | `#404040` | Borders on hover |
| `--color-text-primary` | `#e0e0e0` | Body text |
| `--color-text-secondary` | `#707070` | Labels, captions, metadata |
| `--color-text-muted` | `#4a4a4a` | Placeholders, disabled text |
| `--color-accent` | `#e8590c` | Interactive/active states, links, focus |
| `--color-accent-hover` | `#f07020` | Accent on hover |
| `--color-accent-muted` | `#e8590c33` | Selection highlight, subtle accent fill |
| `--color-success` | `#3d9a50` | Save confirmation, valid states |
| `--color-warning` | `#c4841d` | Dirty indicators, caution |
| `--color-error` | `#c83232` | Delete, destructive, invalid |

No light mode for now.

---

## Typography

Monospace everything. The interface is a tool, not a magazine.

**Font stack:**
```
"Berkeley Mono", "IBM Plex Mono", "JetBrains Mono", "Fira Code",
"SF Mono", "Cascadia Code", "Source Code Pro", ui-monospace,
"Menlo", "Monaco", "Consolas", monospace
```

**Scale (rem):**

| Token | Size | Usage |
|---|---|---|
| `--font-size-xs` | 0.6875 | Fine print, badges |
| `--font-size-sm` | 0.75 | Labels, nav links, table headers |
| `--font-size-md` | 0.8125 | Body text (base) |
| `--font-size-lg` | 0.9375 | Section headings, nav brand |
| `--font-size-xl` | 1.0625 | Page titles |
| `--font-size-2xl` | 1.25 | Hero numbers (stat values) |
| `--font-size-3xl` | 1.5 | Reserved |

**Weights:** 400 (normal), 500 (medium), 600 (bold). No 700+.

**Letter spacing:**

| Token | Value | Usage |
|---|---|---|
| `--letter-spacing-tight` | -0.01em | Dense numeric displays |
| `--letter-spacing-base` | 0 | Body text |
| `--letter-spacing-wide` | 0.06em | Nav links, labels |
| `--letter-spacing-caps` | 0.1em | Uppercase brand, section titles |

---

## Spacing

Tight scale. Density is a feature, not a bug.

| Token | Value |
|---|---|
| `--spacing-2xs` | 2px |
| `--spacing-xs` | 4px |
| `--spacing-sm` | 6px |
| `--spacing-md` | 10px |
| `--spacing-lg` | 16px |
| `--spacing-xl` | 24px |
| `--spacing-2xl` | 36px |

---

## Borders

Flat. No radius by default. Squares and lines.

| Token | Value |
|---|---|
| `--radius-sm` | 2px |
| `--radius-md` | 3px |
| `--radius-lg` | 4px |
| `--radius-full` | 9999px |
| `--border` | `1px solid var(--color-border)` |

Use `--radius-sm` or `--radius-md` sparingly. Most elements should have
sharp corners or 2px at most.

---

## Shadows

Barely there. This is flat design.

| Token | Value |
|---|---|
| `--shadow-sm` | `none` |
| `--shadow-md` | `0 1px 3px rgba(0,0,0,0.5)` |
| `--shadow-lg` | `0 2px 8px rgba(0,0,0,0.6)` |

Prefer borders over shadows. If you need elevation, use `--shadow-md` max.

---

## Component Patterns

### Buttons

```css
.button {
  padding: var(--spacing-xs) var(--spacing-md);
  background: transparent;
  color: var(--color-text-primary);
  border: var(--border);
  font-size: var(--font-size-sm);
  letter-spacing: var(--letter-spacing-wide);
  cursor: pointer;
}

.button:hover {
  border-color: var(--color-border-hover);
  color: var(--color-text-primary);
}

.button--primary {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.button--danger {
  border-color: var(--color-error);
  color: var(--color-error);
}
```

Buttons are outlined, not filled. The accent color is the border/text, not the
background. No border-radius. No shadows. No gradients.

### Inputs

```css
input, select, textarea {
  padding: var(--spacing-xs) var(--spacing-sm);
  background: transparent;
  color: var(--color-text-primary);
  border: var(--border);
  font-size: var(--font-size-sm);
}

input:focus, select:focus, textarea:focus {
  border-color: var(--color-accent);
  outline: none;
}
```

Inputs are transparent with a border. Focus brings the accent color to the
border. No background change, no glow, no box-shadow on focus.

### Cards / Panels

```css
.card {
  background: var(--color-surface);
  border: var(--border);
  padding: var(--spacing-lg);
}
```

No border-radius. No shadow. Just a bordered rectangle on a dark surface.

### Labels / Badges

```css
.label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-caps);
}
```

---

## What NOT to do

- No Material Design elevation system
- No Tailwind defaults or utility classes
- No rounded bubbly shapes (--radius-full only for tiny indicators like color swatches)
- No emoji as UI elements
- No large friendly buttons with generous padding
- No light/airy/breathable layouts
- No gradient backgrounds or fills
- No box-shadow on focus (use border-color change)
- No sans-serif anywhere
