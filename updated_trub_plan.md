# Plan: Scaffold Trub Monorepo

## Context

Trub is a local-first homebrewing PWA (Svelte 5 + TypeScript + Vite + TanStack Router + Dexie.js). The repo currently has only planning documents — no code. This plan creates the full monorepo skeleton: root tooling, the three initial packages (`@trub/types`, `@trub/calc`, `@trub/app`), and a working dev/build/test pipeline.

**Stack decision:** `@trub/app` uses **plain Svelte 5 + Vite** with **svelte-spa-router** for client-side routing. Hash-based routing is the right fit for a local-first PWA — no server-side fallback configuration needed, and the Service Worker only needs to cache a single `index.html`. There is no SvelteKit, no adapter-static, no `+page.svelte` / `+layout.svelte` conventions. Routes are regular `.svelte` components registered in `src/router.ts`.

---

## Shape of the Change

```
trub/ (root)
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── eslint.config.js
├── .prettierrc.json
├── .gitignore
└── packages/
    ├── types/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/index.ts
    ├── calc/
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── vitest.config.ts
    │   └── src/
    │       ├── index.ts
    │       └── __tests__/calc.test.ts
    ├── app/
    │   ├── package.json
    │   ├── svelte.config.js          ← minimal preprocessor config only, no adapter
    │   ├── vite.config.ts
    │   ├── tsconfig.json
    │   ├── playwright.config.ts
    │   ├── index.html                ← Vite entry point (not src/app.html)
    │   ├── public/
    │   │   └── manifest.webmanifest
    │   ├── src/
    │   │   ├── main.ts               ← mounts App.svelte
    │   │   ├── App.svelte            ← RouterProvider root
    │   │   ├── app.css               ← global reset + design token CSS custom properties
    │   │   ├── router.ts             ← svelte-spa-router route map
    │   │   ├── routes/
    │   │   │   ├── recipes_list.svelte
    │   │   │   ├── recipe_editor.svelte
    │   │   │   └── settings.svelte
    │   │   ├── repositories/         ← placeholder directory
    │   │   ├── components/           ← placeholder directory
    │   │   └── lib/
    │   │       ├── constants/
    │   │       └── index.ts
    │   └── e2e/
    │       └── app.test.ts
    ├── sync-server/
    │   ├── package.json
    │   └── src/index.ts
    └── mcp/
        ├── package.json
        └── src/index.ts
```

---

## Implementation Steps

### 1. Root scaffolding

**`package.json`**:

```json
{
  "name": "trub-monorepo",
  "private": true,
  "scripts": {
    "build": "pnpm --filter @trub/app build",
    "dev": "pnpm --filter @trub/app dev",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "type-check": "pnpm -r type-check",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "devDependencies": {
    "@eslint/js": "^9.x",
    "eslint": "^9.x",
    "eslint-config-prettier": "^10.x",
    "eslint-plugin-svelte": "^2.x",
    "globals": "^15.x",
    "prettier": "^3.x",
    "prettier-plugin-svelte": "^3.x",
    "typescript": "^5.x",
    "typescript-eslint": "^8.x"
  },
  "engines": { "node": ">=20", "pnpm": ">=9" },
  "packageManager": "pnpm@9.15.0"
}
```

**`pnpm-workspace.yaml`**:

```yaml
packages:
  - "packages/*"
```

**`tsconfig.base.json`**:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noImplicitReturns": true
  }
}
```

**`.prettierrc.json`**:

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100,
  "endOfLine": "auto",
  "plugins": ["prettier-plugin-svelte"],
  "overrides": [{ "files": "*.svelte", "options": { "parser": "svelte" } }]
}
```

**`eslint.config.js`**:

```js
import js from "@eslint/js";
import ts from "typescript-eslint";
import svelte from "eslint-plugin-svelte";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs["flat/recommended"],
  prettier,
  ...svelte.configs["flat/prettier"],
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
      "no-undefined": "error",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["**/*.svelte"],
    languageOptions: { parserOptions: { parser: ts.parser } },
  },
  {
    ignores: ["**/dist/**", "**/build/**", "**/node_modules/**"],
  }
);
```

**`.gitignore`**:

