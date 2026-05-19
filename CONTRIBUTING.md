# Contributing Guide

Thank you for contributing to this project. This document defines the **standards, expectations, and development philosophy** that all contributors are expected to follow.

The goal of this codebase is **clarity, correctness, maintainability, and long-term viability**. We value explicitness over cleverness, composability over duplication, and honesty over abstraction theater.

Please read this carefully before contributing.

---

## Core Principles

All contributions should align with the following principles:

- **Explicit > implicit**
- **Declarative > imperative**
- **Functional patterns > OOP**, though classes are acceptable where they clearly improve clarity
- **Minimal and functional > decorative or complex**
- **Transparency and frankness > marketing language or unnecessary abstraction**
- **Local-first by default**, aligned with the principles described here:  
  https://www.inkandswitch.com/essay/local-first/#seven-ideals-for-local-first-software

When in doubt, optimize for _long‑term readability and maintainability_.

---

## Language & Tooling

- **TypeScript is required** for all application code
- Always default to the **latest stable versions** of tools and libraries
- Prefer **open standards** when available
- Minimize dependencies; do not introduce libraries without a clear, documented need
- Shared client functionality should be implemented via **reusable stores and utilities**

---

## Code Style

All code must comply with the project's Prettier + ESLint config. **Always run `pnpm lint` after writing or editing code** and fix any warnings or errors before committing.

### Prettier (`.prettierrc.json`)

- **Double quotes** — `singleQuote: false` (use `"`, not `'`)
- **Semicolons** — always required
- **2-space indentation**
- **Trailing commas** — ES5 style (objects, arrays, function params)
- **Line endings** — `endOfLine: "auto"` (CRLF on Windows, LF on Unix)

### ESLint rules (enforced)

- `prefer-const` — always use `const`; only use `let` when reassignment is needed. **Never `var`.**
- `eqeqeq` — always use `===` / `!==`, never `==` / `!=`
- `curly: "all"` — always use braces for `if`/`else`/`for`/`while` bodies, even single-line
- `no-unused-vars` — prefix unused variables with `_` to suppress (e.g., `_unused`)
- `@typescript-eslint/no-explicit-any` — avoid `any`; use proper types or `unknown`
- `no-undefined` — do not reference `undefined` directly; use optional chaining or type narrowing

If a lint rule conflicts with personal preference, **the rule wins**.

### TypeScript (`tsconfig.json`)

- `strict: true` — all strict checks enabled
- `noImplicitAny` — all parameters and return types must be typed
- `noUnusedLocals` — no unused local variables (prefix with `_` if needed)
- `noImplicitReturns` — all code paths must return a value in typed functions

---

## Naming & Project Structure

- **kebab-case is forbidden** unless there is a compelling technical reason
- Use `snake_case` for file names
- Use `SCREAMING_SNAKE_CASE` for constants
- Avoid repeated “magic numbers” and strings
  - Extract them into named constants under `lib/constants/`
  - Organize constants by domain, API, or functional category

---

## Code Quality Guidelines

- Keep code **DRY, modular, and composable**
- Prefer **parameterized, configurable utilities** over many near-duplicate functions
- Reusable utilities and components are strongly preferred
- Avoid components exceeding **~800 lines** whenever reasonably possible
- Prefer array methods and functional constructs over `for` loops
- Use **long, descriptive variable and function names**  
  (There are no awards for brevity)

---

## Testing Requirements

Testing is non-negotiable.

- **Every feature must include tests**
  - Unit and/or end-to-end tests are required
  - Playwright is the default for E2E unless a better alternative is proposed
- Run relevant tests for affected parts of the repository **before committing**
- Any regression fix **must include a regression test** that proves both the bug and the fix

A change without tests is considered incomplete.

---

## Documentation & Comments

- Keep repository documentation **accurate and current**
- Update documentation whenever changes require it
- Add **concise, high-value comments**:
  - Explain architecture, intent, and non-obvious decisions
  - Do _not_ comment obvious code or every variable

Comments should **reduce cognitive load**, not add noise.

---

## Component & UI Philosophy

- Prefer **reusable, configurable components** over multiple bespoke ones
- Favor minimal, functional designs over decorative or over-engineered solutions
- Avoid skeuomorphism, even if it becomes fashionable again

---

## Design System & Tokens

Trub's UI is built on a design system produced by **claude.ai/design**. All visual styling must go through that system.

- **Use design tokens for every visual value** — color, spacing, typography, border radius, shadow, and animation duration. Never hardcode these values.
- Token names live in CSS custom properties (e.g., `var(--color-surface)`, `var(--spacing-md)`). Use them everywhere; do not inline hex codes, pixel values, or raw font sizes.
- The app will eventually expose a user-configurable theme system that maps to these tokens. Any hardcoded value bypasses that system and is considered a bug.
- When you need a value that has no existing token, raise it — do not invent a one-off value. New tokens should be added to the design system deliberately.

---

## Utility Functions

- **Before writing a new utility function, search for an existing one.** Check `packages/app/src/lib/` and `packages/calc/src/` before implementing anything new.
- If a near-match exists but doesn't cover your case, extend it — do not create a parallel function.
- If a genuinely new utility is needed, place it in the correct package (`@trub/calc` for pure calculations, `packages/app/src/lib/` for app-level helpers) and export it for reuse.

---

## Before You Submit

Before opening a PR, ask yourself:

> “Does this make the codebase easier to understand, test, and evolve six months from now?”

If the answer is unclear or negative, reconsider the approach.

---

## Final Notes

Consistency matters more than personal preference. When contributing code, aim to **leave the codebase better than you found it**, both technically and conceptually.

If something feels ambiguous or underspecified, raise it early and discuss it openly.
