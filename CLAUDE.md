# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```bash
# Install all dependencies
pnpm install

# Start the app dev server (http://localhost:5173)
pnpm dev
# or scoped:
pnpm --filter @trub/app dev

# Build the app
pnpm build

# Type-check all packages
pnpm type-check

# Lint all packages
pnpm lint

# Format all files
pnpm format

# Run all tests (unit + E2E)
pnpm test

# Run only @trub/calc unit tests
pnpm --filter @trub/calc test

# Run unit tests in watch mode
pnpm --filter @trub/calc test:watch

# Run a single test file
pnpm --filter @trub/calc exec vitest run src/__tests__/ibu.test.ts

# Run E2E tests (requires dev server running)
pnpm --filter @trub/app test:e2e

# Run a single E2E spec
pnpm --filter @trub/app exec playwright test e2e/recipe/create_recipe.spec.ts
```

---

## Architecture

Trub is a monorepo of five packages with a strict one-way dependency graph:

```
@trub/types  ←  @trub/calc  ←  @trub/app
                                    ↑
                          @trub/sync-server (v1.2, placeholder)
                                    ↑
                              @trub/mcp (v1.2+, placeholder)
```

**`@trub/types`** (`packages/types/`) — zero dependencies. TypeScript interfaces, enums, and Zod schemas shared across packages. Every domain type lives here.

**`@trub/calc`** (`packages/calc/`) — pure calculation engine. Every function is pure: inputs in, result out, no side effects, no storage. IBU, OG, FG, ABV, SRM, mash pH, water chemistry, unit conversions. Tested with Vitest.

**`@trub/app`** (`packages/app/`) — Svelte 5 PWA. Plain Svelte + Vite with svelte-spa-router for client-side routing. Dexie.js for IndexedDB storage. All data access goes through the repository layer — never raw Dexie calls in components.

**`@trub/sync-server`** (`packages/sync-server/`) — tRPC sync server, v1.2. Placeholder only.

**`@trub/mcp`** (`packages/mcp/`) — MCP server, v1.2+. Placeholder only.

### Key Patterns

**Repository layer:** Svelte components never call Dexie directly. All reads/writes go through `packages/app/src/repositories/`. `liveQuery()` subscriptions belong in stores or repositories.

**Calc boundary:** No inline brewing math in components. All calculations call `@trub/calc` functions.

**Unit system:** All values stored in canonical units (liters, kg, °C, SRM, SG, L/hr). Display is handled by the `UnitValue` component, which reads `UnitPreferences` and per-recipe `display_unit_overrides`. The `convert` library handles linear conversions; SG↔Plato and SRM↔EBC↔Lovibond are custom pure functions in `@trub/calc`.

**Naming:** `snake_case` for all file names, `SCREAMING_SNAKE_CASE` for constants. Kebab-case is forbidden.

**Design system & tokens:** UI is built on a design system from claude.ai/design. Every visual value (color, spacing, typography, border-radius, shadow) must use a design token CSS custom property — `var(--color-surface)`, `var(--spacing-md)`, etc. Never hardcode visual values. The app will expose a user-configurable theme system backed by these tokens; hardcoded values break it.

**Utility reuse:** Search `packages/app/src/lib/` and `packages/calc/src/` for an existing utility before writing a new one. Extend near-matches rather than duplicating them.

**Svelte 5 runes:** Use `$props()`, `$state()`, `$derived()`, `$effect()`. No `export let`, no `$:` reactive statements, no `on:event` directives in new code.

**Testing:** Every new calc function needs unit tests. Every new user flow needs an E2E test. Bug fixes need regression tests. `data-testid` attributes on all interactive elements.

---

## Agent Dispatch

**Before doing the following tasks yourself, delegate to the appropriate agent.** Agents have deeper, more focused knowledge of their domain than inline reasoning provides.

| Task                                                          | Agent                       |
| ------------------------------------------------------------- | --------------------------- |
| Building a Svelte component, route, or store                  | `ui-component-builder`      |
| Writing unit tests for `@trub/calc` functions                 | `unit-test-writer`          |
| Writing or expanding E2E tests                                | `e2e-test-writer`           |
| Planning E2E test coverage for a page/feature                 | `playwright-test-planner`   |
| Generating Playwright tests from a plan                       | `playwright-test-generator` |
| Fixing broken Playwright tests                                | `playwright-test-healer`    |
| Reviewing code before committing                              | `code-reviewer`             |
| Analyzing security, data integrity, or edge cases             | `marvin`                    |
| Turning a vague task into an implementation spec              | `spec-writer`               |
| Auditing plan vs. implementation, or implementation vs. tests | `gap-analyzer`              |
| Scaffolding a tRPC procedure (v1.2+)                          | `trpc-procedure-builder`    |
| Writing Zod validation schemas                                | `validation-schema-writer`  |
| Keeping documentation accurate after changes                  | `docs-maintainer`           |
| Bug-hunting via careless user behavior in the browser         | `naive-user`                |
| Evaluating UI approachability for new homebrewers             | `new-brewer-ux`             |

### When to Delegate vs. Handle Inline

**Always delegate:**

- Any task that appears in the table above
- Any task where an agent's specialized knowledge of Trub's patterns would reduce mistakes

**Handle inline:**

- Simple, targeted edits (rename a variable, fix a typo, add a missing import)
- Reading files to understand context
- Git operations

---

## Code Standards

**Before writing or editing any code, read `CONTRIBUTING.md` in full.** It is the authoritative source for formatting, linting, TypeScript, naming, testing, and design system rules. Key non-negotiables:

- Run `pnpm lint` after every code change and fix all warnings/errors before committing
- Double quotes, semicolons, 2-space indent (Prettier)
- `const` by default, never `var`, always `===`, always braces on control flow (ESLint)
- No `any` — use proper types or `unknown`
- `strict: true` TypeScript — all params and return types must be typed

---

## Important Files

| File                                      | Purpose                                                         |
| ----------------------------------------- | --------------------------------------------------------------- |
| `trub_plan.md`                            | Living architectural plan — features, decisions, open questions |
| `CONTRIBUTING.md`                         | Code standards — naming, formatting, testing requirements       |
| `packages/types/src/units.ts`             | All unit types, canonical unit constants, `UnitPreferences`     |
| `packages/app/src/lib/constants/UNITS.ts` | Default preferences, available unit options per category        |
| `packages/app/src/components/unit_value/` | The `UnitValue` component — use for every displayed measurement |