```
node_modules/
dist/
build/
*.local
.env
.DS_Store
```

---

### 2. `packages/types`

No build step — consumers import TypeScript source directly via workspace protocol.

**`package.json`**:

```json
{
  "name": "@trub/types",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "type-check": "tsc --noEmit",
    "lint": "eslint src"
  },
  "dependencies": {
    "zod": "^3.x"
  },
  "devDependencies": {
    "typescript": "^5.x"
  }
}
```

**`tsconfig.json`**:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "noEmit": true },
  "include": ["src"]
}
```

**`src/index.ts`** — empty barrel, types added in the next task.

---

### 3. `packages/calc`

Pure functions only. No build step. Vitest runs directly on TypeScript source.

**`package.json`**:

```json
{
  "name": "@trub/calc",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit",
    "lint": "eslint src"
  },
  "dependencies": {
    "@trub/types": "workspace:*"
  },
  "devDependencies": {
    "@vitest/coverage-v8": "^3.x",
    "typescript": "^5.x",
    "vitest": "^3.x"
  }
}
```

**`tsconfig.json`**:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "noEmit": true },
  "include": ["src"]
}
```

**`vitest.config.ts`**:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: { provider: "v8", reporter: ["text", "lcov"] },
  },
});
```

**`src/index.ts`** — empty barrel.

**`src/__tests__/calc.test.ts`** — placeholder:

```ts
import { describe, it, expect } from "vitest";

describe("@trub/calc", () => {
  it("placeholder — remove when real tests are added", () => {
    expect(true).toBe(true);
  });
});
```

---

### 4. `packages/app`

Plain Svelte 5 + Vite. svelte-spa-router for client-side routing. No SvelteKit.

**`package.json`**:

```json
{
  "name": "@trub/app",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run && playwright test",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "type-check": "svelte-check --tsconfig ./tsconfig.json",
    "lint": "eslint src"
  },
  "dependencies": {
    "@trub/calc": "workspace:*",
    "@trub/types": "workspace:*",
    "dexie": "^4.x",
    "svelte-spa-router": "^5.x"
  },
  "devDependencies": {
    "@playwright/test": "^1.x",
    "@sveltejs/vite-plugin-svelte": "^5.x",
    "svelte": "^5.x",
    "svelte-check": "^4.x",
    "typescript": "^5.x",
    "vite": "^6.x",
    "vite-plugin-pwa": "^0.x",
    "vitest": "^3.x"
  }
}
```

**`svelte.config.js`** — preprocessor only, no adapter:

```js
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default {
  preprocess: vitePreprocess(),
};
```

**`vite.config.ts`**:

```ts
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false,
      workbox: { globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"] },
    }),
  ],
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL("./src/lib", import.meta.url)),
    },
  },
});
```

**`tsconfig.json`**:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "paths": { "$lib": ["./src/lib"], "$lib/*": ["./src/lib/*"] }
  },
  "include": ["src/**/*.d.ts", "src/**/*.ts", "src/**/*.svelte"]
}
```

Note: no `.svelte-kit/types/**` include and no `svelte-kit sync` required.

**`playwright.config.ts`**:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  webServer: { command: "pnpm dev", port: 5173, reuseExistingServer: true },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
  ],
});
```

**`index.html`** — Vite entry (at package root, not `src/`):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#1a1a1a" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

**`public/manifest.webmanifest`**:

```json
{
  "name": "Trub",
  "short_name": "Trub",
  "description": "Local-first homebrewing recipe designer",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a1a",
  "theme_color": "#1a1a1a",
  "icons": []
}
```

**`src/main.ts`**:

```ts
import "./app.css";
import App from "./App.svelte";
import { mount } from "svelte";

mount(App, { target: document.getElementById("app")! });
```

**`src/App.svelte`**:

```svelte
<script lang="ts">
  import Router from "svelte-spa-router";
  import { routes } from "./router";
</script>

<Router {routes} />
```

**`src/router.ts`**:

```ts
import { wrap } from "svelte-spa-router/wrap";
import RecipesList from "./routes/recipes_list.svelte";
import RecipeEditor from "./routes/recipe_editor.svelte";
import Settings from "./routes/settings.svelte";

