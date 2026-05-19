# Trub — Project Plan

_April 2026 — Living document. Update as decisions are made and implementation progresses._

---

## Overview

Trub is a local-first homebrewing recipe designer and water chemistry calculator, built as a PWA.
It targets homebrewers who want modern, polished software without cloud lock-in, subscription
gates, or black-box calculations.

**Tech stack:** Svelte 5 + TypeScript + Vite + svelte-spa-router + Dexie.js (IndexedDB)

**v1 ships:** Recipe designer, water chemistry calculator, formula choice and documentation,
BeerXML import/export, local storage, dark mode, responsive design.

**v1 does NOT ship:** Batch tracking, inventory management, shopping lists, brew timers,
community features, device integrations, AI features, cloud sync. These are deferred to v1.1+.

---

## Positioning

Trub's differentiator — **local-first + transparent/editable formulas** — has no direct
competitor. The specific value propositions:

1. **Nothing is hidden.** Every calculation is documented and formula choice is user-configurable.
   The daily-use expression is formula _choice_ (switch IBU methods, watch the number change).
   The deeper expression is that all math is open and documented.
2. **Local-first with zero friction.** No signup, no account, no cloud. Open the app, start
   designing. Data lives on your device. Export whenever.
3. **Modern UI on local data.** The visual polish of Brewfather with the data ownership of
   Brewtarget. This gap is real and nobody fills it.

---

## Package Architecture (Monorepo)

```
trub/
├── packages/
│   ├── types/     # @trub/types — shared TypeScript interfaces and enums. Zero dependencies.
│   ├── calc/      # @trub/calc — pure calculation engine. Depends only on @trub/types.
│   │              #   No framework, no storage, no side effects.
│   └── app/       # @trub/app — Svelte PWA. Imports @trub/types and @trub/calc.
│                  #   UI components, Dexie schema, repository layer, Service Worker.
│
└── (future)
    ├── sync-server/ # @trub/sync-server — tRPC router + server-side storage (v1.2+)
    └── mcp/         # @trub/mcp — MCP server (v1.2+). Requires sync to be enabled.
```

**Key rules:**

- `@trub/types` has zero dependencies — interfaces and enums only.
- `@trub/calc` depends only on `@trub/types`. Every function is pure: inputs in, result out.
- `@trub/app` imports from both; neither package imports from `app`.
- Svelte components call calculation functions from `@trub/calc`, never inline the math.
- Data access in `app` goes through a repository layer (e.g., `RecipeRepository.get_by_id()`,
  `.save()`, `.list()`), never raw Dexie calls in components.

---

## Storage Decision

**Chosen: Dexie.js (client only for v1). DIY sync server deferred to v1.2.**

Dexie Cloud was evaluated and rejected — its self-hosted pricing (€3,495+ one-time) conflicts
with Trub's open-source, zero-cost philosophy. The SaaS tier creates ongoing cost that Trub
would need to absorb or pass on.

**v1:** Dexie.js client only. No sync. All data local.

**v1.2:** Lightweight self-hostable DIY sync server using **tRPC**.

Sync operations are inherently procedure-shaped — `push_changes`, `pull_changes`, `get_status`.
tRPC is the natural fit. The router imports from `@trub/types`, so `@trub/app` and `@trub/mcp`
both get full end-to-end type safety with zero code generation. Change a type in `@trub/types`
and both clients fail at compile time if something breaks.

Sync router procedures:

```
auth.create_token   — generate a sync token for a device
auth.verify         — verify a token is valid
sync.push           — send local changes (records modified since last sync)
sync.pull           — fetch remote changes since a given timestamp
sync.status         — last sync time, record counts per table
```

Transport: HTTP (matches push/pull polling). tRPC WebSocket subscriptions are available if
realtime sync is needed later — no architecture change required.

Implementation details:

- Add `updated_at` and `sync_version` fields to each Dexie table
- Server storage: SQLite/Postgres (or Cloudflare Worker + D1)
- Conflict resolution: Last-Writer-Wins by `updated_at` (sufficient for single-writer)
- Auth: token-based (user generates a sync token in the app, uses it on other devices)

