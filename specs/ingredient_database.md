# Ingredient Database & Snapshot System

## Context

Trub needs a built-in ingredient library so users can browse and select from common hops, fermentables, yeast, and misc ingredients when building recipes. Edits to library ingredients must never retroactively change existing recipes — solved by snapshot-on-add (copy properties into recipe at add time). No versioning, no sync, no UI — types, data, and logic only.

## Existing State

The architecture already partially supports this:
- **Library types** exist: `Fermentable`, `Hop`, `Yeast`, `MiscIngredient` with `id`, `custom`, and template properties (`packages/types/src/ingredients.ts`)
- **Recipe entry types** exist: `FermentableEntry`, `HopEntry`, `YeastEntry`, `MiscEntry` — denormalized snapshots with recipe-specific fields (`amount_kg`, `time_minutes`, etc.)
- **Dexie `ingredients` table** exists: `"++id, name, type, category, [type+category]"` (`packages/app/src/lib/db.ts`)
- **`ingredient_repository.ts`** exists with CRUD + `list_by_category` + `search`

What's missing: **no provenance link**, **no seed data**, **no snapshot utility**.

---

## Implementation Plan

### Phase 1: Type Changes

**File: `packages/types/src/ingredients.ts`**

Add `source_ingredient_id: number | null` to all four recipe entry types:
- `FermentableEntry` (line 86)
- `HopEntry` (line 98)
- `YeastEntry` (line 109)
- `MiscEntry` (line 121)

Using `number | null` (not optional `?:`) — makes provenance semantics explicit: `null` = "no library source" or "manually entered", a number = "snapshotted from this library ingredient."

**Ripple effect** — these files need `source_ingredient_id: null` added to their DEFAULT_ objects:
- `packages/app/src/components/fermentables_section/fermentables_section.svelte` (line 19)
- `packages/app/src/components/hops_section/hops_section.svelte` (line 24)
- `packages/app/src/components/yeast_section/yeast_section.svelte` (line 20)
- `packages/app/src/components/misc_section/misc_section.svelte` (line 25)

The `@trub/calc` functions are unaffected — they use `Pick<>` to select only the fields they need.

### Phase 2: Snapshot Utility

**New file: `packages/calc/src/snapshot.ts`**

Pure data transforms — library ingredient + recipe-specific params -> recipe entry. Lives in `@trub/calc` because it's a pure function with no side effects.

Four functions:

```typescript
snapshot_fermentable(
  ingredient: Fermentable,
  params: { amount_kg: number; percentage: number }
): FermentableEntry

snapshot_hop(
  ingredient: Hop,
  params: { amount_kg: number; time_minutes: number; use: HopUse }
): HopEntry

snapshot_yeast(
  ingredient: Yeast,
  params: { attenuation_pct: number }
): YeastEntry

snapshot_misc(
  ingredient: MiscIngredient,
  params: { amount_kg: number; time_minutes: number }
): MiscEntry
```

Each copies template fields from the library ingredient, merges recipe-specific params, and sets `source_ingredient_id` to `ingredient.id ?? null`.

Note: `Yeast` has `attenuation_min`/`attenuation_max` range but `YeastEntry` has single `attenuation_pct`. The caller provides the value (typically midpoint or user-selected).

**Export from: `packages/calc/src/index.ts`**

### Phase 3: Seed Data

**New directory: `packages/app/src/lib/seed/`**

Seed data belongs in `@trub/app` (runtime concern), not `@trub/types` (zero-dependency) or `@trub/calc` (pure math).

```
packages/app/src/lib/seed/
  fermentables.ts   — Omit<Fermentable, "id">[]  (~25 entries)
  hops.ts           — Omit<Hop, "id">[]           (~25 entries)
  yeast.ts          — Omit<Yeast, "id">[]          (~15 entries)
  misc.ts           — Omit<MiscIngredient, "id">[] (~15 entries)
  index.ts          — barrel re-export
```

All seed entries: `custom: false`. IDs omitted (Dexie auto-increments). Values in canonical units with standard reference data (typical alpha acids, PPG, attenuation ranges, etc.).

**Seed data content guidance:**

Fermentables (~25): Base malts (2-Row, Maris Otter, Pilsner, Munich, Vienna, Wheat), specialty malts (Crystal 40/60/80/120, Chocolate, Roasted Barley, Black Patent, Carapils, Biscuit, Special B, Melanoidin), sugars/extracts (Table Sugar, Corn Sugar, Light DME, Light LME, Honey), adjuncts (Flaked Oats, Flaked Wheat, Rice Hulls).

