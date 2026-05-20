# Trub

A local-first homebrewing recipe designer. Design, calculate, and refine beer recipes entirely in the browser with no account, no server, and no internet connection required.

**Live demo:** [dennis-hodges.com/trub](https://www.dennis-hodges.com/trub/)

---

## What it does

Trub is a progressive web app for homebrewers who want precise control over their recipes. It handles the math — original gravity, final gravity, ABV, IBU, SRM, mash pH, water chemistry — so you can focus on the beer.

- **Recipe editor** with fermentables, hops, yeast, misc ingredients, mash schedule, fermentation schedule, water chemistry, and notes
- **Real-time calculations** for OG, FG, ABV, IBU (Tinseth/Rager/mIBU), SRM (Morey/Daniels/Mosher), and mash pH (Bru'n Water/Kaiser)
- **Water chemistry** with salt additions, mineral profiles, and sulfate-to-chloride ratio analysis
- **Equipment profiles** with batch size, boil volume, evaporation rate, and loss parameters
- **Unit preferences** — store everything in canonical units (liters, kilograms, Celsius, SG, SRM), display in whatever you prefer (gallons, pounds, Fahrenheit, Plato, EBC)
- **Per-recipe unit overrides** so a 5-gallon batch and a 20-liter batch can coexist naturally
- **Offline-first** — all data lives in IndexedDB via Dexie.js. Works without a network connection. Installable as a PWA.

---

## Architecture

Trub is a pnpm monorepo with a strict one-way dependency graph:

```
@trub/types  <--  @trub/calc  <--  @trub/app
                                       ^
                             @trub/sync-server (v1.2, placeholder)
                                       ^
                                 @trub/mcp (v1.2+, placeholder)
```

### Packages

| Package | Path | Purpose |
|---|---|---|
| `@trub/types` | `packages/types/` | Zero-dependency TypeScript interfaces, enums, and Zod schemas shared across all packages |
| `@trub/calc` | `packages/calc/` | Pure calculation engine — every function is pure (inputs in, result out, no side effects). IBU, OG, FG, ABV, SRM, mash pH, water chemistry, unit conversions |
| `@trub/app` | `packages/app/` | Svelte 5 PWA with Vite, svelte-spa-router, and Dexie.js for IndexedDB storage |
| `@trub/sync-server` | `packages/sync-server/` | tRPC sync server (v1.2, placeholder) |
| `@trub/mcp` | `packages/mcp/` | MCP server for AI-assisted recipe design (v1.2+, placeholder) |

### Key patterns

- **Repository layer** — Svelte components never call Dexie directly. All reads and writes go through `packages/app/src/repositories/`.
- **Calc boundary** — No inline brewing math in components. All calculations call `@trub/calc` functions.
- **Unit system** — Values are stored in canonical units (liters, kg, Celsius, SG, SRM). Display is handled by `UnitValue` and `UnitInput` components that read user preferences and convert on the fly. The `@trub/calc` convert module is the single source of truth for supported units and conversion logic.
- **Design system** — Monospace-forward, dark, dense, high-contrast. Every visual value uses a CSS custom property token. See `design-system.md` for the full specification.

---

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9

---

## Getting started

```bash
# Clone the repository
git clone https://github.com/fermentationist/trub.git
cd trub

# Install dependencies
pnpm install

# Start the dev server (http://localhost:5173)
pnpm dev

# Or scope it to just the app
pnpm --filter @trub/app dev
```

---

## Scripts

All scripts can be run from the monorepo root:

| Command | Description |
|---|---|
| `pnpm dev` | Start the app dev server |
| `pnpm build` | Build all packages |
| `pnpm type-check` | Type-check all packages |
| `pnpm lint` | Lint all packages |
| `pnpm format` | Format all files with Prettier |
| `pnpm test` | Run all tests (unit + E2E) |

### Package-scoped commands

```bash
# Run only @trub/calc unit tests
pnpm --filter @trub/calc test

# Run calc tests in watch mode
pnpm --filter @trub/calc test:watch

# Run a single calc test file
pnpm --filter @trub/calc exec vitest run src/__tests__/ibu.test.ts

# Run E2E tests (requires dev server running)
pnpm --filter @trub/app test:e2e

# Run a single E2E spec
pnpm --filter @trub/app exec playwright test e2e/recipe/create_recipe.spec.ts
```

---

## Testing

- **Unit tests** — Vitest, focused on `@trub/calc` pure functions. Coverage via v8.
- **E2E tests** — Playwright, running against Chromium and mobile Chrome (393x851). Tests cover all user flows: recipe CRUD, ingredient editing, settings, equipment profiles, water chemistry, and more.

```bash
# Run everything
pnpm test

# Run only unit tests
pnpm --filter @trub/calc test

# Run only E2E tests (start the dev server first)
pnpm dev &
pnpm --filter @trub/app test:e2e
```

---

## Deployment

The app automatically deploys to GitHub Pages on every push to `main` via the workflow at `.github/workflows/deploy.yml`. The production build is available at [dennis-hodges.com/trub](https://www.dennis-hodges.com/trub/).

To build locally for production:

```bash
pnpm build
# Output is in packages/app/dist/
```

---

## Project structure

```
trub/
├── packages/
│   ├── app/                    # Svelte 5 PWA
│   │   ├── e2e/                # Playwright E2E tests
│   │   ├── public/             # Static assets (icons, manifest)
│   │   └── src/
│   │       ├── components/     # Svelte components
│   │       ├── lib/            # Utilities, constants, database
│   │       ├── repositories/   # Data access layer (Dexie)
│   │       ├── routes/         # Page components
│   │       └── stores/         # Reactive state (Svelte 5 runes)
│   ├── calc/                   # Pure calculation engine
│   │   └── src/
│   │       ├── __tests__/      # Vitest unit tests
│   │       ├── constants.ts    # Physical constants
│   │       ├── convert.ts      # Unit conversion system
│   │       ├── gravity.ts      # OG, FG, ABV
│   │       ├── ibu.ts          # IBU (Tinseth, Rager, mIBU)
│   │       ├── color.ts        # SRM (Morey, Daniels, Mosher)
│   │       ├── water.ts        # Water chemistry
│   │       └── mash_ph.ts      # Mash pH estimation
│   ├── types/                  # Shared TypeScript types + Zod schemas
│   ├── sync-server/            # tRPC sync server (placeholder)
│   └── mcp/                    # MCP server (placeholder)
├── design-system.md            # Visual design specification
├── CONTRIBUTING.md             # Code standards and conventions
└── CLAUDE.md                   # AI assistant instructions
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Svelte 5 (runes mode) |
| Build tool | Vite 6 |
| Routing | svelte-spa-router (hash-based) |
| Storage | Dexie.js (IndexedDB) |
| Validation | Zod |
| PWA | vite-plugin-pwa + Workbox |
| Unit tests | Vitest |
| E2E tests | Playwright |
| Monorepo | pnpm workspaces |
| CI/CD | GitHub Actions |
| Hosting | GitHub Pages |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for code standards, naming conventions, formatting rules, and testing requirements.

---

## License

MIT