---

## Data Model (Dexie Schema)

```
recipes:           ++id, name, *tags, style_id, equipment_id, water_profile_id, updated_at, created_at
ingredients:       ++id, name, type, category, [type+category]
equipment_profiles: ++id, name, is_default
water_profiles:    ++id, name, is_default, [is_default]
style_guidelines:  ++id, name, category, source, [source+category]
settings:          key
```

### Recipe Document Shape

```typescript
interface Recipe {
  id?: number;
  name: string;
  author: string;
  type: "all_grain" | "biab" | "partial_mash" | "extract";
  style_id: number | null;
  equipment_id: number | null;
  water_profile_id: number | null;
  tags: string[];
  notes: string;

  // Embedded ingredient entries (full copies with amounts, not DB references)
  fermentables: FermentableEntry[];
  hops: HopEntry[];
  yeast: YeastEntry[];
  misc: MiscEntry[];

  // Profiles (snapshotted at save time — changes to profiles don't affect existing recipes)
  mash_schedule: MashStep[];
  fermentation_schedule: FermentationStep[];
  water_adjustments: WaterAdjustment;

  // Per-recipe formula selection
  ibu_formula: "tinseth" | "rager" | "mibu";
  color_formula: "morey" | "daniels" | "mosher";
  abv_formula: "simple" | "alternate";

  // Per-recipe display unit overrides (see Unit System section)
  display_unit_overrides: RecipeUnitOverrides;

  created_at: Date;
  updated_at: Date;
}
```

**Design rationale:**

- Recipes embed ingredient entries rather than referencing the ingredient DB by ID. Recipes are
  self-contained, portable, and safe from ingredient DB updates changing historical data.
- Profiles are snapshotted into the recipe at save time.
- Formula choice is per-recipe. Changing the global default only affects new recipes.

---

## Unit System

### Canonical Storage Units

All values are converted to canonical units before writing to Dexie. Canonical units are the
BeerXML standard for most dimensions.

| Dimension        | Canonical Unit        | Notes                                    |
| ---------------- | --------------------- | ---------------------------------------- |
| Volume           | liters (L)            |                                          |
| Weight           | kilograms (kg)        |                                          |
| Temperature      | Celsius (°C)          |                                          |
| Time             | minutes               |                                          |
| Color            | SRM                   |                                          |
| Gravity          | specific gravity (SG) |                                          |
| Pressure         | kPa                   |                                          |
| Evaporation rate | L/hr                  | Volume rate — NOT percentage (see below) |

### Unit Preference Categories

Users configure display units at a granular per-category level, not just "metric vs imperial":

| Category     | Key            | Available Units      | Notes                  |
| ------------ | -------------- | -------------------- | ---------------------- |
| Batch volume | `BATCH_VOLUME` | gal (US), L          | Main recipe volumes    |
| Small volume | `SMALL_VOLUME` | mL, tsp, tbsp, fl oz | Water additions, acids |
| Grain weight | `GRAIN_WEIGHT` | lb+oz, kg            | Fermentables           |
| Hop weight   | `HOP_WEIGHT`   | oz, g                | Never lb or kg         |
| Misc weight  | `MISC_WEIGHT`  | g, oz, tsp           | Finings, spices, salts |
| Temperature  | `TEMPERATURE`  | °F, °C               |                        |
| Gravity      | `GRAVITY`      | SG (1.0xx), Plato    | Non-linear conversion  |
| Color        | `COLOR`        | SRM, EBC, Lovibond   | Non-linear conversion  |
| Pressure     | `PRESSURE`     | PSI, kPa, bar        | Carbonation (v1.1+)    |
| Evap rate    | `EVAP_RATE`    | gal/hr, L/hr         | Volume rate — never %  |

### Inline Unit Override

Every unit label in the UI is clickable. Selecting an alternate unit converts the displayed value
without touching the stored canonical value or the user's preferences. Overrides are stored
per-recipe on the recipe document (`display_unit_overrides: Partial<UnitPreferences>`) so each
recipe remembers its own display units across sessions.