Hops (~25): American (Cascade, Centennial, Chinook, Citra, Columbus, Amarillo, Mosaic, Simcoe, Warrior), European (Saaz, Hallertau, Tettnang, East Kent Goldings, Fuggle, Styrian Goldings), other (Galaxy, Nelson Sauvin, Magnum, Northern Brewer, Perle, Willamette, Mt. Hood).

Yeast (~15): Dry ale (US-05/Safale, S-04, Nottingham, Windsor), dry lager (W-34/70, S-23), liquid benchmarks (WLP001, WY1056, WLP002, WY1968, WLP810, WY2206, WLP300, WY3068).

Misc (~15): Kettle finings (Irish Moss, Whirlfloc), water salts (Gypsum, Calcium Chloride, Epsom Salt, Baking Soda, Chalk, Table Salt), acids (Lactic Acid, Phosphoric Acid), common spices (Coriander, Orange Peel, Vanilla Beans).

### Phase 4: Seed Population

**File: `packages/app/src/lib/db.ts`**

Use Dexie's `on("populate")` hook — fires exactly once when the database is first created. Idiomatic, atomic, no race conditions.

```typescript
import {
  SEED_FERMENTABLES,
  SEED_HOPS,
  SEED_YEAST,
  SEED_MISC,
} from "./seed";

// Inside constructor, after version(1).stores({...}):
this.on("populate", (tx) => {
  tx.table("ingredients").bulkAdd([
    ...SEED_FERMENTABLES,
    ...SEED_HOPS,
    ...SEED_YEAST,
    ...SEED_MISC,
  ]);
});
```

No schema version bump needed — `source_ingredient_id` lives inside recipe JSON blobs (non-indexed), and the `ingredients` table indexes are unchanged.

### Phase 5: Snapshot Tests

**New file: `packages/calc/src/__tests__/snapshot.test.ts`**

Test each snapshot function:
- All library fields copied correctly
- Recipe-specific params merged from params arg
- `source_ingredient_id` set to `ingredient.id` when present, `null` when `id` is `void 0`
- Omitted fields not present (`diastatic_power`, `max_usage_pct`, `beta_acid_pct`, `purpose`, `substitutes`)

---

## File Change Summary

| File | Action |
|------|--------|
| `packages/types/src/ingredients.ts` | Add `source_ingredient_id: number \| null` to 4 entry types |
| `packages/calc/src/snapshot.ts` | **New** — 4 snapshot functions |
| `packages/calc/src/index.ts` | Add snapshot exports |
| `packages/calc/src/__tests__/snapshot.test.ts` | **New** — unit tests |
| `packages/app/src/lib/seed/fermentables.ts` | **New** — seed data |
| `packages/app/src/lib/seed/hops.ts` | **New** — seed data |
| `packages/app/src/lib/seed/yeast.ts` | **New** — seed data |
| `packages/app/src/lib/seed/misc.ts` | **New** — seed data |
| `packages/app/src/lib/seed/index.ts` | **New** — barrel export |
| `packages/app/src/lib/db.ts` | Add seed import + `on("populate")` hook |
| `packages/app/src/components/fermentables_section/fermentables_section.svelte` | Add `source_ingredient_id: null` to DEFAULT |
| `packages/app/src/components/hops_section/hops_section.svelte` | Add `source_ingredient_id: null` to DEFAULT |
| `packages/app/src/components/yeast_section/yeast_section.svelte` | Add `source_ingredient_id: null` to DEFAULT |
| `packages/app/src/components/misc_section/misc_section.svelte` | Add `source_ingredient_id: null` to DEFAULT |

---

## Design Decisions

- **Single `ingredients` table** (not split by category): already exists, compound index handles per-category queries, ~80 seed rows don't need optimization.
- **`on("populate")`** over settings flag or empty-table check: atomic, no race conditions, documented Dexie pattern.
- **`number | null`** over optional `?: number`: always-present field with explicit semantics, simpler null checks.
- **Separate snapshot functions per category** (not one generic): each has different field mappings — a generic would lose type safety.
- **Seed data in `@trub/app`** (not `@trub/types` or `@trub/calc`): types package is zero-dependency, calc is pure math. Seed data is a runtime concern of the app layer.

---

## Verification

1. `pnpm type-check` — confirms `source_ingredient_id` additions don't break existing code
2. `pnpm --filter @trub/calc test` — snapshot unit tests pass
3. `pnpm lint` — no lint errors
4. Manual smoke test: clear IndexedDB, reload app, verify ingredients populate via browser DevTools (Application -> IndexedDB -> trub -> ingredients)