export const routes = new Map<string, typeof RecipesList>([
  ["/recipes", RecipesList],
  ["/recipes/:id", RecipeEditor],
  ["/settings", Settings],
  ["*", RecipesList],
]);
```

Hash-based URLs: `/#/recipes`, `/#/recipes/42`, `/#/settings`. The `*` wildcard redirects unknown paths to the recipes list.

**`src/routes/recipes_list.svelte`** — stub:

```svelte
<h1>Recipes</h1>
```

**`src/routes/recipe_editor.svelte`** — stub:

```svelte
<h1>Recipe Editor</h1>
```

**`src/routes/settings.svelte`** — stub (settings uses tabs internally, not sub-routes):

```svelte
<h1>Settings</h1>
<!-- Tabs: Units | Calculations | Equipment | Water Profiles | Appearance | Data -->
```

**`src/app.css`** — global reset + design token placeholders:

> **Important:** Token values below are placeholders. Generate real values via claude.ai/design
> before building any UI components. Token names are canonical — do not rename them.

```css
:root {
  /* Color */
  --color-background: #1a1a1a;
  --color-surface: #242424;
  --color-surface-raised: #2e2e2e;
  --color-border: #3a3a3a;
  --color-text-primary: #f0f0f0;
  --color-text-secondary: #a0a0a0;
  --color-accent: #f5a623;
  --color-accent-hover: #f0b84a;
  --color-success: #4caf50;
  --color-warning: #ff9800;
  --color-error: #f44336;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;

  /* Typography */
  --font-family-base: system-ui, sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 700;
  --line-height-tight: 1.25;
  --line-height-base: 1.5;

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* Shadow */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);

  /* Animation */
  --duration-fast: 100ms;
  --duration-base: 200ms;
  --duration-slow: 300ms;
  --easing-base: ease-in-out;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: var(--font-family-base);
  background: var(--color-background);
  color: var(--color-text-primary);
  font-size: var(--font-size-md);
  line-height: var(--line-height-base);
}
```

**`src/lib/index.ts`** — empty barrel.

**`e2e/app.test.ts`** — placeholder E2E test:

```ts
import { test, expect } from "@playwright/test";

test("app loads", async ({ page }) => {
  await page.goto("/#/recipes");
  await expect(page.locator("h1")).toContainText("Recipes");
});
```

---

### 5. `packages/sync-server` and `packages/mcp` (placeholders)

**`packages/sync-server/package.json`**:

```json
{
  "name": "@trub/sync-server",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "description": "Self-hosted tRPC sync server (v1.2)",
  "dependencies": {
    "@trub/types": "workspace:*"
  }
}
```

**`packages/sync-server/src/index.ts`**:

```ts
// Placeholder — sync server implementation deferred to v1.2
export {};
```

**`packages/mcp/package.json`**:

```json
{
  "name": "@trub/mcp",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "description": "MCP server exposing recipe tools (v1.2+, requires sync)",
  "dependencies": {
    "@trub/calc": "workspace:*",
    "@trub/types": "workspace:*"
  }
}
```

**`packages/mcp/src/index.ts`**:

```ts
// Placeholder — MCP server implementation deferred to v1.2+
export {};
```

---

### 6. Installation and verification

```bash
pnpm install
pnpm type-check
pnpm --filter @trub/calc test
pnpm --filter @trub/app build
pnpm --filter @trub/app exec playwright install --with-deps chromium
pnpm --filter @trub/app test:e2e
pnpm lint
pnpm format:check
```

Expected: all checks pass, `pnpm dev` serves the app at `localhost:5173`, navigating to `/#/recipes` renders the stub heading.

---

## Verification Checklist

1. `pnpm install` — no errors
2. `pnpm type-check` — clean across all packages
3. `pnpm --filter @trub/calc test` — placeholder test passes
4. `pnpm --filter @trub/app build` — outputs to `dist/`
5. `pnpm dev` — app renders at `localhost:5173/#/recipes`
6. `pnpm --filter @trub/app test:e2e` — Playwright test passes
7. `pnpm lint` — no ESLint errors
8. `pnpm format:check` — no Prettier diff