**Data flow:**

```
User types a value
  → UnitValue component converts display → canonical
  → RecipeRepository saves canonical value to Dexie

Recipe loads
  → canonical values read from Dexie
  → effective_unit_preferences = global prefs merged with recipe.display_unit_overrides
  → UnitValue converts canonical → display for render

User clicks unit label → selects alternate unit
  → recipe.display_unit_overrides updated in Dexie
  → effective_unit_preferences re-derives → display re-renders
  → no canonical values touched
```

### Conversion Library

Use **`convert`** (npm) for linear dimensions. Gravity (SG↔Plato) and color
(SRM↔EBC↔Lovibond) are non-linear — implement as pure functions in `@trub/calc`.

### Evaporation Rate: Volume Rate, Not Percentage

Evaporation is a physical process driven by kettle surface area and boil vigor — it does not
scale proportionally with volume. `1.5 gal/hr` is `1.5 gal/hr` regardless of whether you
started with 6 or 8 gallons. Storing it as a percentage is physically wrong and breaks recipe
scaling.

BeerXML stores `EVAP_RATE` as a percentage. Trub stores it as L/hr (canonical) or gal/hr
(display). The percentage convention is handled only at the BeerXML import/export boundary:

```typescript
// Import: BeerXML % → L/hr
const evap_rate_l_per_hr = (beerxml_evap_rate_pct / 100) * beerxml_boil_size_liters;

// Export: L/hr → BeerXML %
const evap_rate_pct = (evap_rate_l_per_hr / boil_size_liters) * 100;
```

---

## Feature Specifications

### F1: Recipe Designer

Single vertically-scrolling page. Layout top to bottom:

1. **Header** — recipe name (editable inline), author, brew type selector
2. **Style & Equipment Bar** — style search/autocomplete, equipment profile selector
3. **Stats Dashboard** — horizontal slider bars for OG, FG, IBU, SRM, ABV with style guideline
   ranges as shaded regions. SRM bar includes filled-glass color preview. Formula label below
   each value links to the Calculations settings page. Values update in real time.
4. **Fermentables** — collapsible card, "+" to search/add, rows show name/amount/%/color dot,
   drag to reorder, swipe-to-delete mobile / X button desktop
5. **Hops** — same pattern, rows show name/amount/AA%/time/use
6. **Yeast** — name, attenuation %, temp range, flocculation
7. **Misc** — free-form entries: name, amount, time, use stage
8. **Mash Schedule** — step table with strike water calculator, pre-filled from equipment profile
9. **Fermentation Schedule** — step table: name, temp, duration
10. **Water Chemistry** — integrated section (see F2)
11. **Notes** — free-text area

All changes auto-save to Dexie (debounced ~1s). Undo/redo support (at minimum Ctrl+Z for last
edit). Recipe scaling: proportional adjustment of all ingredient amounts to a new batch size.

### F2: Water Chemistry Calculator

Integrated into the recipe designer as a dedicated section — not a separate page.

1. **Source Water Profile** — dropdown of saved profiles + edit/new, mineral fields (Ca, Mg,
   Na, SO₄, Cl, HCO₃ in ppm), editable per-mineral fields for one-off adjustments
2. **Target Water Profile** — style-based presets (Hoppy/IPA, Malty, Balanced, Pilsner) + custom
3. **Salt Additions** — gypsum, calcium chloride, Epsom salt, baking soda, chalk, table salt;
   real-time display of how each addition changes the mineral profile
4. **Resulting Profile** — computed minerals with visual diff (green/yellow/red for range),
   sulfate-to-chloride ratio displayed prominently
5. **Mash pH Prediction** — estimated pH from grain bill, water profile, and acid additions;
   target range display; acid addition calculator (lactic, phosphoric, acidulated malt)

### F3: Calculation Engine & Formula Choice

Settings → Calculations page shows each formula with a plain-English description and a link to
full documentation with the actual math.

