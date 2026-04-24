# Trub v1 — Feature Specification

*April 2026*

---

## Overview

Trub is a local-first homebrewing recipe designer and water chemistry calculator, built as a PWA. It targets homebrewers who want modern, polished software without cloud lock-in, subscription gates, or black-box calculations.

**Tech stack:** Svelte + TypeScript + Vite + Dexie.js (IndexedDB). Sync via a self-hosted DIY server (v1.2+), not Dexie Cloud.

**v1 ships:** Recipe designer, water chemistry calculator, formula choice/documentation, BeerXML import/export, local storage, dark mode, responsive design.

**v1 does NOT ship:** Batch tracking, inventory management, shopping lists, brew timers, community features, device integrations, AI features. These are deferred to v1.1+.

---

## Package Architecture

The codebase is organized as a monorepo with separated concerns. This keeps the Svelte app clean and enables a future MCP server to reuse the calculation engine and type definitions without pulling in UI or storage dependencies.

```
trub/
├── packages/
│   ├── types/       # @trub/types — shared TypeScript interfaces
│   │                #   Recipe, FermentableEntry, HopEntry, WaterProfile,
│   │                #   EquipmentProfile, StyleGuideline, etc.
│   │                #   Zero dependencies.
│   │
│   ├── calc/        # @trub/calc — pure calculation engine
│   │                #   calculateIBU(), calculateSRM(), calculateABV(),
│   │                #   predictMashPH(), calculateStrikeTemp(), etc.
│   │                #   Depends only on @trub/types. No framework, no storage.
│   │
│   └── app/         # @trub/app — Svelte PWA
│                    #   UI components, Dexie schema, repository layer,
│                    #   Service Worker, PWA manifest.
│                    #   Imports @trub/types and @trub/calc.
│
├── (future)
│   └── mcp/         # @trub/mcp — MCP server
│                    #   Connects to Dexie Cloud backend (requires sync).
│                    #   Imports @trub/types and @trub/calc.
```

**Key rules:**
- `@trub/types` has zero dependencies. It's just interfaces and enums.
- `@trub/calc` depends only on `@trub/types`. Every function is pure: inputs in, result out, no side effects, no storage calls.
- `@trub/app` imports from both but neither package imports from `app`.
- Svelte components call calculation functions from `@trub/calc`, never inline the math.
- Data access in `app` goes through a repository service layer (e.g., `RecipeRepository.getById()`, `.save()`, `.list()`), not raw Dexie calls in components. This keeps the storage concern isolated even within the app package.

**MCP path (future):** The MCP server imports `@trub/types` and `@trub/calc`, connects to the same DIY sync backend API, and exposes tools like `list_recipes`, `get_recipe`, `calculate_ibu`, `adjust_water_chemistry`, etc. Sync must be enabled for MCP to work — this is an acceptable constraint since MCP users are inherently comfortable with their data being accessible to external processes.

---

## Data Model (Dexie.js Schema)

Recipes are stored as self-contained documents with embedded ingredient entries. Shared reference data (ingredient database, equipment profiles, water profiles, style guidelines) lives in separate tables.

### Tables

```
recipes:         ++id, name, *tags, styleId, equipmentId, waterProfileId, updatedAt, createdAt
ingredients:     ++id, name, type, category, [type+category]
equipmentProfiles: ++id, name, isDefault
waterProfiles:   ++id, name, isDefault, [isDefault]
styleGuidelines: ++id, name, category, source, [source+category]
settings:        key
```

### Recipe Document Shape (embedded in `recipes` table)