| Calculation | Options                | Default     |
| ----------- | ---------------------- | ----------- |
| IBU         | Tinseth, Rager, mIBU   | Tinseth     |
| Color (SRM) | Morey, Daniels, Mosher | Morey       |
| ABV         | Simple, Alternate      | Simple      |
| Mash pH     | Bru'n Water, Kaiser    | Bru'n Water |

Formula choice is per-recipe. Global default only affects new recipes.

### F4: Ingredient Database

Ships with curated seed data. Users can add custom ingredients (flagged `custom: true`). Seed
data is read-only but can be "forked" into a custom copy.

- **Fermentables** (~200): name, type, origin, color (Lovibond), potential (PPG), yield %,
  diastatic power, max usage %, notes
- **Hops** (~150): name, origin, alpha acid % (typical), beta acid %, form, purpose,
  substitutes, notes
- **Yeast** (~200): name, lab, product code, type, form, attenuation range %, temperature range,
  flocculation, notes
- **Misc** (~50): name, type, use stage, notes

### F5: Equipment Profiles

Fields: name, batch size, boil size, boil time, efficiency %, evaporation rate (L/hr — see Unit
System section), loss to trub/chiller, mash tun dead space, mash tun thermal mass, mash
thickness. One profile can be marked as default; new recipes inherit it.

Ships with seed profiles: 5-gallon all-grain, 5-gallon BIAB, 1-gallon small batch.

### F6: Style Guidelines

Source: BJCP 2021 (primary). Per style: name, category number, OG/FG/IBU/SRM/ABV ranges,
description. Used for the stats dashboard slider shading.

### F7: Recipe Management

Card-based list. Each card: name, style, brew type, OG/IBU/ABV summary, SRM color dot, last
modified, tags. Sort by newest/name/style/last modified. Filter by tag/brew type/style category.
Full-text search. Actions: create, duplicate, delete (with confirmation), import BeerXML,
export BeerXML/PDF.

### F8: BeerXML Import / Export

- **Import:** BeerXML 1.0 (.xml). Map to Trub format. Unknown ingredients imported as custom
  with a warning. Multiple recipes per file supported.
- **Export:** BeerXML 1.0 + PDF brew sheet.
- Evaporation rate converted between L/hr (Trub) and percentage (BeerXML) at the boundary.

### F9: Settings

1. **Units** — per-category unit preferences (see Unit System section)
2. **Calculations** — formula choices with documentation links (see F3)
3. **Equipment Profiles** — CRUD management
4. **Water Profiles** — CRUD management of source/target profiles
5. **Appearance** — Dark (default) / Light theme
6. **Data** — export all (JSON backup), import backup, reset to defaults, sync settings (v1.2)

### F10: PWA Shell

- Installable (add to home screen, install as desktop app)
- Offline-capable via Service Worker cache
- Responsive from ~360px to 1440px+
- Auto-save (debounced, all changes persist to IndexedDB immediately)
- Target: <2s first meaningful paint, <1s subsequent loads from cache

---

## UI Patterns

- **Stats dashboard:** Horizontal slider bars with style range as shaded region (Brewfather
  pattern — now the expected standard)
- **Ingredient sections:** Collapsible cards, "+" to search/add, inline table editing,
  drag-to-reorder
- **Dark mode as default**
- **Navigation:** Sidebar on desktop (Recipes / Settings), bottom tabs on mobile. Brew Sessions
  and Inventory nav items are deferred to v1.1 — no stub entries in v1.
- **Formula controls in settings, not in the recipe designer.** Formula is exposed as a small
  label under each stat value linking to settings — not as inline controls.
- **Color preview:** Filled glass/vessel icon that updates with estimated SRM color
- **No toolbar-heavy desktop chrome** (BeerSmith anti-pattern)
- **No fragmented calculator pages** (Brewer's Friend anti-pattern)

---

## Calculation Formulas (v1 Must-Have)

- OG: PPG × weight / volume, adjusted for efficiency
- FG: OG adjusted by yeast attenuation
- ABV: simple `(OG - FG) × 131.25` or alternate
- IBU: Tinseth, Rager, mIBU (Hosom)
- SRM: Morey `SRM = 1.4922 × MCU^0.6859`
- Strike water temp and volume
- Pre-boil gravity and boil-off
- Mash pH: Bru'n Water model (default) and Kaiser model (user-selectable)
- Water mineral additions (salt → ion contribution by weight)
- Sulfate-to-chloride ratio

---

## Deferred Features

| Feature                  | Target |
| ------------------------ | ------ |
| Batch tracking           | v1.1   |
| Brew timer               | v1.1   |
| Inventory management     | v1.1   |
| Shopping list            | v1.1   |
| Cost tracking            | v1.1   |
| Cloud sync (DIY server)  | v1.2   |
| MCP server               | v1.2+  |
| Recipe versioning        | v1.2   |
| Pitch rate calculator    | v2.0   |
| Community recipe library | v2.0   |
| Device integrations      | v2.0   |
| Wine/mead/cider/seltzer  | v2.0   |
| Commercial brewing       | v2.0+  |
| Plugin/extension system  | v2.0+  |

---

## Resolved Decisions

| Question                    | Decision                                                                                                                                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pitch rate calculator scope | Deferred to v2.0. No shortcut in v1 yeast section.                                                                                                                                                 |
| PDF brew sheet format       | Styled layout (not a plain text dump).                                                                                                                                                             |
| Ingredient DB sourcing      | Scrape and clean BeerXML community databases.                                                                                                                                                      |
| Mash pH model               | Bru'n Water as default, Kaiser as user-selectable option.                                                                                                                                          |
| Storage/sync                | Dexie.js local-only for v1; DIY tRPC sync server in v1.2.                                                                                                                                          |
| Undo/redo strategy          | Snapshot-based, in-memory history stack in a Svelte store. Push recipe state before each debounced save; Ctrl+Z pops and writes back to Dexie. Stack does not survive page refresh — session-only. |
| Routing                     | svelte-spa-router (hash-based). TanStack Router has no Svelte adapter. Hash routing is ideal for offline PWA — no server fallback needed.                                                          |
| Settings page structure     | Single `/settings` route with internal tabs (Units, Calculations, Equipment, Water Profiles, Appearance, Data). Not sub-routes.                                                                    |

---

## Implementation Phasing

Feature-vertical: build one calculation end-to-end (type → calc → test → component → E2E) before
starting the next. This surfaces integration issues early and produces a demoable app faster.

| Phase | Scope                                                                                                                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------- |
| 0     | Scaffold monorepo (root tooling, package skeletons, dev pipeline)                                                         |
| 1     | Types + Dexie schema + repository layer skeleton                                                                          |
| 2     | OG/FG/ABV vertical (fermentable types → calc → unit tests → recipe designer fermentables section → stats dashboard → E2E) |
| 3     | IBU vertical (hop types → calc → hops section → IBU stat)                                                                 |
| 4     | SRM/Color vertical (color calc → color preview → SRM stat)                                                                |
| 5     | Water chemistry vertical (water profiles → salt additions → mash pH with Bru'n Water + Kaiser)                            |
| 6     | Ingredient database (seed data scraping, search/autocomplete)                                                             |
| 7     | Equipment profiles, mash schedule, fermentation schedule                                                                  |
| 8     | BeerXML import/export                                                                                                     |
| 9     | Settings, recipe management (list/filter/search), PDF export                                                              |
| 10    | PWA shell (Service Worker, manifest, install prompt)                                                                      |

---

## Open Questions

1. **Sync server design (v1.2):** Self-host only vs. free managed instance? Auth mechanism?
   REST vs. WebSocket? _(Deferred — not blocking v1.)_
2. **Design tokens:** Must be generated via claude.ai/design before UI implementation begins.
   Token file will live at `packages/app/src/app.css`. Scaffold includes a placeholder with the
   required token categories; replace with real values from the design tool before building components.