```typescript
interface Recipe {
  id?: number;
  name: string;
  author: string;
  type: 'allGrain' | 'biab' | 'partialMash' | 'extract';
  styleId: number | null;
  equipmentId: number | null;
  waterProfileId: number | null;
  tags: string[];
  notes: string;

  // Embedded ingredient entries (not references — full copies with amounts)
  fermentables: FermentableEntry[];
  hops: HopEntry[];
  yeast: YeastEntry[];
  misc: MiscEntry[];

  // Profiles (embedded snapshots, not references)
  mashSchedule: MashStep[];
  fermentationSchedule: FermentationStep[];
  waterAdjustments: WaterAdjustment;

  // Calculation settings per recipe
  ibuFormula: 'tinseth' | 'rager' | 'mibu';
  colorFormula: 'morey' | 'daniels' | 'mosher';
  abvFormula: 'simple' | 'alternate';

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

### Design Rationale

- **Recipes embed ingredient entries** (name, amount, alpha acid, etc.) rather than referencing the ingredient DB by ID. This makes recipes self-contained, portable, and safe from ingredient DB updates changing historical recipes.
- **Profiles are snapshotted** into the recipe at save time. If you change your equipment profile later, existing recipes keep their original settings.
- **Formula choice is per-recipe**, not global. This lets users compare the same recipe under different IBU calculations.
- **Shared reference data** (ingredient database, equipment profiles, water profiles, style guidelines) are separate tables that feed the search/autocomplete in the recipe designer. They're not synced by default — they ship as bundled seed data.

---

## Feature Specifications

### F1: Recipe Designer

The core screen. A single vertically-scrolling page where users build and edit recipes.

**Layout (top to bottom):**

1. **Header**
   - Recipe name (editable inline, large text)
   - Author (editable, smaller text)
   - Brew type selector: All Grain / BIAB / Partial Mash / Extract

2. **Style & Equipment Bar**
   - Style selector: search/autocomplete against style guidelines DB (BJCP 2021 as default, extensible)
   - Equipment profile selector: dropdown of saved profiles, with "Edit" and "New" shortcuts

3. **Stats Dashboard**
   - Horizontal slider bars for: OG, FG, IBU, SRM, ABV
   - Each bar shows: current calculated value as a marker, style guideline range as a shaded region behind it
   - SRM bar includes a filled-glass color preview icon
   - Below each value, a small label shows the formula in use (e.g., "Tinseth") — tapping/clicking links to the Calculations settings page
   - Values update in real-time as ingredients are added/changed

4. **Fermentables Section**
   - Collapsible card with "Fermentables" header and total weight displayed
   - "+" button opens ingredient search (autocomplete against ingredient DB)
   - Each entry row: name, amount (editable), % of grain bill (auto-calculated), Lovibond color dot
   - Drag handle for reordering
   - Swipe-to-delete on mobile, X button on desktop
   - Running subtotals: total weight, estimated OG contribution, estimated color contribution

5. **Hops Section**
   - Same card pattern as fermentables
   - Each entry row: name, amount, alpha acid % (editable, pre-filled from DB), time (min), use (Boil / Dry Hop / Whirlpool / First Wort / Mash)
   - Running subtotal: total IBU contribution, broken out per addition

6. **Yeast Section**
   - Name, attenuation % (editable, pre-filled from DB), temperature range, flocculation
   - Pitch rate calculator shortcut (shows recommended pitch based on OG and volume)
   - Support for multiple yeast entries (blends)

7. **Other / Miscellaneous Section**
   - Free-form entries for: spices, finings, acids, salts, fruit, honey, etc.
   - Each entry: name, amount, time, use stage

8. **Mash Schedule**
   - Step table: step name (e.g., "Saccharification Rest"), target temp, duration, type (Infusion / Decoction / Temperature)
   - Strike water calculator: input grain temp, target mash temp → shows strike water temp and volume
   - Pre-filled from equipment profile defaults, editable per recipe

9. **Fermentation Schedule**
   - Step table: stage name (e.g., "Primary"), target temp, duration (days)
   - Simple and editable

10. **Water Chemistry** (see F2 below — integrated into recipe designer as a collapsible section or linked sub-page)

11. **Notes**
    - Free-text area for recipe notes, brewing observations, goals

**Interactions:**
- All changes auto-save to Dexie (debounced, ~1s after last edit)
- Undo/redo support (at minimum, Ctrl+Z for the last edit; ideally a short history)
- Recipe scaling: a "Scale" button in the equipment section that proportionally adjusts all ingredient amounts to a new batch size while preserving recipe characteristics

---

### F2: Water Chemistry Calculator

Integrated into the recipe designer as a dedicated section or linked sub-view (not a separate page — avoid Brewer's Friend's fragmented calculator anti-pattern).

**Layout:**

1. **Source Water Profile**
   - Dropdown of saved water profiles + "Edit" / "New"
   - Mineral display: Ca, Mg, Na, SO₄, Cl, HCO₃ (ppm)
   - Editable per-mineral fields for one-off adjustments

2. **Target Water Profile**
   - Dropdown of style-based presets (e.g., "Hoppy/IPA", "Malty/Amber", "Balanced", "Pilsner") + custom
   - Same mineral display as source

3. **Salt Additions**
   - List of common brewing salts: Gypsum (CaSO₄), Calcium Chloride (CaCl₂), Epsom Salt (MgSO₄), Baking Soda (NaHCO₃), Chalk (CaCO₃), Table Salt (NaCl)
   - Amount input per salt (grams or teaspoons)
   - Real-time display of how each addition changes the mineral profile
   - "Auto-adjust" suggestion: given source + target, calculate recommended salt additions (optional nice-to-have)

4. **Resulting Water Profile**
   - Computed mineral values after salt additions
   - Visual diff: green (in target range), yellow (near edge), red (out of range)
   - Sulfate-to-Chloride ratio displayed prominently (key ratio for hop-forward vs. malt-forward balance)

5. **Mash pH Prediction**
   - Estimated mash pH based on: grain bill (from recipe fermentables), water profile (from this section), and any acid additions
   - Target pH range display (typically 5.2–5.6)
   - Acid addition calculator: select acid type (lactic, phosphoric, acidulated malt), show amount needed to hit target pH
   - Formula selection: document which pH model is in use

**Calculations:**
- Mineral additions follow standard brewing chemistry (salt → ion contribution by weight)
- Mash pH: implement a simplified version of the Kaiser/Bru'n Water model. Document the formula and its assumptions in the Calculations settings page.
- Sulfate-to-Chloride ratio: simple division, display as "X:1" or "1:X"

---

### F3: Calculation Engine & Formula Choice

**Settings → Calculations page:**

For each calculation type, show:
- Current formula selection (dropdown)
- Brief plain-English description of what the formula does
- Link to full documentation (in-app or external) showing the actual math

**Configurable formulas:**

| Calculation | Options | Default |
|---|---|---|
| IBU | Tinseth, Rager, mIBU (Hosom) | Tinseth |
| Color (SRM) | Morey, Daniels, Mosher | Morey |
| ABV | Simple ((OG-FG)×131.25), Alternate (more accurate) | Simple |
| Mash pH | Simplified Kaiser model | Kaiser |

**Per-recipe override:** Each recipe stores its own formula selections. Changing the global default only affects new recipes. Existing recipes keep their settings.

**Formula documentation page:** An in-app reference (could be a static markdown page rendered in the app) that shows each formula with its equation, variables, assumptions, and references. This is Trub's "nothing is hidden" commitment — accessible but not in your face.

---

### F4: Ingredient Database

Ships with a curated seed database. Users can add custom ingredients.

**Fermentables:**
- Fields: name, type (grain / sugar / extract / adjunct), origin, color (Lovibond), potential (PPG), yield %, diastatic power, max usage %, notes
- Seed data: ~200 common malts, sugars, extracts (sourced from BeerXML standard databases and manufacturer specs)

**Hops:**
- Fields: name, origin, alpha acid % (typical), beta acid %, form (pellet / whole / cryo), purpose (bittering / aroma / dual), substitutes, notes
- Seed data: ~150 common varieties

**Yeast:**
- Fields: name, lab, product code, type (ale / lager / wheat / wine / other), form (liquid / dry), attenuation range %, temperature range, flocculation (low / medium / high), notes
- Seed data: ~200 strains from major labs (Fermentis, Lallemand, White Labs, Wyeast, etc.)

**Misc:**
- Fields: name, type (spice / fining / water agent / herb / flavor / other), use stage, notes
- Seed data: ~50 common additions

**Custom ingredients:** Users can add/edit/delete custom entries. Custom entries are stored in Dexie alongside the seed data, flagged as `custom: true`. Seed data is read-only but can be "forked" into a custom copy for editing.

---

### F5: Equipment Profiles

**Fields:**
- Name
- Batch size (target volume into fermenter)
- Boil size (pre-boil volume)
- Boil time (minutes, default 60)
- Efficiency (brewhouse efficiency %, default 72)
- Evaporation rate (% per hour or volume per hour)
- Loss to trub/chiller (volume)
- Mash tun dead space (volume)
- Mash tun thermal mass (for strike water calculation)
- Mash thickness (water-to-grain ratio)

**Default profile:** One profile can be marked as default. New recipes inherit the default profile.

**Seed data:** Ship with 2–3 common setups:
- 5-gallon all-grain (standard cooler mash tun)
- 5-gallon BIAB
- 1-gallon small batch

---

### F6: Style Guidelines

**Source:** BJCP 2021 Style Guidelines (primary). Possibly Brewers Association guidelines as a secondary.

**Per style, store:**
- Name, category number, category name
- OG range (min/max)
- FG range (min/max)
- IBU range (min/max)
- SRM range (min/max)
- ABV range (min/max)
- Description (brief)

**Usage:** The stats dashboard sliders use these ranges for the shaded "in range" regions. Style selection auto-populates the range targets.

---

### F7: Recipe Management

**Recipe List View:**
- Card-based list (not a table)
- Each card shows: recipe name, style, brew type, OG/IBU/ABV summary, SRM color dot, last modified date, tags
- Sort by: newest, name, style, last modified
- Filter by: tag, brew type, style category
- Search: full-text search across recipe name, style, tags, notes

**Actions:**
- Create new recipe
- Duplicate recipe
- Delete recipe (with confirmation)
- Import recipe (BeerXML)
- Export recipe (BeerXML, PDF brew sheet)

**Tags:** Free-form, comma-separated. Autocomplete suggests existing tags.

---

### F8: BeerXML Import / Export

**Import:**
- Accept BeerXML 1.0 files (.xml)
- Parse and map to Trub's recipe format
- Handle missing/unknown ingredients gracefully (import as custom ingredients with a warning)
- Support importing multiple recipes from a single file

**Export:**
- Export individual recipes as BeerXML 1.0
- Export as PDF brew sheet (single-page printable summary)

**Why BeerXML:** It's the lingua franca of brewing software. Every competitor supports it. It's the migration path from BeerSmith, Brewfather, Brewer's Friend, and Brewtarget.

---

### F9: Settings

**Sections:**

1. **Units**
   - Volume: US Gallons / Liters
   - Weight: Pounds/Ounces / Kilograms/Grams
   - Temperature: Fahrenheit / Celsius
   - Gravity: Specific Gravity (1.050) / Plato (12.4°P)
   - Color: SRM / EBC / Lovibond
   - Pressure: PSI / Bar / kPa

2. **Calculations** (see F3)

3. **Equipment Profiles** (see F5, CRUD management)

4. **Water Profiles** (CRUD management of saved source/target profiles)

5. **Appearance**
   - Theme: Dark (default) / Light
   - (Future: custom accent color)

6. **Data**
   - Export all data (JSON backup)
   - Import data backup
   - Reset to defaults (with confirmation)
   - Sync settings (DIY sync server, when available — v1.2)

---

### F10: PWA Shell

- **Installable:** Add to home screen on mobile, install as desktop app
- **Offline-capable:** Full functionality without internet via Service Worker cache
- **Responsive:** Single codebase, fluid layout from ~360px (mobile) to ~1440px+ (desktop)
- **Auto-save:** All changes persist to IndexedDB immediately (debounced)
- **Fast load:** Target <2s first meaningful paint, <1s subsequent loads from cache

---

## Deferred Features (v1.1+)

| Feature | Target Version | Notes |
|---|---|---|
| Batch tracking / brew sessions | v1.1 | Gravity logging, fermentation charts, tasting notes |
| Brew timer | v1.1 | Countdown timers for mash steps and hop additions |
| Inventory management | v1.1 | Track ingredients on hand, auto-deduct on brew |
| Shopping list | v1.1 | Generated from recipe minus inventory |
| Cost tracking | v1.1 | Per-ingredient costs |
| Cloud sync (DIY server) | v1.2 | Self-hosted, open-source sync server. Single-writer multi-device, LWW conflict resolution. |
| MCP server | v1.2+ | Requires sync enabled. Connects to same DIY sync backend. Reuses @trub/types and @trub/calc. |
| Recipe versioning/snapshots | v1.2 | Save/restore versions of a recipe |
| Recipe scaling by efficiency | v1.2 | Scale not just by volume but by efficiency target |
| Community recipe library | v2.0 | Requires server infrastructure |
| Device integrations (Tilt, iSpindel) | v2.0 | IoT device connectivity |
| Wine / mead / cider / seltzer | v2.0 | Non-beer recipe types |
| Commercial brewing features | v2.0+ | Multi-batch, bbl scaling, TTB reporting |
| Plugin / extension system | v2.0+ | Custom formulas, community plugins |

---

## Open Questions

1. **Pitch rate calculator scope for v1:** Include a basic yeast pitch rate calculator (cells needed based on OG, volume, ale vs. lager)? Or defer? It's a small calculation but adds UI surface.

2. **PDF brew sheet format:** How much to invest in the printable brew sheet layout for v1? Could be a simple text dump or a designed PDF. Brewfather's and Brewer's Friend's sheets are nicely formatted.

3. **Ingredient DB sourcing:** Where to get the seed data? BeerXML community databases exist but may need cleaning. Alternatively, pull from open datasets and curate manually.

4. **Mash pH model complexity:** The full Kaiser/Bru'n Water model is quite complex (buffering capacity per grain type, acid malt contributions, etc.). How simplified should the v1 implementation be?

5. **Sync server design:** The v1.2 DIY sync server needs a few decisions: hosting model (self-host only, or also offer a free managed instance for convenience?), auth mechanism (sync tokens? email OTP?), and transport (REST API? WebSocket for realtime?). These can wait until v1 ships.

---

*This spec is a living document. Update as decisions are made and implementation progresses.*
